"""
job_cache.py

Cache layer for job data and saved benchmarks.
Currently implemented as a no-op until Redis caching is fully set up.
All operations fall through to the database directly via models.
"""

from models import db, Job, JobMetrics
from typing import Optional
import datetime
import logging

logger = logging.getLogger(__name__)


class JobCache:
    """
    Job cache for storing and retrieving job data.

    Currently a no-op implementation that passes through to the database.
    Will integrate with Redis for caching saved benchmarks in the future.
    """

    def __init__(self, redis_url: str = None):
        """
        Initialize the job cache.

        Args:
            redis_url: Redis URL for future caching support (currently unused)
        """
        self.redis_url = redis_url
        self._connected = False

    async def connect(self) -> None:
        """Connect to cache backend (no-op for now)."""
        if not self._connected:
            db.connect(reuse_if_open=True)
            self._connected = True
            logger.info("[JobCache] Connected (database passthrough mode)")

    async def disconnect(self) -> None:
        """Disconnect from cache backend."""
        if self._connected and not db.is_closed():
            db.close()
        self._connected = False
        logger.info("[JobCache] Disconnected")

    async def get(self, job_id: int) -> Optional[dict]:
        """
        Get job data for execution.

        Args:
            job_id: The job ID to retrieve

        Returns:
            Job data dict or None if not found
        """
        try:
            job = Job.get_by_id(job_id)
            return {
                'id': job.id,
                'code': job.code,
                'lang': job.lang,
                'compiler': job.compiler,
                'opts': job.opts,
                'status': job.status,
                'result': job.get_result()
            }
        except Exception as e:
            logger.warning(f"[JobCache] Failed to get job {job_id}: {e}")
            return None

    async def update(self, job_id: int, result: dict) -> bool:
        """
        Update job with execution result.

        Args:
            job_id: The job ID to update
            result: Result dict containing status and result data

        Returns:
            True if updated successfully
        """
        try:
            job = Job.get_by_id(job_id)
            job_result = result.get('result', {})
            job.set_result(job_result)
            job.status = result.get('status', 'completed')
            job.completed_at = datetime.datetime.now()
            job.save()

            # Save metrics if successful
            if job_result.get('success'):
                self._save_metrics(job, job_result)

            return True
        except Exception as e:
            logger.warning(f"[JobCache] Failed to update job {job_id}: {e}")
            return False

    def _save_metrics(self, job: Job, result: dict) -> None:
        """Save job metrics to database."""
        try:
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
        except Exception as e:
            logger.warning(f"[JobCache] Failed to save metrics for job {job.id}: {e}")

    async def save_benchmark(self, job_id: int, name: str) -> Optional[int]:
        """
        Save a benchmark for later retrieval.

        Args:
            job_id: The job ID to save as a benchmark
            name: Name for the saved benchmark

        Returns:
            Benchmark ID if saved successfully, None otherwise

        Note: This is a no-op until Redis caching is set up.
              Returns None to indicate the feature is not yet available.
        """
        # TODO: Implement Redis-based saved benchmarks
        logger.info(f"[JobCache] save_benchmark called (no-op) - job_id={job_id}, name={name}")
        return None

    async def get_saved(self, benchmark_id: int) -> Optional[dict]:
        """
        Get a saved benchmark by ID.

        Args:
            benchmark_id: The benchmark ID to retrieve

        Returns:
            Benchmark data dict or None if not found

        Note: This is a no-op until Redis caching is set up.
        """
        # TODO: Implement Redis-based saved benchmarks
        logger.info(f"[JobCache] get_saved called (no-op) - benchmark_id={benchmark_id}")
        return None

    async def delete_saved(self, benchmark_id: int) -> bool:
        """
        Delete a saved benchmark.

        Args:
            benchmark_id: The benchmark ID to delete

        Returns:
            True if deleted successfully

        Note: This is a no-op until Redis caching is set up.
        """
        # TODO: Implement Redis-based saved benchmarks
        logger.info(f"[JobCache] delete_saved called (no-op) - benchmark_id={benchmark_id}")
        return False
