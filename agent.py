# vm_agent.py - runs INSIDE the Firecracker VM
# Executes once per job, collects metrics, sends results, exits

import socket
import struct
import json
import subprocess
import time
import tempfile
import os
import re
import sys
import shutil

VSOCK_HOST_CID = 2  # Host is always CID 2
VSOCK_PORT = 8000   # Port to connect to host

def send_sock(sock, data: bytes):
    """Send data with 4-byte length header"""
    sock.sendall(struct.pack(">I", len(data)))
    sock.sendall(data)

def rec_sock(sock) -> bytes:
    """Receive data with 4-byte length header"""
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

def parse_perf_output(output: str) -> dict:
    """Parse perf stat output and extract metrics"""
    metrics = {
        'cpu_cycles': None,
        'instructions': None,
        'cache_references': None,
        'cache_misses': None,
        'branch_misses': None
    }
    
    lines = output.split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        # Format: "     123,456      cycles" or "123456 cycles"
        parts = re.split(r'\s+', line)
        if len(parts) < 2:
            continue
        
        # Remove commas and try to parse as int
        value_str = parts[0].replace(',', '').replace('.', '')
        try:
            value = int(value_str)
        except ValueError:
            continue
        
        # Match metric names
        line_lower = line.lower()
        if 'cpu-cycles' in line_lower or (('cycles' in line_lower) and ('cache' not in line_lower)):
            metrics['cpu_cycles'] = value
        elif 'instructions' in line_lower:
            metrics['instructions'] = value
        elif 'cache-references' in line_lower:
            metrics['cache_references'] = value
        elif 'cache-misses' in line_lower:
            metrics['cache_misses'] = value
        elif 'branch-misses' in line_lower:
            metrics['branch_misses'] = value
    
    return metrics

def parse_vmstat_output(output: str) -> dict:
    """Parse vmstat output (last line contains data)"""
    lines = [l.strip() for l in output.split('\n') if l.strip()]
    if len(lines) < 3:  # Need header + separator + data
        return {
            'procs_running': None,
            'procs_blocked': None,
            'memory_free_kb': None,
            'memory_used_kb': None,
            'swap_used_kb': None,
            'io_blocks_in': None,
            'io_blocks_out': None,
            'cpu_user_percent': None,
            'cpu_system_percent': None,
            'cpu_idle_percent': None
        }
    
    # Last line has the actual data
    data_line = lines[-1]
    values = re.split(r'\s+', data_line)
    
    # vmstat columns: r b swpd free buff cache si so bi bo in cs us sy id wa st
    if len(values) < 15:
        return {
            'procs_running': None,
            'procs_blocked': None,
            'memory_free_kb': None,
            'memory_used_kb': None,
            'swap_used_kb': None,
            'io_blocks_in': None,
            'io_blocks_out': None,
            'cpu_user_percent': None,
            'cpu_system_percent': None,
            'cpu_idle_percent': None
        }
    
    try:
        return {
            'procs_running': int(values[0]),
            'procs_blocked': int(values[1]),
            'swap_used_kb': int(values[2]),
            'memory_free_kb': int(values[3]),
            'memory_used_kb': int(values[4]) + int(values[5]),  # buff + cache
            'io_blocks_in': int(values[8]),
            'io_blocks_out': int(values[9]),
            'cpu_user_percent': float(values[12]),
            'cpu_system_percent': float(values[13]),
            'cpu_idle_percent': float(values[14])
        }
    except (ValueError, IndexError) as e:
        print(f"Error parsing vmstat: {e}")
        return {
            'procs_running': None,
            'procs_blocked': None,
            'memory_free_kb': None,
            'memory_used_kb': None,
            'swap_used_kb': None,
            'io_blocks_in': None,
            'io_blocks_out': None,
            'cpu_user_percent': None,
            'cpu_system_percent': None,
            'cpu_idle_percent': None
        }

def parse_iostat_output(output: str) -> list:
    """
    Parse iostat -x output for extended device statistics
    
    iostat -x output format:
    Device  r/s  w/s  rkB/s  wkB/s  rrqm/s  wrqm/s  %rrqm  %wrqm  r_await  w_await  aqu-sz  rareq-sz  wareq-sz  svctm  %util
    """
    devices = []
    lines = [l.strip() for l in output.split('\n') if l.strip()]
    
    in_device_section = False
    for line in lines:
        # Look for header line starting with "Device"
        if line.startswith('Device'):
            in_device_section = True
            continue
        
        if not in_device_section or not line:
            continue
        
        # Skip if we hit a blank line or new section
        if not line or line.startswith('avg-cpu'):
            in_device_section = False
            continue
        
        parts = re.split(r'\s+', line)
        
        # Extended iostat has ~15 columns
        if len(parts) < 14:
            continue
        
        try:
            # Column indices for iostat -x:
            # 0: Device name
            # 1: r/s
            # 2: w/s  
            # 3: rkB/s
            # 4: wkB/s
            # 5: rrqm/s
            # 6: wrqm/s
            # 7: %rrqm
            # 8: %wrqm
            # 9: r_await
            # 10: w_await
            # 11: aqu-sz
            # 12: rareq-sz
            # 13: wareq-sz
            # 14: svctm (may not exist in newer versions)
            # 15: %util
            
            read_kb_per_sec = float(parts[3])
            write_kb_per_sec = float(parts[4])
            
            # Get await (average wait time in ms)
            r_await = float(parts[9]) if len(parts) > 9 else 0.0
            w_await = float(parts[10]) if len(parts) > 10 else 0.0
            await_ms = (r_await + w_await) / 2.0 if (r_await or w_await) else 0.0
            
            # Get %util (last column, usually position 14 or 15)
            cpu_util = float(parts[-1])  # %util is always last column
            cpu_idle = 100.0 - cpu_util
            
            devices.append({
                'device': parts[0],
                'total_reads': read_kb_per_sec * 2,  # Approximate: rate * sample time
                'total_writes': write_kb_per_sec * 2,
                'read_kb_per_sec': read_kb_per_sec,
                'write_kb_per_sec': write_kb_per_sec,
                'cpu_util': cpu_util,
                'cpu_idle': cpu_idle,
                'await_ms': await_ms
            })
        except (ValueError, IndexError) as e:
            print(f"Error parsing iostat line '{line}': {e}")
            continue
    
    return devices

def execute_python(code: str, temp_dir: str) -> dict:
    """Execute Python code with performance monitoring"""
    script_path = os.path.join(temp_dir, 'script.py')
    
    with open(script_path, 'w') as f:
        f.write(code)
    
    # Command with perf stat
    perf_cmd = [
        'perf', 'stat',
        '-e', 'cycles,instructions,cache-references,cache-misses,branch-misses',
        'python3', script_path
    ]
    
    return run_with_monitoring(perf_cmd)

def execute_cpp(code: str, temp_dir: str) -> dict:
    """Compile and execute C++ code with performance monitoring"""
    source_path = os.path.join(temp_dir, 'program.cpp')
    binary_path = os.path.join(temp_dir, 'program')
    
    with open(source_path, 'w') as f:
        f.write(code)
    
    # Compile first
    compile_cmd = ['g++', '-O2', '-o', binary_path, source_path]
    
    try:
        compile_result = subprocess.run(
            compile_cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if compile_result.returncode != 0:
            return {
                'success': False,
                'output': '',
                'error': 'Compilation failed',
                'compile_error': compile_result.stderr,
                'execution_time_ms': 0,
                'perf_metrics': None,
                'vmstat_metrics': None,
                'iostat_metrics': None
            }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'output': '',
            'error': 'Compilation timeout',
            'execution_time_ms': 30000,
            'perf_metrics': None,
            'vmstat_metrics': None,
            'iostat_metrics': None
        }
    
    # Execute with perf stat
    perf_cmd = [
        'perf', 'stat',
        '-e', 'cycles,instructions,cache-references,cache-misses,branch-misses',
        binary_path
    ]
    
    return run_with_monitoring(perf_cmd)

def run_with_monitoring(cmd: list) -> dict:
    """
    Run command with perf, vmstat, and iostat monitoring
    Returns complete metrics in database schema format
    """
    result = {
        'success': False,
        'output': '',
        'error': None,
        'execution_time_ms': 0,
        'perf_metrics': None,
        'vmstat_metrics': None,
        'iostat_metrics': None
    }
    
    # Start vmstat in background (1 second interval, 2 samples)
    vmstat_proc = subprocess.Popen(
        ['vmstat', '1', '2'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Start iostat with EXTENDED stats (-x flag)
    iostat_proc = subprocess.Popen(
        ['iostat', '-x', '-d', '-k', '1', '2'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    start_time = time.time()
    
    try:
        # Run the actual command with perf
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        result['execution_time_ms'] = (time.time() - start_time) * 1000
        result['output'] = proc.stdout
        result['success'] = proc.returncode == 0
        
        if proc.returncode != 0:
            result['error'] = proc.stderr
        
        # Parse perf output (perf writes stats to stderr)
        result['perf_metrics'] = parse_perf_output(proc.stderr)
        
    except subprocess.TimeoutExpired:
        result['error'] = 'Execution timeout (60s)'
        result['execution_time_ms'] = 60000
    except Exception as e:
        result['error'] = str(e)
        result['execution_time_ms'] = (time.time() - start_time) * 1000
    
    # Collect vmstat output
    try:
        vmstat_out, _ = vmstat_proc.communicate(timeout=5)
        result['vmstat_metrics'] = parse_vmstat_output(vmstat_out)
    except Exception as e:
        print(f"vmstat collection failed: {e}")
        result['vmstat_metrics'] = None
    
    # Collect iostat output
    try:
        iostat_out, _ = iostat_proc.communicate(timeout=5)
        result['iostat_metrics'] = parse_iostat_output(iostat_out)
    except Exception as e:
        print(f"iostat collection failed: {e}")
        result['iostat_metrics'] = None
    
    return result

def format_for_database(job_id: str, execution_result: dict) -> dict:
    """Format execution result to match database schema"""
    return {
        'job_id': job_id,
        'success': execution_result.get('success', False),
        'output': execution_result.get('output', ''),
        'error': execution_result.get('error'),
        'compile_error': execution_result.get('compile_error'),
        'execution_time_ms': execution_result.get('execution_time_ms', 0),
        
        # perf_metrics table
        'perf_metrics': execution_result.get('perf_metrics') or {
            'cpu_cycles': None,
            'instructions': None,
            'cache_references': None,
            'cache_misses': None,
            'branch_misses': None
        },
        
        # vmstat_metrics table
        'vmstat_metrics': execution_result.get('vmstat_metrics') or {
            'procs_running': None,
            'procs_blocked': None,
            'memory_free_kb': None,
            'memory_used_kb': None,
            'swap_used_kb': None,
            'io_blocks_in': None,
            'io_blocks_out': None,
            'cpu_user_percent': None,
            'cpu_system_percent': None,
            'cpu_idle_percent': None
        },
        
        # iostat_metrics table (list of devices)
        'iostat_metrics': execution_result.get('iostat_metrics') or []
    }

def main():
    """
    Main entry point:
    1. Connect to host via VSOCK
    2. Receive job
    3. Execute code (Python or C++)
    4. Run perf, vmstat, iostat
    5. Send results back
    6. Exit (VM shuts down)
    """
    temp_dir = tempfile.mkdtemp()
    sock = None
    
    try:
        print("VM Agent starting...")
        
        # Connect to host
        sock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
        
        print(f"Connecting to host at CID {VSOCK_HOST_CID}:{VSOCK_PORT}")
        max_retries = 10
        for attempt in range(max_retries):
            try:
                sock.connect((VSOCK_HOST_CID, VSOCK_PORT))
                print("Connected to host successfully")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Failed to connect after {max_retries} attempts: {e}")
                    sys.exit(1)
                time.sleep(0.5)
        
        # Receive job from host
        print("Waiting for job data...")
        job_bytes = rec_sock(sock)
        job = json.loads(job_bytes.decode('utf-8'))
        
        print(f"Received job {job['job_id']}: language={job['language']}")
        
        # Execute code based on language
        language = job['language'].lower()
        if language == 'python':
            execution_result = execute_python(job['code'], temp_dir)
        elif language in ['cpp', 'c++']:
            execution_result = execute_cpp(job['code'], temp_dir)
        else:
            execution_result = {
                'success': False,
                'output': '',
                'error': f"Unsupported language: {job['language']}",
                'execution_time_ms': 0,
                'perf_metrics': None,
                'vmstat_metrics': None,
                'iostat_metrics': None
            }
        
        print(f"Execution complete: success={execution_result['success']}")
        
        # Format result for database schema
        response = format_for_database(job['job_id'], execution_result)
        
        # Send results back to host
        print("Sending results to host...")
        result_bytes = json.dumps(response).encode('utf-8')
        send_sock(sock, result_bytes)
        print(f"Sent {len(result_bytes)} bytes to host")
        
        print("Job complete! VM will shut down.")
        
    except Exception as e:
        print(f"FATAL ERROR in agent: {e}")
        import traceback
        traceback.print_exc()
        
        # Try to send error back to host
        if sock:
            try:
                error_response = {
                    'job_id': 'unknown',
                    'success': False,
                    'output': '',
                    'error': f"Agent error: {str(e)}",
                    'execution_time_ms': 0,
                    'perf_metrics': None,
                    'vmstat_metrics': None,
                    'iostat_metrics': None
                }
                send_sock(sock, json.dumps(error_response).encode('utf-8'))
            except:
                print("Failed to send error response")
        
        sys.exit(1)
    
    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        if sock:
            sock.close()
        print("Agent cleanup complete")

if __name__ == "__main__":
    main()
