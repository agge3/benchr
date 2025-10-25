#!/usr/bin/env python3
import socket
import struct
import json
import subprocess
import tempfile
import os
import shutil

# Constants
VSOCK_CID = socket.VMADDR_CID_ANY
VSOCK_PORT = 8000  # Should match JobManager
EXECUTE_SCRIPT = "/opt/execute.sh"

# env.py is packaged into the fs, so env.XXX for shared from host constants

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

def execute_job(job_data: dict) -> dict:
    """Execute the job using execute.sh script"""
    code = job_data.get('code', '')
    lang = job_data.get('lang', 'cpp')
    compiler = job_data.get('compiler', 'g++')
    opts = job_data.get('opts', '-O2 -Wall')
    
    print(f"[Agent] Executing job, language: {lang}, compiler: {compiler}, opts: {opts}")
    
    # Create temporary directory for execution
    tmpdir = tempfile.mkdtemp()
    
    try:
        # Write source code to file
        ext_map = {
            'c': '.c',
            'cpp': '.cpp',
            'py': '.py',
            'python': '.py'
        }
        ext = ext_map.get(lang, '.cpp')
        src_file = os.path.join(tmpdir, f"source{ext}")
        
        with open(src_file, 'w') as f:
            f.write(code)
        
        result_json_path = os.path.join(tmpdir, "result.json")
        
        # Execute the bash script
        cmd = [
            EXECUTE_SCRIPT,
            tmpdir,         # DIR
            src_file,       # SRC
            lang,           # LANG
            compiler,       # COMPILER
            opts            # OPTS
        ]
        
        print(f"[Agent] Running: {' '.join(cmd)}")
        
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30  # 30 second timeout
        )
        
        # Read the result.json that execute.sh created
        if os.path.exists(result_json_path):
            with open(result_json_path, 'r') as f:
                result = json.load(f)
            print(f"[Agent] Execution complete, success: {result.get('success', False)}")
        else:
            result = {
                'success': False,
                'error': 'No result file generated',
                'stdout': proc.stdout,
                'stderr': proc.stderr,
                'exit_code': proc.returncode
            }
            print(f"[Agent] Execution failed: no result file")
        
    except subprocess.TimeoutExpired:
        result = {
            'success': False,
            'error': 'Execution timeout (30s)'
        }
        print(f"[Agent] Execution timeout")
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print(f"[Agent] Execution error: {e}")
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(tmpdir)
        except:
            pass
    
    return result

def main():
    """Main agent loop - listen on vsock and process jobs"""
    print(f"[Agent] Starting on vsock port {VSOCK_PORT}")

    # Create vsock socket
    sock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)

    # Read VM configuration from packaged JSON
    config_path = "config.json"
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        cid = config.get("vsock", {}).get("cid", socket.VMADDR_CID_ANY)
        port = config.get("vsock", {}).get("port", VSOCK_PORT)
        print(f"[Agent] Loaded config: CID={cid}, PORT={port}")
    except FileNotFoundError:
        print(f"[Agent] Config file not found, using defaults")
        cid = socket.VMADDR_CID_ANY
        port = VSOCK_PORT
    except Exception as e:
        print(f"[Agent] Error reading config: {e}, using defaults")
        cid = socket.VMADDR_CID_ANY
        port = VSOCK_PORT

    print(f"[Agent] Listening on {cid}:{port}")
    sock.bind((cid, port))
    sock.listen(1)
    
    while True:
        try:
            print("[Agent] Waiting for connection...")
            conn, addr = sock.accept()
            print(f"[Agent] Connected: {addr}")
            
            # Handle handshake
            handshake = conn.recv(64).decode('ascii').strip()
            print(f"[Agent] Received handshake: {handshake}")
            
            if handshake.startswith("CONNECT"):
                conn.sendall(b"OK\n")
                print("[Agent] Handshake complete")
            else:
                conn.sendall(b"ERROR\n")
                conn.close()
                continue
            
            # Process jobs on this connection
            while True:
                try:
                    # Receive job data: {code, lang, compiler, opts}
                    job_bytes = rec_sock(conn)
                    job_data = json.loads(job_bytes.decode('utf-8'))
                    
                    print(f"[Agent] Received job")
                    
                    # Execute job - this runs execute.sh and gets result.json
                    result = execute_job(job_data)
                    
                    # Send result back (result is already the parsed JSON from result.json)
                    result_bytes = json.dumps(result).encode('utf-8')
                    send_sock(conn, result_bytes)
                    
                    print(f"[Agent] Sent result")
                    
                except Exception as e:
                    print(f"[Agent] Error processing job: {e}")
                    error_result = {
                        'success': False,
                        'error': str(e)
                    }
                    try:
                        send_sock(conn, json.dumps(error_result).encode('utf-8'))
                    except:
                        break
                    
        except KeyboardInterrupt:
            print("\n[Agent] Shutting down...")
            break
        except Exception as e:
            print(f"[Agent] Connection error: {e}")
            continue
        finally:
            try:
                conn.close()
            except:
                pass
    
    sock.close()

if __name__ == "__main__":
    main()
