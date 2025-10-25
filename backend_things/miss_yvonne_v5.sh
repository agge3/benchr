#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(pwd)"
VENV_DIR="$PROJECT_DIR/venv"
DATA_DIR="$PROJECT_DIR/data"
LOG_DIR="$PROJECT_DIR/logs"

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

create_project_structure() {
    
    mkdir -p $DATA_DIR $LOG_DIR
    
    
    cat > $PROJECT_DIR/config.py << 'EOF'
import os

class Config:
   
    DB_PATH = os.getenv('DB_PATH', 'data/benchr.db')
    
   
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
    
    
    QUEUE_NAME = os.getenv('RATE_QUEUE_NAME', 'benchmark_jobs')
    RATE_MAX_REQUESTS = int(os.getenv('RATE_MAX_REQUESTS', '100'))
    RATE_WINDOW_SEC = int(os.getenv('RATE_WINDOW_SEC', '3600'))
    RATE_MAX_QUEUE_SIZE = int(os.getenv('RATE_MAX_QUEUE_SIZE', '1000'))
    
    
    FLASK_HOST = os.getenv('FLASK_HOST', '127.0.0.1')
    FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/api.log')
    
    # Security
    API_KEY_HEADER = 'X-API-Key'
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*')
EOF


    cat > $PROJECT_DIR/models.py << 'EOF'
from peewee import *
from datetime import datetime
import os

DB_PATH = os.getenv('DB_PATH', 'data/benchr.db')

db_dir = os.path.dirname(DB_PATH)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

db = SqliteDatabase(
    DB_PATH,
    pragmas={
        'journal_mode': 'wal',
        'cache_size': -1 * 64000,
        'foreign_keys': 1,
        'synchronous': 1
    }
)

class BaseModel(Model):
    class Meta:
        database = db

class User(BaseModel):
    id = AutoField()
    username = CharField(unique=True, max_length=255)
    email = CharField(unique=True, max_length=255)
    api_key = CharField(unique=True, max_length=64)  # SHA-256 hash
    created_at = DateTimeField(default=datetime.now)
    
    class Meta:
        table_name = 'users'

class CodeProgram(BaseModel):
    id = AutoField()
    user_id = ForeignKeyField(User, backref='programs', on_delete='CASCADE')
    title = CharField(max_length=255, null=True)
    code = TextField()
    language = CharField(max_length=50)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    class Meta:
        table_name = 'code_programs'

class MetricSnapshot(BaseModel):
    id = AutoField()
    code_program_id = ForeignKeyField(CodeProgram, backref='snapshots', on_delete='CASCADE')
    timestamp = DateTimeField(default=datetime.now)
    notes = TextField(null=True)
    
    class Meta:
        table_name = 'metric_snapshots'

class PerfMetrics(BaseModel):
    id = AutoField()
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='perf', on_delete='CASCADE')
    cpu_cycles = BigIntegerField()
    instructions = BigIntegerField()
    cache_references = BigIntegerField()
    cache_misses = BigIntegerField()
    branch_misses = BigIntegerField()
    
    class Meta:
        table_name = 'perf_metrics'

class IostatMetrics(BaseModel):
    id = AutoField()
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='iostat', on_delete='CASCADE')
    device = CharField(max_length=50)
    total_reads = FloatField()
    total_writes = FloatField()
    read_kb_per_sec = FloatField()
    write_kb_per_sec = FloatField()
    niceness = FloatField()
    cpu_util = FloatField()
    cpu_idle = FloatField()
    await_ms = FloatField()
    
    class Meta:
        table_name = 'iostat_metrics'

class VmstatMetrics(BaseModel):
    id = AutoField()
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='vmstat', on_delete='CASCADE')
    procs_running = IntegerField()
    procs_blocked = IntegerField()
    memory_free_kb = BigIntegerField()
    memory_used_kb = BigIntegerField()
    swap_used_kb = BigIntegerField()
    io_blocks_in = IntegerField()
    io_blocks_out = IntegerField()
    cpu_user_percent = FloatField()
    cpu_system_percent = FloatField()
    cpu_idle_percent = FloatField()
    
    class Meta:
        table_name = 'vmstat_metrics'

def create_tables():
    with db:
        db.create_tables([
            User, CodeProgram, MetricSnapshot,
            PerfMetrics, IostatMetrics, VmstatMetrics
        ])

def get_db():
  
    return db
EOF

    cat > $PROJECT_DIR/api.py << 'EOF'
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
from uuid7 import uuid7

sys.path.insert(0, os.path.dirname(__file__))
from rate_limiter import RateLimitedQueue
from job_cache import JobCache

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
    queue = RateLimitedQueue(
        redis_url=Config.REDIS_URL,
        queue_name=Config.QUEUE_NAME,
        max_requests=Config.RATE_MAX_REQUESTS,
        window_seconds=Config.RATE_WINDOW_SEC,
        max_queue_size=Config.RATE_MAX_QUEUE_SIZE
    )
    queue.start()
    

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
        
        success, message = queue.push(str(uuid7()), user_id)
        
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
            vmstat = list(snapshot.vmstat.limit(1))
            
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
EOF

    cat > $PROJECT_DIR/.env << 'EOF'
DB_PATH=data/benchr.db


REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

RATE_QUEUE_NAME=benchmark_jobs
RATE_MAX_REQUESTS=100
RATE_WINDOW_SEC=3600
RATE_MAX_QUEUE_SIZE=1000

FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=False

ALLOWED_ORIGINS=*

LOG_LEVEL=INFO
LOG_FILE=logs/api.log
EOF

    cat > $PROJECT_DIR/start_api.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 --daemon --pid api.pid api:app
echo "giddy-up http://localhost:5000"
EOF

    cat > $PROJECT_DIR/stop_all.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
if [ -f api.pid ]; then
    kill $(cat api.pid) 2>/dev/null
    rm api.pid
    echo "API bad"
fi
EOF

    chmod +x $PROJECT_DIR/start_api.sh
    chmod +x $PROJECT_DIR/stop_all.sh

    cat > $PROJECT_DIR/Caddyfile << 'EOF'
# security hardening
{
    # global options
    admin off  # Disable admin API
    log {
        output file /var/log/caddy/access.log
        format json
    }
}

# HTTPS for prod
i-forgot-domain.com {
    # rate limiting (need caddy-ratelimit plugin)
    # xcaddy build --with github.com/mholt/caddy-ratelimit
    rate_limit {
        zone api {
            key {remote_host}
            events 100
            window 1m
        }
        zone strict_api {
            key {header.X-API-Key}
            events 1000
            window 1h
        }
    }
    
    # security headers
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # prevent clickjacking
        X-Frame-Options "DENY"
        
        # prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        
        
        X-XSS-Protection "1; mode=block"
        
        
        Referrer-Policy "strict-origin-when-cross-origin"
        
        
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
        
       
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        
        # remove server id
        -Server
        -X-Powered-By
    }
    
    #gzip compression
    encode gzip zstd
    
   
    handle /api/* {
       
        invoke rate_limit strict_api
        
        
        reverse_proxy localhost:5000 {
           
            health_uri /health
            health_interval 10s
            health_timeout 5s
            health_status 200
            
            
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Forwarded-Host {host}
            
         
            transport http {
                dial_timeout 10s
                response_header_timeout 30s
            }
        }
    }
    
    # Health check 
    handle /health {
        reverse_proxy localhost:5000
    }
    
    handle /static/* {
        root * /var/www/static
        file_server
    }
    
  
    handle {
        respond "Not Found" 404
    }
    
    handle_errors {
        @4xx expression `{http.error.status_code} >= 400 && {http.error.status_code} < 500`
        handle @4xx {
            respond "Client Error" {http.error.status_code}
        }
        
        @5xx expression `{http.error.status_code} >= 500`
        handle @5xx {
            respond "Server Error" 500
        }
    }
    
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }
}

localhost:8080 {
    # rate limeting, we should change this
    rate_limit {
        zone dev {
            key {remote_host}
            events 1000
            window 1m
        }
    }
    
    invoke rate_limit dev
    
    reverse_proxy localhost:5000
    
    encode gzip
}
EOF

    # Firewall rules
    cat > $PROJECT_DIR/setup_firewall.sh << 'EOF'
#!/bin/bash
# UFW Firewall configuration

# Reset UFW
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow Redis only from localhost
sudo ufw allow from 127.0.0.1 to any port 6379 comment 'Redis localhost only'

# Rate limiting on HTTP/HTTPS
sudo ufw limit 80/tcp
sudo ufw limit 443/tcp

# Enable firewall
sudo ufw --force enable

# Show status
sudo ufw status verbose

echo "Firewall is up.."
echo "did i leave the oven on?"
EOF

    chmod +x $PROJECT_DIR/setup_firewall.sh

   
    cat > $PROJECT_DIR/.gitignore << 'EOF'
venv/
data/
logs/
*.pid
*.pyc
__pycache__/
.env
*.log
EOF

}

install_all() {
    print_status "Miss Yvonne lives in: $PROJECT_DIR"
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 is not here"
        exit 1
    fi
    
    if ! command -v redis-server &> /dev/null; then
        print_error "Redis not installed. Run: sudo apt install redis-server"
        exit 1
    fi
    
   
    create_project_structure
    
 
    python3 -m venv $VENV_DIR
    source $VENV_DIR/bin/activate
    pip install --upgrade pip --quiet
    pip install flask gunicorn peewee redis flask-cors uuid7 python-dotenv --quiet
    
   
    source $VENV_DIR/bin/activate
    export $(cat .env | grep -v '^#' | xargs)
    python3 -c "from models import create_tables; create_tables()"
    
}

start_services() {
    cd $PROJECT_DIR
    bash start_api.sh
    sleep 2
    curl -s http://localhost:5000/health | python3 -m json.tool || print_warning "API not responding"
}

stop_services() {
    cd $PROJECT_DIR
    bash stop_all.sh
}

check_status() {
    if [ -f $PROJECT_DIR/api.pid ] && kill -0 $(cat $PROJECT_DIR/api.pid) 2>/dev/null; then
        echo -e "${GREEN}✓${NC} API running (PID: $(cat $PROJECT_DIR/api.pid))"
    else
        echo -e "${RED}✗${NC} API not running"
    fi
    
    echo ""
    curl -s http://localhost:5000/health | python3 -m json.tool || echo "API not responding"
}

create_user() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        print_error "Usage: bash $0 create-user <username> <email>"
        exit 1
    fi
    
    cd $PROJECT_DIR
    source $VENV_DIR/bin/activate
    export $(cat .env | grep -v '^#' | xargs)
    
    python3 << EOF
import secrets
import hashlib
from models import User, db

db.connect()

api_key = secrets.token_urlsafe(32)
api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

try:
    user = User.create(
        username='$1',
        email='$2',
        api_key=api_key_hash
    )
    print(f"API Key: {api_key}")
    print(f"\n save me!")
except Exception as e:
    print(f"Error: {e}")
    exit(1)
EOF
}

case "$1" in
    install) 
        install_all
        ;;
    start) 
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 1
        start_services
        ;;
    status)
        check_status
        ;;
    create-user) 
        create_user "$2" "$3"
        ;;
    *)
        
        exit 1
        ;;
esac
        
