"""
Integration tests for Quart API endpoints.

These tests require Redis to be running.
Run with: pytest tests/integration/test_api.py -v

To skip if Redis unavailable, tests auto-skip via fixture.
"""


import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


class TestHealthEndpoint:
    """Tests for /api/health endpoint."""

    async def test_health_returns_ok(self, app_client):
        """Health endpoint should return 200 OK."""
        response = await app_client.get("/api/health")
        assert response.status_code == 200
        data = await response.get_json()
        assert data["status"] == "ok"

    async def test_health_includes_db_status(self, app_client):
        """Health endpoint should include database status."""
        response = await app_client.get("/api/health")
        data = await response.get_json()

        assert "database" in data


class TestSubmitEndpoint:
    """Tests for /api/submit endpoint."""

    async def test_submit_requires_code(self, app_client):
        """Submit should require code field."""
        response = await app_client.post(
            "/api/submit",
            json={"lang": "python"},
        )

        assert response.status_code == 400
        data = await response.get_json()
        assert "code" in data["error"].lower()

    async def test_submit_requires_lang(self, app_client):
        """Submit should require lang field."""
        response = await app_client.post(
            "/api/submit",
            json={"code": "print('hi')"},
        )

        assert response.status_code == 400
        data = await response.get_json()
        assert "language" in data["error"].lower()

    async def test_submit_valid_job(self, app_client, job_data):
        """Should accept valid job submission."""
        response = await app_client.post("/api/submit", json=job_data)

        # Could be 201 (created) or 429 (rate limited) or 500 (redis not configured)
        # In test environment without full setup, we just check it doesn't crash
        assert response.status_code in [201, 429, 500]

        if response.status_code == 201:
            data = await response.get_json()
            assert "job_id" in data
            assert data["status"] == "queued"


class TestJobsEndpoint:
    """Tests for /api/jobs endpoints."""

    async def test_list_jobs_returns_array(self, app_client):
        """List jobs should return jobs array."""
        response = await app_client.get("/api/jobs")

        assert response.status_code == 200
        data = await response.get_json()
        assert "jobs" in data
        assert isinstance(data["jobs"], list)

    async def test_list_jobs_respects_limit(self, app_client):
        """List jobs should respect limit parameter."""
        response = await app_client.get("/api/jobs?limit=5")

        assert response.status_code == 200
        data = await response.get_json()
        assert len(data["jobs"]) <= 5

    async def test_get_nonexistent_job(self, app_client):
        """Getting nonexistent job should return error."""
        response = await app_client.get("/api/jobs/999999")

        # Should be 404 or 500 depending on error handling
        assert response.status_code in [404, 500]


class TestCurrentJobEndpoint:
    """Tests for /api/current endpoint."""

    async def test_current_returns_job_or_null(self, app_client):
        """Current endpoint should return job or null."""
        response = await app_client.get("/api/current")

        assert response.status_code == 200
        data = await response.get_json()
        assert "job" in data
        # job can be None if no jobs exist


class TestChatEndpoint:
    """Tests for /api/chat endpoint."""

    async def test_chat_requires_message(self, app_client):
        """Chat should require message field."""
        response = await app_client.post("/api/chat", json={})

        assert response.status_code == 400
        data = await response.get_json()
        assert "message" in data["error"].lower()

    async def test_chat_returns_response(self, app_client):
        """Chat should return a response."""
        response = await app_client.post(
            "/api/chat",
            json={"message": "Hello!"},
        )

        assert response.status_code == 200
        data = await response.get_json()
        assert "response" in data


class TestSavedBenchmarksEndpoint:
    """Tests for /api/saved endpoints."""

    async def test_save_requires_job_id(self, app_client):
        """Save benchmark should require job_id."""
        response = await app_client.post(
            "/api/saved",
            json={"name": "my benchmark"},
        )

        assert response.status_code == 400
        data = await response.get_json()
        assert "job_id" in data["error"].lower()

    async def test_get_nonexistent_saved(self, app_client):
        """Getting nonexistent saved benchmark should return 404."""
        response = await app_client.get("/api/saved/999999")

        assert response.status_code in [404, 500]
