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
    username = CharField(unique=True, max_length=255, null=False)
    email = CharField(unique=True, max_length=255, null=False)
    # api_key = CharField(unique=True, max_length=64)  # SHA-256 hash
    created_at = DateTimeField(default=datetime.now)
    
    class Meta:
        table_name = 'users'

class CodeProgram(BaseModel):
    id = AutoField()
    user_id = ForeignKeyField(User, backref='programs', on_delete='CASCADE', null=False)
    title = CharField(max_length=255, null=True)
    code = TextField()
    language = CharField(max_length=50)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    class Meta:
        table_name = 'code_programs'

class MetricSnapshot(BaseModel):
    id = AutoField()
    code_program_id = ForeignKeyField(CodeProgram, backref='snapshots', on_delete='CASCADE', null=False)
    timestamp = DateTimeField(default=datetime.now)
    notes = TextField(null=True)
    
    class Meta:
        table_name = 'metric_snapshots'

class PerfMetrics(BaseModel):
    id = AutoField()
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='perf', on_delete='CASCADE', null=False)
    cpu_cycles = BigIntegerField()
    instructions = BigIntegerField()
    cache_references = BigIntegerField()
    cache_misses = BigIntegerField()
    branch_misses = BigIntegerField()
    
    class Meta:
        table_name = 'perf_metrics'

class IostatMetrics(BaseModel):
    id = AutoField()
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='iostat', on_delete='CASCADE', null=False)
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
    snapshot_id = ForeignKeyField(MetricSnapshot, backref='vmstat', on_delete='CASCADE', null=False)
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
