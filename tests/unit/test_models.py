"""
Unit tests for Peewee models.

Run with: pytest tests/unit/test_models.py -v
"""

import pytest
from datetime import datetime


pytestmark = pytest.mark.unit


class TestJobModel:
    """Tests for Job model."""

    def test_create_job(self, test_db):
        """Should create a job with required fields."""
        from models import Job

        job = Job.create(
            code='print("test")',
            lang="python",
            compiler="python3",
            opts="",
            status="queued",
        )

        assert job.id is not None
        assert job.code == 'print("test")'
        assert job.lang == "python"
        assert job.status == "queued"

    def test_job_has_created_at(self, test_db):
        """Job should have auto-generated created_at timestamp."""
        from models import Job

        job = Job.create(
            code="test",
            lang="c",
            compiler="gcc",
            opts="-O2",
            status="queued",
        )

        assert job.created_at is not None
        assert isinstance(job.created_at, datetime)

    def test_job_status_transitions(self, test_db):
        """Should be able to update job status."""
        from models import Job

        job = Job.create(
            code="test",
            lang="c",
            compiler="gcc",
            opts="",
            status="queued",
        )

        job.status = "processing"
        job.save()

        reloaded = Job.get_by_id(job.id)
        assert reloaded.status == "processing"

        job.status = "completed"
        job.save()

        reloaded = Job.get_by_id(job.id)
        assert reloaded.status == "completed"

    def test_job_with_result(self, test_db):
        """Job should store result as JSON string."""
        import json
        from models import Job

        job = Job.create(
            code="test",
            lang="c",
            compiler="gcc",
            opts="",
            status="completed",
            result=json.dumps({"time": 0.123, "output": "success"}),
        )

        reloaded = Job.get_by_id(job.id)
        result = json.loads(reloaded.result)

        assert result["time"] == 0.123
        assert result["output"] == "success"

    def test_get_by_id(self, sample_job):
        """Should retrieve job by ID."""
        from models import Job

        retrieved = Job.get_by_id(sample_job.id)
        assert retrieved.id == sample_job.id
        assert retrieved.code == sample_job.code

    def test_delete_job(self, test_db):
        """Should be able to delete a job."""
        from models import Job

        job = Job.create(
            code="test",
            lang="python",
            compiler="python3",
            opts="",
            status="queued",
        )
        job_id = job.id

        Job.delete_by_id(job_id)

        with pytest.raises(Job.DoesNotExist):
            Job.get_by_id(job_id)

    def test_list_jobs_ordered(self, test_db):
        """Jobs should be retrievable in order."""
        from models import Job
        import time

        job1 = Job.create(code="1", lang="c", compiler="gcc", opts="", status="queued")
        job2 = Job.create(code="2", lang="c", compiler="gcc", opts="", status="queued")
        job3 = Job.create(code="3", lang="c", compiler="gcc", opts="", status="queued")

        jobs = list(Job.select().order_by(Job.id.desc()).limit(3))

        assert len(jobs) == 3
        assert jobs[0].id == job3.id
        assert jobs[2].id == job1.id
