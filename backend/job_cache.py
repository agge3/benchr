from models import db, Job, JobMetrics
from util import ISerializer, JsonSerializer
from typing import Optional
import json
import datetime

# job_cache.py

# tight coupling to peewee
# job_cache.py
class JobCache:
    """Simple job cache"""
    
    def __init__(self):
        self.connected = False
    
    def connect(self):
        if not self.connected:
            db.connect(reuse_if_open=True)
            self.connected = True
    
    def disconnect(self):
        if self.connected and not db.is_closed():
            db.close()
            self.connected = False

    def start(self):
        pass
    
    def get(self, job_id: int) -> Optional[dict]:
        """Get job for execution"""
        try:
            job = Job.get_by_id(job_id)
            print(f"job_cache: get_by_id {job_id}")
            return {
                'code': job.code,
                'lang': job.lang,
                'compiler': job.compiler,
                'opts': job.opts
            }
        except:
            return None
    
    def update(self, job_id: int, result: dict):
        """Update job with result"""
        try:
            job = Job.get_by_id(job_id)
            job.set_result(result)
            job.status = 'completed' if result.get('success') else 'failed'
            job.completed_at = datetime.datetime.now()
            job.save()
            
            if result.get('success'):
                self._save_metrics(job, result)
        except:
            pass
    
    def _save_metrics(self, job: Job, result: dict):
        """Save metrics"""
        perf = result.get('perf', {})
        time_data = result.get('time', {})
        
        cycles = perf.get('cycles')
        instructions = perf.get('instructions')
        ipc = instructions / cycles if cycles and cycles > 0 else None
        
        exec_time = time_data.get('elapsed_time_seconds')
        
        JobMetrics.create(
            job=job,
            cycles=cycles,
            instructions=instructions,
            ipc=ipc,
            execution_time_ms=exec_time * 1000 if exec_time else None
        )
    
    def set_running(self, job_id: int):
        """Mark job as running"""
        try:
            job = Job.get_by_id(job_id)
            job.status = 'running'
            job.started_at = datetime.datetime.now()
            job.save()
        except:
            pass
    
    def get_full(self, job_id: int) -> Optional[dict]:
        """Get job with metrics"""
        try:
            job = Job.get_by_id(job_id)
            
            result = {
                'id': job.id,
                'code': job.code,
                'lang': job.lang,
                'status': job.status,
                'result': job.get_result()
            }
            
            try:
                m = JobMetrics.get(JobMetrics.job == job)
                result['metrics'] = {
                    'cycles': m.cycles,
                    'instructions': m.instructions,
                    'ipc': m.ipc,
                    'execution_time_ms': m.execution_time_ms
                }
            except:
                result['metrics'] = None
            
            return result
        except:
            return None
