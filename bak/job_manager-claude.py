from dataclasses import dataclass
import os
import time
import struct
import json
from dotenv import load_dotenv
from global_queue import GlobalQueue
from typing import Optional
import subprocess
import socket

load_dotenv()

@dataclass
class Job:
    job_id: str
    code: str
    lang: str
    compiler: str
    opts: str = "-O2 -Wall"
    
@dataclass 
class Container:
    cid: int
    cfg: str
    vm_cfg: str
    vsock: str
    port: int
    sock: Optional[socket.socket] = None
    ready: bool = False

@dataclass
class FirecrackerCfg:
    path: str = "firecracker"
    
    @property
    def bin(self):
        return f"{self.path}/firecracker"

# PRE: socket connection is valid, data is serialized
def send_sock(sock, data: bytes):
    sock.sendall(struct.pack(">I", len(data)))
    sock.sendall(data)

# PRE: socket connection is valid
# POST: returns deserialized bytes
def rec_sock(sock) -> bytes:
    # Read 4-byte length header
    raw_len = sock.recv(4)
    if not raw_len or len(raw_len) < 4:
        raise RuntimeError("Failed to receive length header")
    
    msg_len = struct.unpack(">I", raw_len)[0]
    
    # Read the actual message
    chunks = []
    bytes_received = 0
    while bytes_received < msg_len:
        chunk = sock.recv(min(msg_len - bytes_received, 4096))
        if not chunk:
            raise RuntimeError("Socket connection broken")
        chunks.append(chunk)
        bytes_received += len(chunk)
    
    return b''.join(chunks)

def run_cmd(cmd):
    try:
        p = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        return p.stdout
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {cmd}")
        print(f"Error: {e.stderr}")
        raise

class JobManager:
    def __init__(self, q: Optional[GlobalQueue] = None):
        self._running = False
        self._q = q or GlobalQueue()
        self._fc = FirecrackerCfg()
        self._ctr = None
    
    def _execute(self, job: Job) -> dict:
        """Execute a job on the container"""
        if not self._ctr or not self._ctr.ready:
            raise RuntimeError("Container not ready")
        
        # Serialize job data - code, lang, compiler, opts (no job_id sent to agent)
        job_data = {
            'code': job.code,
            'lang': job.lang,
            'compiler': job.compiler,
            'opts': job.opts
        }
        job_bytes = json.dumps(job_data).encode('utf-8')
        
        # Send to agent via vsock
        send_sock(self._ctr.sock, job_bytes)
        
        # Block until result received
        result_bytes = rec_sock(self._ctr.sock)
        result = json.loads(result_bytes.decode('utf-8'))
        
        # Add job_id to result
        result['job_id'] = job.job_id
        
        return result
    
    def _start_ctr(self, ctr: Container):  # throws
        """Start Firecracker VM and establish vsock connection"""
        cmd = f"{self._fc.bin} --api-sock {ctr.vsock} --config-file {ctr.cfg}"
        
        # Start firecracker in background
        proc = subprocess.Popen(
            cmd.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait a moment for VM to boot
        time.sleep(2)
        
        # Check if process is still running
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            raise RuntimeError(f"Firecracker failed to start: {stderr.decode()}")
        
        # Connect to vsock
        sock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
        max_retries = 10
        retry_delay = 0.5
        
        for attempt in range(max_retries):
            try:
                sock.connect((ctr.cid, ctr.port))
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Socket connection failed on vsock after {max_retries} attempts: {e}")
                time.sleep(retry_delay)
        
        # Send handshake
        sock.sendall(f"CONNECT {ctr.port}\n".encode('ascii'))
        
        # Wait for acknowledgement
        ack = sock.recv(64).decode('ascii').strip()
        if not ack.startswith("OK"):
            sock.close()
            raise RuntimeError(f"Socket acknowledgement failed: got '{ack}'")
        
        ctr.sock = sock
        ctr.ready = True
        print(f"Container {ctr.cid} started and ready")
    
    def _save_result(self, result: dict):
        """Save result to database/file"""
        job_id = result.get('job_id')
        if not job_id:
            print("Warning: No job_id in result, cannot save")
            return
        
        # Save to results directory
        results_dir = os.getenv("RESULTS_DIR", "results")
        os.makedirs(results_dir, exist_ok=True)
        
        result_file = os.path.join(results_dir, f"{job_id}.json")
        
        with open(result_file, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"Result saved: {result_file}")
    
    def start(self):
        """Initialize the VM and prepare for job execution"""
        cid = int(os.getenv("VSOCK_CID", "3"))
        cfg = os.getenv("VM_CONFIG", "vm/config.json")
        vm_cfg = os.getenv("VM_VM_CONFIG", "vm/vm_config.json")
        vsock = os.getenv("VSOCK_PATH", "/tmp/vm.vsock")
        port = int(os.getenv("VSOCK_PORT", "8000"))
        
        self._ctr = Container(cid=cid, cfg=cfg, vm_cfg=vm_cfg, vsock=vsock, port=port)
        
        try:
            self._start_ctr(self._ctr)
            self._running = True
            print("JobManager started successfully")
        except Exception as e:
            print(f"Failed to start container: {e}")
            raise
    
    def run(self):
        """Main event loop - pop jobs from queue and execute"""
        print("JobManager running, waiting for jobs...")
        
        while self._running:
            try:
                # Pop blocks until job available
                job_data = self._q.pop()
                print(f"Received job: {job_data.get('job_id')}")
                
                # Convert to Job object
                job = Job(
                    job_id=job_data.get('job_id'),
                    code=job_data.get('code'),
                    lang=job_data.get('lang', 'cpp'),
                    compiler=job_data.get('compiler', 'g++'),
                    opts=job_data.get('opts', '-O2 -Wall')
                )
                
                # Execute job
                result = self._execute(job)
                print(f"Job {job.job_id} completed: {result.get('success', False)}")
                
                # Save result to database/file
                self._save_result(result)
                
                # TODO: Signal Flask to update frontend via Redis/callback
                
            except Exception as e:
                print(f"Error processing job: {e}")
                import traceback
                traceback.print_exc()
                # Continue running even if one job fails
    
    def stop(self):
        """Gracefully shutdown the job manager"""
        self._running = False
        if self._ctr and self._ctr.sock:
            self._ctr.sock.close()
        print("JobManager stopped")


if __name__ == "__main__":
    jm = JobManager()
    try:
        jm.start()
        jm.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
        jm.stop()
