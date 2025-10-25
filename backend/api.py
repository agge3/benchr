"""Flask"""
import os
import sys
import json
import logging
import hashlib
import secrets
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
sys.path.insert(0, os.path.dirname(__file__))
from IQueue import GlobalQueue
from config import Config
from models import (
    User, CodeProgram, MetricSnapshot, PerfMetrics,
    IostatMetrics, VmstatMetrics, create_tables, get_db
)

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=Config.ALLOWED_ORIGINS.split(','))
queue = None
cache = None

def init_queue_and_cache():
    global queue, cache
    queue = GlobalQueue(
        maxsize=Config.RATE_MAX_QUEUE_SIZE
    )

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get(Config.API_KEY_HEADER)
        if not api_key:
            return jsonify({'error': 'API key required'}), 401

        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        try:
            user = User.get(User.api_key == key_hash)
            request.current_user = user
        except User.DoesNotExist:
            return jsonify({'error': 'Invalid API key'}), 401

        return f(*args, **kwargs)
    return decorated

def generate_api_key():
    return secrets.token_urlsafe(32)

@app.route('/auth/register', methods=['POST'])
def register():
    try:
        # Accept any input, use defaults if missing
        data = request.get_json() or {}
        username = data.get('username') or 'demo_user'
        email = data.get('email') or 'demo@example.com'
        password = 'password'

        # Try to find existing user
        try:
            user = User.select().where(
                (User.username == username) | (User.email == email)
            ).get()
        except User.DoesNotExist:
            # Create new user if doesn't exist
            raw_api_key = generate_api_key()
            api_key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()

            user = User.create(
                username=username,
                email=email,
                password_hash=password,
                api_key=api_key_hash
            )

            logger.info(f"New demo user created: {username}")

            return jsonify({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'api_key': raw_api_key,
                'message': 'Registration successful'
            }), 201

        # User exists, just generate new API key and return
        raw_api_key = generate_api_key()
        user.api_key = hashlib.sha256(raw_api_key.encode()).hexdigest()
        user.save()

        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'api_key': raw_api_key,
            'message': 'Registration successful'
        }), 201

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        identifier = data.get('identifier')
        password = data.get('password')

        if not identifier or not password:
            return jsonify({'error': 'Username/email and password are required'}), 400

        try:
            user = User.select().where(
                (User.username == identifier) | (User.email == identifier)
            ).get()
        except User.DoesNotExist:
            # Create new user if doesn't exist
            raw_api_key = generate_api_key()
            api_key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()

            user = User.create(
                username=identifier,
                email=f"{identifier}@example.com",
                password_hash=password,
                api_key=api_key_hash
            )

            logger.info(f"New demo user created during login: {identifier}")

        if not hasattr(user, 'password_hash') or not user.password_hash:
            return jsonify({'error': 'Account setup incomplete. Please contact administrator.'}), 401

        #if user.password_hash != password:
        #    return jsonify({'error': 'Invalid credentials'}), 401

        raw_api_key = generate_api_key()
        user.api_key = hashlib.sha256(raw_api_key.encode()).hexdigest()
        user.save()

        logger.info(f"User logged in: {user.username}")

        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'api_key': raw_api_key,
            'message': 'Login successful'
        }), 200

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    db = get_db()
    db_status = 'connected'
    try:
        db.execute_sql('SELECT 1')
    except Exception as e:
        db_status = f'error: {str(e)}'

    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': db_status
    })

@app.route('/rate-limit', methods=['GET'])
#@require_api_key
def get_rate_limit():
    stats = queue.get_user_stats(request.current_user.id)
    return jsonify(stats)

@app.route('/jobs', methods=['POST'])
#@require_api_key
def create_job():
    try:
        data = request.get_json()

        if not data.get('code'):
            return jsonify({'error': 'code is required'}), 400
        if not data.get('language'):
            return jsonify({'error': 'language is required'}), 400

        user_id = request.current_user.id

        success, message = queue.push(str(uuid.uuid4()), user_id)

        if not success:
            return jsonify({'error': message}), 429

        program = CodeProgram.create(
            user_id=user_id,
            title=data.get('title', 'Untitled'),
            code=data['code'],
            language=data['language']
        )

        stats = queue.get_user_stats(user_id)

        response = jsonify({
            'id': program.id,
            'status': 'queued',
            'created_at': program.created_at.isoformat(),
            'message': message
        })

        response.headers['X-RateLimit-Limit'] = str(stats['max_requests'])
        response.headers['X-RateLimit-Remaining'] = str(stats['remaining'])
        response.headers['X-RateLimit-Window'] = str(stats['window_seconds'])

        return response, 201

    except Exception as e:
        logger.error(f"Failed job: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/programs/<int:program_id>', methods=['GET'])
#@require_api_key
def get_program(program_id):
    try:
        program = CodeProgram.get_by_id(program_id)

        if program.user_id.id != request.current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        snapshots = list(program.snapshots.order_by(
            MetricSnapshot.created_at.desc()
        ).limit(1))

        response = {
            'program': {
                'id': program.id,
                'title': program.title,
                'code_text': program.code,
                'language': program.language,
                'created_at': program.created_at.isoformat(),
                'updated_at': program.updated_at.isoformat(),
                'user_id': program.user_id.id
            },
            'latest_snapshot': None
        }

        if snapshots:
            snapshot = snapshots[0]
            perf = list(snapshot.perf.limit(1))
            iostat = list(snapshot.iostat.limit(1))
            vmstat = list(snapshot.vmstat.limit(1))

            response['latest_snapshot'] = {
                'id': snapshot.id,
                'code_program_id': snapshot.code_program_id.id,
                'timestamp': snapshot.timestamp.isoformat(),
                'notes': snapshot.notes,
                'perf_metrics': {
                    'cpu_cycles': perf[0].cpu_cycles,
                    'instructions': perf[0].instructions,
                    'cache_references': perf[0].cache_references,
                    'cache_misses': perf[0].cache_misses,
                    'branch_misses': perf[0].branch_misses
                } if perf else None,
                'iostat_metrics': {
                    'device': iostat[0].device,
                    'total_reads': iostat[0].total_reads,
                    'total_writes': iostat[0].total_writes,
                    'read_kb_per_sec': iostat[0].read_kb_per_sec,
                    'write_kb_per_sec': iostat[0].write_kb_per_sec,
                    'niceness': iostat[0].niceness,
                    'cpu_util': iostat[0].cpu_util,
                    'cpu_idle': iostat[0].cpu_idle,
                    'await_ms': iostat[0].await_ms
                } if iostat else None,
                'vmstat_metrics': {
                    'procs_running': vmstat[0].procs_running,
                    'procs_blocked': vmstat[0].procs_blocked,
                    'memory_free_kb': vmstat[0].memory_free_kb,
                    'memory_used_kb': vmstat[0].memory_used_kb,
                    'swap_used_kb': vmstat[0].swap_used_kb,
                    'io_blocks_in': vmstat[0].io_blocks_in,
                    'io_blocks_out': vmstat[0].io_blocks_out,
                    'cpu_user_percent': vmstat[0].cpu_user_percent,
                    'cpu_system_percent': vmstat[0].cpu_system_percent
                } if vmstat else None
            }

        return jsonify(response)

    except CodeProgram.DoesNotExist:
        return jsonify({'error': 'Program not found'}), 404
    except Exception as e:
        logger.error(f"Error fetching program: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/programs', methods=['GET'])
#@require_api_key
def list_programs():
    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 20)), 100)

    query = CodeProgram.select().where(
        CodeProgram.user_id == request.current_user.id
    ).order_by(CodeProgram.created_at.desc())

    programs = query.paginate(page, per_page)

    return jsonify({
        'programs': [{
            'id': p.id,
            'title': p.title,
            'language': p.language,
            'created_at': p.created_at.isoformat()
        } for p in programs],
        'page': page,
        'per_page': per_page
    })

@app.route('/programs/<int:program_id>/snapshots', methods=['POST'])
#@require_api_key
def create_snapshot(program_id):
    try:
        program = CodeProgram.get_by_id(program_id)

        if program.user_id.id != request.current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        snapshot = MetricSnapshot.create(
            code_program_id=program_id,
            notes=data.get('notes')
        )

        if data.get('perf'):
            perf_data = data['perf']
            PerfMetrics.create(
                snapshot_id=snapshot.id,
                cpu_cycles=perf_data['cpu_cycles'],
                instructions=perf_data['instructions'],
                cache_references=perf_data['cache_references'],
                cache_misses=perf_data['cache_misses'],
                branch_misses=perf_data['branch_misses']
            )

        if data.get('iostat'):
            iostat_data = data['iostat']
            IostatMetrics.create(
                snapshot_id=snapshot.id,
                device=iostat_data['device'],
                total_reads=iostat_data['total_reads'],
                total_writes=iostat_data['total_writes'],
                read_kb_per_sec=iostat_data['read_kb_per_sec'],
                write_kb_per_sec=iostat_data['write_kb_per_sec'],
                niceness=iostat_data['niceness'],
                cpu_util=iostat_data['cpu_util'],
                cpu_idle=iostat_data['cpu_idle'],
                await_ms=iostat_data['await_ms']
            )

        if data.get('vmstat'):
            vmstat_data = data['vmstat']
            VmstatMetrics.create(
                snapshot_id=snapshot.id,
                procs_running=vmstat_data['procs_running'],
                procs_blocked=vmstat_data['procs_blocked'],
                memory_free_kb=vmstat_data['memory_free_kb'],
                memory_used_kb=vmstat_data['memory_used_kb'],
                swap_used_kb=vmstat_data['swap_used_kb'],
                io_blocks_in=vmstat_data['io_blocks_in'],
                io_blocks_out=vmstat_data['io_blocks_out'],
                cpu_user_percent=vmstat_data['cpu_user_percent'],
                cpu_system_percent=vmstat_data['cpu_system_percent'],
                cpu_idle_percent=vmstat_data['cpu_idle_percent']
            )

        return jsonify({
            'snapshot_id': snapshot.id,
            'timestamp': snapshot.timestamp.isoformat(),
            'message': 'Metrics recorded successfully'
        }), 201

    except CodeProgram.DoesNotExist:
        return jsonify({'error': 'Program not found'}), 404
    except Exception as e:
        logger.error(f"Error creating snapshot: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/programs/<int:program_id>/snapshots', methods=['GET'])
#@require_api_key
def get_snapshots(program_id):
    try:
        program = CodeProgram.get_by_id(program_id)

        if program.user_id.id != request.current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        snapshots = program.snapshots.order_by(MetricSnapshot.timestamp.desc())

        result = []
        for snapshot in snapshots:
            perf = list(snapshot.perf.limit(1))
            iostat = list(snapshot.iostat.limit(1))
            vmstat = list(snapshot.vmstat.limit(1))

            result.append({
                'id': snapshot.id,
                'timestamp': snapshot.timestamp.isoformat(),
                'notes': snapshot.notes,
                'perf': {
                    'cpu_cycles': perf[0].cpu_cycles,
                    'instructions': perf[0].instructions,
                    'cache_references': perf[0].cache_references,
                    'cache_misses': perf[0].cache_misses,
                    'branch_misses': perf[0].branch_misses
                } if perf else None,
                'iostat': {
                    'device': iostat[0].device,
                    'total_reads': iostat[0].total_reads,
                    'total_writes': iostat[0].total_writes,
                    'read_kb_per_sec': iostat[0].read_kb_per_sec,
                    'write_kb_per_sec': iostat[0].write_kb_per_sec,
                    'niceness': iostat[0].niceness,
                    'cpu_util': iostat[0].cpu_util,
                    'cpu_idle': iostat[0].cpu_idle,
                    'await_ms': iostat[0].await_ms
                } if iostat else None,
                'vmstat': {
                    'procs_running': vmstat[0].procs_running,
                    'procs_blocked': vmstat[0].procs_blocked,
                    'memory_free_kb': vmstat[0].memory_free_kb,
                    'memory_used_kb': vmstat[0].memory_used_kb,
                    'swap_used_kb': vmstat[0].swap_used_kb,
                    'io_blocks_in': vmstat[0].io_blocks_in,
                    'io_blocks_out': vmstat[0].io_blocks_out,
                    'cpu_user_percent': vmstat[0].cpu_user_percent,
                    'cpu_system_percent': vmstat[0].cpu_system_percent,
                    'cpu_idle_percent': vmstat[0].cpu_idle_percent
                } if vmstat else None
            })

        return jsonify({'snapshots': result})

    except CodeProgram.DoesNotExist:
        return jsonify({'error': 'Program not found'}), 404
    except Exception as e:
        logger.error(f"Error fetching snapshots: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/snapshots/<int:snapshot_id>', methods=['GET'])
#@require_api_key
def get_snapshot(snapshot_id):
    try:
        snapshot = MetricSnapshot.get_by_id(snapshot_id)
        program = snapshot.code_program_id

        if program.user_id.id != request.current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        perf = list(snapshot.perf.limit(1))
        iostat = list(snapshot.iostat.limit(1))
        vmstat = list(snapshot.vmstat.limit(1))

        return jsonify({
            'id': snapshot.id,
            'program_id': program.id,
            'timestamp': snapshot.timestamp.isoformat(),
            'notes': snapshot.notes,
            'perf': {
                'cpu_cycles': perf[0].cpu_cycles,
                'instructions': perf[0].instructions,
                'cache_references': perf[0].cache_references,
                'cache_misses': perf[0].cache_misses,
                'branch_misses': perf[0].branch_misses
            } if perf else None,
            'iostat': {
                'device': iostat[0].device,
                'total_reads': iostat[0].total_reads,
                'total_writes': iostat[0].total_writes,
                'read_kb_per_sec': iostat[0].read_kb_per_sec,
                'write_kb_per_sec': iostat[0].write_kb_per_sec,
                'niceness': iostat[0].niceness,
                'cpu_util': iostat[0].cpu_util,
                'cpu_idle': iostat[0].cpu_idle,
                'await_ms': iostat[0].await_ms
            } if iostat else None,
            'vmstat': {
                'procs_running': vmstat[0].procs_running,
                'procs_blocked': vmstat[0].procs_blocked,
                'memory_free_kb': vmstat[0].memory_free_kb,
                'memory_used_kb': vmstat[0].memory_used_kb,
                'swap_used_kb': vmstat[0].swap_used_kb,
                'io_blocks_in': vmstat[0].io_blocks_in,
                'io_blocks_out': vmstat[0].io_blocks_out,
                'cpu_user_percent': vmstat[0].cpu_user_percent,
                'cpu_system_percent': vmstat[0].cpu_system_percent,
                'cpu_idle_percent': vmstat[0].cpu_idle_percent
            } if vmstat else None
        })

    except MetricSnapshot.DoesNotExist:
        return jsonify({'error': 'Snapshot not found'}), 404
    except Exception as e:
        logger.error(f"Error fetching snapshot: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    create_tables()
    init_queue_and_cache()
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )
