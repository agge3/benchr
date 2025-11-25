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
