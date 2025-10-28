from dataclasses import dataclass
import os
import time
import struct
#from dotenv import load_dotenv
import shutil
from typing import Optional
import subprocess
import socket
from IQueue import IQueue, GlobalQueue, RedisQueue
from util import Container, FirecrackerCfg, send_sock, rec_sock, run_cmd, \
ISerializer, JsonSerializer
from job_cache import JobCache
import env
from models import db
import datetime

#load_dotenv()

DEBUG = True

class JobManager:
    def __init__(self, ser: Optional = None):
        self._running = False
        self._ser = ser or JsonSerializer()
        self._fc = FirecrackerCfg()
        self._ctr = None
        self._c = JobCache()
        self._c.connect() # NEED TO CONNECT TOO   # NEED TO CONNECT TOO   # NEED TO CONNECT TOO   # NEED TO CONNECT TOO
        self._q = RedisQueue(
                name="benchr",
                redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0")
                )
    
    def _execute(self, data: dict) -> dict:   # where data is job data in json
        """Execute a job on the container"""
        if not self._ctr or not self._ctr.ready:
            raise RuntimeError("Container not ready")
        
        # Serialize job data
        if DEBUG:
            print(f"data: {data}")
        bytez = self._ser.serialize(data)
        
        # Send to agent via vsock
        send_sock(self._ctr.sock, bytez)
        
        # Block until result received
        res_bytes = rec_sock(self._ctr.sock)
        res = self._ser.deserialize(res_bytes)
        if DEBUG:
            print(f"res: {res}")
        
        return res
    
    def _start_ctr(self, ctr: Container):  # throws
        """Start Firecracker VM and establish vsock connection"""
        #cmd = f"{self._fc.bin} --config-file {ctr.cfg}"
        cmd = f"{self._fc.bin}"
        
        # Start firecracker in background
        proc = subprocess.Popen(
            cmd.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait a moment for VM to boot
        time.sleep(5)
        
        # Check if process is still running
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            raise RuntimeError(f"Firecracker failed to start: {stderr.decode()}")

        if DEBUG:
            print(f"ctr vsock: {ctr.vsock}")
            print(f"ctr cid: {ctr.cid}")
            print(f"ctr port: {ctr.port}")
        
        # Connect to vsock
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        max_retries = 10
        retry_delay = 0.5
        
        for attempt in range(max_retries):
            try:
                sock.connect(ctr.vsock)
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
        # xxx make sure config paths are correct!
        cfg = "config.json"
        vm_cfg = "vm_config.json"
        vsock = "fc.vsock"
        port = env.PORT_START
        
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
            if self._q.hasFront():
                try:
                    # Pop blocks until job available
                    # xxx NEEDS to block with this design
                    job_id = self._q.pend()
                    print(f"Received job: {job_id}")
                    
                    data = self._c.get(job_id)

                    # Execute job
                    result = self._execute(data)
                    #print(f"Job {job.job_id} completed: {result}")

                    self._c.update(job_id, result)
                    self._q.pop()
                    
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
        self._c.disconnect()
        print("JobManager stopped")


if __name__ == "__main__":
    jm = JobManager()
    try:
        jm.start()
        jm.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
        if not database.is_closed():
            database.close()
        jm.stop()
