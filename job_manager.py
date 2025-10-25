"""
xxx SENT TO CLAUDE TO PRODUCE SCAFFOLDING:
from dataclasses import dataclass
import os
import time
import struct
import serializer
from dotenv import load_dotenv
import shutil
from rate_limiter import GlobalQueue
from types import Optional
import subprocess
import socket

@dataclass
class Job:

@dataclass 
class Container:
    cid: int
    cfg: str
    vm_cfg: str
    vsock: str
    port: int
    ready: bool = False

@dataclass
class FirecrackerCfg:
    path: "firecracker"
    bin: f"{path}/firecracker"

@dataclass
class VmCfg:
    pass

# PRE: socket connection is valid, data is serialized
def send_sock(sock, bytes):
    sock.sendall(struct.pack(">I", len(bytes)))
    sock.sendall(bytes)

# PRE: socket connection is valid
# POST: need to deserialize
def rec_sock(sock) -> bytes:
    pass


def run_cmd(cmd):
    p = subprocess.run(cmd)

    # error check on exceptions and print error

class JobManager:
    def __init__(q: Optional[IQueue] = None, ser: Optional[ISerializer] = None):
        self._running = False
        self._q = q or GlobalQueue
        self._ser = ser or JsonSerializer
        self._fc = FirecrackerCfg()

    def _execute(self):
        pass

    def _start_ctr(self, ctr):  # throws
        cmd = (
            f"self._fc.bin --api-socket {ctr.vsock} --config-file {ctr.cfg}"
        )
        run_cmd(cmd)
        sock = socket.socket(socket.AF_VSOCK, socket.SOCKET_STREAM)
        try:
            sock.connect(ctr.vsock)
        except Exception as e:
            raise RuntimeError(f"socket connection failed on vsock: {e}")

        sock.sendall("CONNECT {ctr.port}\n".encode('ascii'))
        ack = sock.recv(64).decode('ascii').strip()
        if not ack.startswith("OK"):
            sock.close()
            raise RuntimeError(f"socket acknowledgement failed on vsock: {e}")
                               
        ctr.ready = True
        self._running = True

    def start(self):
        # start the firecracker vm, send the first response over the socket and
        # confirm live
        # start vsock connection
        cid = 3
        cfg = vm/config.json
        vm_cfg = vm/vm_config.json
        vsock = vm.vsock
        port = env.PORT_START

        ctr = Container(cid=3, cfg=cfg, vm_cfg=vm_cfg, vsock=vsock, port=port)
        _start_ctr(ctr)     

        self._running = True
    def run():
        # run on infinite loop and wait for queue
        while (self._running): 
            if self._q.poll():
                # wait for job
                data = q.pop()
                s = self._ser.serialize(data)
                send_sock(s)
                # block until receive
                s = rec_sock(s)

                # update db, and signal flask to update frontend
"""

from dataclasses import dataclass
import os
import time
import struct
import serializer
from dotenv import load_dotenv
import shutil
from rate_limiter import GlobalQueue
from typing import Optional
import subprocess
import socket

load_dotenv()

@dataclass
class Job:
    job_id: str
    code: str
    language: str
    
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

@dataclass
class VmCfg:
    pass

# PRE: socket connection is valid, data is serialized
def send_sock(sock, data: bytes):
    sock.sendall(struct.pack(">I", len(data)))
    sock.sendall(data)

# PRE: socket connection is valid
# POST: need to deserialize
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
    def __init__(self, q: Optional = None, ser: Optional = None):
        self._running = False
        self._q = q or GlobalQueue
        self._ser = ser or serializer.JsonSerializer()
        self._fc = FirecrackerCfg()
        self._ctr = None
    
    def _execute(self, job: Job):
        """Execute a job on the container"""
        if not self._ctr or not self._ctr.ready:
            raise RuntimeError("Container not ready")
        
        # Serialize job data
        job_data = self._ser.serialize({
            'job_id': job.job_id,
            'code': job.code,
            'language': job.language
        })
        
        # Send to agent via vsock
        send_sock(self._ctr.sock, job_data)
        
        # Block until result received
        result_bytes = rec_sock(self._ctr.sock)
        result = self._ser.deserialize(result_bytes)
        
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
    
    def start(self):
        """Initialize the VM and prepare for job execution"""
        cid = 3
        cfg = "vm/config.json"
        vm_cfg = "vm/vm_config.json"
        vsock = "/tmp/vm.vsock"
        port = int(os.getenv("PORT_START", "8000"))
        
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
            # Poll queue (non-blocking check)
            if self._q.poll():
                try:
                    # Pop blocks until job available
                    job_data = self._q.pop()
                    print(f"Received job: {job_data}")
                    
                    # Convert to Job object
                    job = Job(
                        job_id=job_data.get('job_id'),
                        code=job_data.get('code'),
                        language=job_data.get('language', 'cpp')
                    )
                    
                    # Execute job
                    result = self._execute(job)
                    print(f"Job {job.job_id} completed: {result}")
                    
                    # TODO: Update Redis/DB with result
                    # TODO: Signal Flask to update frontend
                    # For now, just print
                    
                except Exception as e:
                    print(f"Error processing job: {e}")
                    # Continue running even if one job fails
            else:
                # No jobs available, sleep briefly
                time.sleep(0.1)
    
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
