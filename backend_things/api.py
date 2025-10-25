"""Flask"""
import os
import sys
import json
import logging
import hashlib
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
sys.path.insert(0, os.path.dirname(__file__))
from IQueue import GlobalQueue
from config import Config
from models import User, CodeProgram, create_tables, get_db

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
        # redis_url=Config.REDIS_URL,
        # queue_name=Config.QUEUE_NAME,
        # max_requests=Config.RATE_MAX_REQUESTS,
        # window_seconds=Config.RATE_WINDOW_SEC,
        maxsize=Config.RATE_MAX_QUEUE_SIZE
    )
    #queue.start()
    

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get(Config.API_KEY_HEADER)
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        # Hash the key
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        try:
            user = User.get(User.api_key == key_hash)
            request.current_user = user
        except User.DoesNotExist:
            return jsonify({'error': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated

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

@app.route('/api/v1/rate-limit', methods=['GET'])
@require_api_key
def get_rate_limit():
    stats = queue.get_user_stats(request.current_user.id)
    return jsonify(stats)

@app.route('/api/v1/jobs', methods=['POST'])
@require_api_key
def create_job():
   
    try:
        data = request.get_json()
        
        if not data.get('code'):
            return jsonify({'error': 'code is required'}), 400
        if not data.get('language'):
            return jsonify({'error': 'language is required'}), 400
        
        user_id = request.current_user.id
        
        success, message = queue.push(str(uuid()), user_id)
        
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

@app.route('/api/v1/programs/<int:program_id>', methods=['GET'])
@require_api_key
def get_program(program_id):
    try:
        program = CodeProgram.get_by_id(program_id)
        
        # check ownership
        if program.user_id.id != request.current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        #latest snapshot
        snapshots = list(program.snapshots.order_by(
            CodeProgram.created_at.desc()
        ).limit(1))
        
        response = {
            'id': program.id,
            'title': program.title,
            'code': program.code,
            'language': program.language,
            'created_at': program.created_at.isoformat(),
            'updated_at': program.updated_at.isoformat(),
            'metrics': None
        }
        
        if snapshots:
            snapshot = snapshots[0]
            perf = list(snapshot.perf.limit(1))
            iostat = list(snapshot.iostat.limit(1))
            vmstat = Configlist(snapshot.vmstat.limit(1))
            
            response['metrics'] = {
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
                    'read_kb_per_sec': iostat[0].read_kb_per_sec,
                    'write_kb_per_sec': iostat[0].write_kb_per_sec,
                    'cpu_util': iostat[0].cpu_util
                } if iostat else None,
                'vmstat': {
                    'procs_running': vmstat[0].procs_running,
                    'memory_free_kb': vmstat[0].memory_free_kb,
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

@app.route('/api/v1/programs', methods=['GET'])
@require_api_key
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

if __name__ == '__main__':
    create_tables()
    init_queue_and_cache()
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )
