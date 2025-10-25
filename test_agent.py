#!/usr/bin/env python3
"""
Simple socket communication test
Tests send_sock and rec_sock functions
"""
import socket
import struct
import json

def send_sock(sock, data: bytes):
    """Send length-prefixed message"""
    sock.sendall(struct.pack(">I", len(data)))
    sock.sendall(data)

def rec_sock(sock) -> bytes:
    """Receive length-prefixed message"""
    raw_len = sock.recv(4)
    if not raw_len or len(raw_len) < 4:
        raise RuntimeError("Failed to receive length header")
    
    msg_len = struct.unpack(">I", raw_len)[0]
    
    chunks = []
    bytes_received = 0
    while bytes_received < msg_len:
        chunk = sock.recv(min(msg_len - bytes_received, 4096))
        if not chunk:
            raise RuntimeError("Socket connection broken")
        chunks.append(chunk)
        bytes_received += len(chunk)
    
    return b''.join(chunks)

def test_vsock():
    """Test vsock communication with agent running in VM"""
    print("=" * 60)
    print("VSOCK Socket Test")
    print("=" * 60)
    print("\nPrerequisites:")
    print("1. Firecracker VM must be running")
    print("2. Agent must be running inside VM on port 8000")
    print("=" * 60)
    
    VSOCK_CID = 3
    VSOCK_PORT = 8000
    
    try:
        # Connect to agent
        print(f"\n[Test] Connecting to vsock CID={VSOCK_CID}, Port={VSOCK_PORT}...")
        sock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
        sock.connect((VSOCK_CID, VSOCK_PORT))
        print("[Test] ✓ Connected")
        
        # Handshake
        print(f"\n[Test] Sending handshake...")
        sock.sendall(b"CONNECT 8000\n")
        ack = sock.recv(64).decode('ascii').strip()
        print(f"[Test] ✓ Received: {ack}")
        assert ack == "OK", f"Expected 'OK', got '{ack}'"
        
        # Test job 1: Hello World
        print("\n" + "-" * 60)
        print("Test 1: Hello World")
        print("-" * 60)
        
        job1 = {
            "code": '#include <stdio.h>\nint main() { printf("Hello, World!\\n"); return 0; }',
            "lang": "c",
            "compiler": "gcc",
            "opts": "-O2"
        }
        
        print("[Test] Sending job...")
        job_bytes = json.dumps(job1).encode('utf-8')
        send_sock(sock, job_bytes)
        
        print("[Test] Waiting for result...")
        result_bytes = rec_sock(sock)
        result = json.loads(result_bytes.decode('utf-8'))
        
        print(f"[Test] Success: {result.get('success')}")
        print(f"[Test] Exit Code: {result.get('exit_code')}")
        print(f"[Test] Output: {result.get('output', '').strip()}")
        
        assert result['success'] == True
        assert result['exit_code'] == 0
        print("[Test] ✓ Test 1 PASSED")
        
        # Test job 2: Compilation Error
        print("\n" + "-" * 60)
        print("Test 2: Compilation Error")
        print("-" * 60)
        
        job2 = {
            "code": '#include <stdio.h>\nint main() { undefined_function(); return 0; }',
            "lang": "c",
            "compiler": "gcc",
            "opts": "-O2"
        }
        
        print("[Test] Sending job...")
        job_bytes = json.dumps(job2).encode('utf-8')
        send_sock(sock, job_bytes)
        
        print("[Test] Waiting for result...")
        result_bytes = rec_sock(sock)
        result = json.loads(result_bytes.decode('utf-8'))
        
        print(f"[Test] Success: {result.get('success')}")
        print(f"[Test] Error: {result.get('error')}")
        
        assert result['success'] == False
        assert result['error'] == "compilation failed"
        print("[Test] ✓ Test 2 PASSED")
        
        # Test job 3: With Performance Metrics
        print("\n" + "-" * 60)
        print("Test 3: Performance Metrics")
        print("-" * 60)
        
        job3 = {
            "code": '''#include <stdio.h>
int main() {
    int sum = 0;
    for (int i = 0; i < 1000000; i++) {
        sum += i;
    }
    printf("Sum: %d\\n", sum);
    return 0;
}''',
            "lang": "cpp",
            "compiler": "g++",
            "opts": "-O2 -Wall"
        }
        
        print("[Test] Sending job...")
        job_bytes = json.dumps(job3).encode('utf-8')
        send_sock(sock, job_bytes)
        
        print("[Test] Waiting for result...")
        result_bytes = rec_sock(sock)
        result = json.loads(result_bytes.decode('utf-8'))
        
        print(f"[Test] Success: {result.get('success')}")
        print(f"[Test] Exit Code: {result.get('exit_code')}")
        print(f"[Test] Has perf data: {result.get('perf') is not None}")
        print(f"[Test] Has time data: {result.get('time') is not None}")
        
        if result.get('perf'):
            print(f"[Test] Perf keys: {list(result['perf'].keys())}")
        
        assert result['success'] == True
        print("[Test] ✓ Test 3 PASSED")
        
        # Close connection
        sock.close()
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    import sys
    
    print("\nSimple Socket Communication Test")
    print("Make sure:")
    print("  1. Firecracker VM is running with guest_cid=3")
    print("  2. Agent is running inside the VM")
    print()
    input("Press Enter when ready...")
    
    sys.exit(test_vsock())
