from peewee import *
import datetime
import json
from typing import Optional
import os

DB_PATH = os.getenv("DB_PATH", "data/benchr.db")

db_dir = os.path.dirname(DB_PATH)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

db = SqliteDatabase(
    DB_PATH,
    pragmas={
        'journal_mode': 'wal',
        'cache_size': -1 * 64000,
        'foreign_keys': 1,
        'synchronous': 2
    }
)

class BaseModel(Model):
    class Meta:
        database = db

class Job(BaseModel):
    id = AutoField(primary_key=True)

    # user later
    # xxx
    
    # Job input
    code = TextField()
    lang = CharField(max_length=50)
    compiler = CharField(max_length=50)
    opts = CharField(max_length=255, default='')
    
    # Job status
    status = CharField(max_length=20, default='queued')  # queued, running, completed, failed
    
    # Job results (full JSON from execute.sh)
    result = TextField(null=True)
    
    # Timestamps
    started_at = DateTimeField(null=True)
    completed_at = DateTimeField(null=True)
    
    class Meta:
        table_name = 'jobs'
    
    def get_result(self) -> Optional[dict]:
        if self.result:
            return json.loads(self.result)
        return None
    
    def set_result(self, result_dict: dict):
        self.result = json.dumps(result_dict)

class JobMetrics(BaseModel):
    metric_id = AutoField(primary_key=True)
    job = ForeignKeyField(Job, backref='metrics', unique=True)
    
    # Performance counters
    cycles = BigIntegerField(null=True)
    instructions = BigIntegerField(null=True)
    cache_misses = BigIntegerField(null=True)
    cache_references = BigIntegerField(null=True)
    branch_misses = BigIntegerField(null=True)
    branch_instructions = BigIntegerField(null=True)
    
    # Calculated metrics
    ipc = FloatField(null=True)
    cache_miss_rate = FloatField(null=True)
    branch_miss_rate = FloatField(null=True)
    
    # Time metrics
    execution_time_ms = FloatField(null=True)
    max_rss_kb = IntegerField(null=True)
    page_faults = IntegerField(null=True)
    
    class Meta:
        table_name = 'job_metrics'

def init_db():
    """Initialize database"""
    with db:
        db.create_tables([Job, JobMetrics])
        print("Database initialized")

def get_db():
    return db
