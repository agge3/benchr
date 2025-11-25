from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Job, init_db
from job_cache import JobCache
from IQueue import GlobalQueue, RedisQueue
import json
import uuid
import os
import logging
from config import Config
import sys

DEBUG = True

# gunicorn does NOT call main, so initialize as free script (global)
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
queue = RedisQueue(
        name="benchr",
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        maxsize=Config.RATE_MAX_QUEUE_SIZE
)
cache = JobCache()

# each gunicorn worker needs its own connection
init_db()
# start is a problem with multithreading, because each gunicorn worker will call start! probably should use connect
cache.start()
print("[Flask] Starting API server...")

@app.route('/api/submit', methods=['POST'])
def submit_job():
    """
    Submit a new job
    POST /api/submit
    {
        "code": "...",
        "lang": "c",
        "compiler": "gcc",
        "opts": "-O2"
    }
    """
    try:
        data = request.json
        
        # Validate
        if not data.get('code'):
            return jsonify({'error': 'Code is required'}), 400
        
        if not data.get('lang'):
            return jsonify({'error': 'Language is required'}), 400
        
        # Create job in database
        # xxx just increment an integer
        if DEBUG:
            pass
            #print(f"job received: {job_id}")
        #logger.info(f"job received: {job_id}")
        
        job = Job.create(
            code=data['code'],
            lang=data['lang'],
            compiler=data.get('compiler', 'gcc'),
            compiler_opts=data.get('opts', '-O2'),
            status='queued'
        )

        
        #print(f"[Flask] Created job: {job_id}")
        
        # Add to queue (JobManager will pick it up)
        queue.push(job.id)

        if DEBUG:
            print(f"queue size: {queue.size()}")
        logging.info(f"queue size: {queue.size()}")
        
        #print(f"[Flask] Queued job: {job_id}")
        
        # xxx how to handle request submit??
        return jsonify({
            'job_id': job.id,
            'status': 'queued'
        }), 201
        
    except Exception as e:
        print(f"[Flask] Error submitting job: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/current', methods=['GET'])
def get_current_job():
    """
    Get the most recent job (for single-job testing)
    GET /api/current
    """
    try:
        # xxx not done well
        # Get most recent job
        job = Job.select().order_by(Job.created_at.desc()).first()
        
        if not job:
            return jsonify({'job': None})
        
        # XXX MAY NEED REFACTOR

        # Get full job data with metrics
        job_data = cache.get(job.id)
        
        return jsonify({'job': job_data})
        
    except Exception as e:
        print(f"[Flask] Error getting current job: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/<id>', methods=['GET'])
def get_job(id):
    try:
        logger.debug(f"Getting job ID: {id}, type: {type(id)}")
        
        #job_data = cache.get(id)
        job = Job.get_by_id(int(id))
        job_data = dict(job.__data__)
        if job_data.get('result'):
            job_data['result'] = json.loads(job_data['result'])
        
        logger.debug(f"job_data from cache: {job_data}")
        logger.debug(f"job_data type: {type(job_data)}")
        
        if not job_data:
            logger.warning(f"Job not found in cache/db: {id}")
            return jsonify({'error': 'Job not found'}), 404

        logger.info(f"Returning job {id} with status: {job_data.get('status')}")
        return jsonify(job_data)

    except Exception as e:
        logger.error(f"Error getting job {id}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """
    List all jobs (newest first)
    GET /api/jobs?limit=10
    """
    try:
        limit = int(request.args.get('limit', 10))
        
        jobs = Job.select().order_by(Job.created_at.desc()).limit(limit)
        
        job_list = [{
            'job_id': job.id,
            'lang': job.lang,
            'compiler': job.compiler,
            'status': job.status,
            'created_at': job.created_at.isoformat(),
            'completed_at': job.completed_at.isoformat() if job.completed_at else None
        } for job in jobs]
        
        return jsonify({'jobs': job_list})
        
    except Exception as e:
        print(f"[Flask] Error listing jobs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'database': 'connected' if not db.is_closed() else 'disconnected'
    })

    
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Send a message to Claude AI for code analysis
    POST /api/chat
    {
        "message": "...",
        "result": {...}
    }
    """
    try:
        data = request.json
        
        if not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        # TODO: Implement Claude AI integration
        # For now, return a placeholder response

        message = data['message']
        result = data.get('result')
        
        # Placeholder - integrate with Anthropic Claude API
        response_text = f"Received message: {message}"
        
        logger.info(f"Chat request received: {message[:50]}")
        
        return jsonify({
            'response': response_text
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
