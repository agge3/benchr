from dataclasses import dataclass
import os
import time
import struct
#from dotenv import load_dotenv
import shutil
from typing import Optional
import subprocess
import socket
from abc import ABC, abstractmethod
import json

@dataclass
class Job:
    job_id: str
    code: str
    lang: str
    compiler: str
    
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
    """Send length-prefixed message"""
    sock.sendall(struct.pack(">I", len(data)))
    sock.sendall(data)

# PRE: socket connection is valid
# POST: need to deserialize
def rec_sock(sock) -> bytes:
    """Receive length-prefixed message"""
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

class ISerializer(ABC):
    @abstractmethod
    def serialize(self, data: dict) -> bytes:
        pass
    @abstractmethod
    def deserializer(self, data: bytes) -> dict:
        pass
class JsonSerializer(ISerializer):
    def serialize(self, data):
        return json.dumps(data).encode('utf-8')
    def deserialize(self, data):
        return json.loads(data)
