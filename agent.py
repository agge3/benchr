#!/usr/bin/env python3
import socket
import struct
import json
import subprocess
import tempfile
import os
import shutil
import env
from util import Container, FirecrackerCfg, send_sock, rec_sock, run_cmd, \
ISerializer, JsonSerializer

EXECUTE_SCRIPT = "/mnt/deploy/execute.sh"
CFG = "vm_config.json"
# XXX change to scale
VSOCK_PORT = 5000
SER = JsonSerializer()

def execute_job(job_data: dict) -> dict:
    """Execute the job using execute.sh script"""
    code = job_data.get('code', '')
    lang = job_data.get('lang', 'cpp')
    compiler = job_data.get('compiler', 'g++')
    opts = job_data.get('opts', '-O2 -Wall')
    
    print(f"[Agent] Executing job, language: {lang}, compiler: {compiler}, opts: {opts}")
    
    tmpdir = tempfile.mkdtemp()
    
    try:
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
        
        cmd = [
            EXECUTE_SCRIPT,
            tmpdir,
            src_file,
            lang,
            compiler,
            opts
        ]
        
        print(f"[Agent] Running: {' '.join(cmd)}")
        
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
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
        try:
            shutil.rmtree(tmpdir)
        except:
            pass
    
    return result

def main():
    """Main agent loop - listen on vsock and process jobs"""
    # Read VM configuration
    try:
        with open(CFG, 'r') as f:
            config = json.load(f)
        cid = config.get("vsock", {}).get("cid", socket.VMADDR_CID_ANY)
        port = config.get("vsock", {}).get("port", VSOCK_PORT)
        print(f"[Agent] Loaded config: CID={cid}, PORT={port}")
    except Exception as e:
        print(f"[Agent] Error reading config: {e}, using defaults")
        cid = socket.VMADDR_CID_ANY
        port = VSOCK_PORT

    print(f"[Agent] Starting on vsock port {port}")
    
    # Create vsock socket
    sock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
    #sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((cid, port))
    sock.listen(1)
    
    print(f"[Agent] Listening on {cid}:{port}")
    
    while True:
        conn = None
        try:
            print("[Agent] Waiting for connection...")
            conn, addr = sock.accept()
            print(f"[Agent] Connected: {addr}")
            print("[Agent] Ready to receive jobs (Firecracker handled handshake)")
            
            # Process jobs on this connection
            # NO handshake needed - Firecracker already sent OK to host
            while True:
                try:
                    # Receive job data: {code, lang, compiler, opts}
                    job_bytes = rec_sock(conn)
                    job_data = SER.deserialize(job_bytes)                    
                    print(f"[Agent] Received job")
                    
                    # Execute job
                    result = execute_job(job_data)
                    
                    # Send result back
                    result_bytes = SER.serialize(result)
                    send_sock(conn, result_bytes)
                    
                    print(f"[Agent] Sent result")
                    
                except Exception as e:
                    print(f"[Agent] Error processing job: {e}")
                    error_result = {
                        'success': False,
                        'error': str(e)
                    }
                    try:
                        send_sock(conn, SER.serialize(error_result))
                    except:
                        break
                    
        except KeyboardInterrupt:
            print("\n[Agent] Shutting down...")
            break
        except Exception as e:
            print(f"[Agent] Connection error: {e}")
            import traceback
            traceback.print_exc()
            continue
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    sock.close()

if __name__ == "__main__":
    main()
