"""
Shared pytest fixtures for Benchr backend tests.

Usage:
    - Unit tests use `fake_redis` fixture (no real Redis needed)
    - Integration tests use `redis_client` fixture (requires Redis service)
    - API tests use `app_client` fixture (Quart test client)
"""

import asyncio
import os
import sys

import pytest

backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

@pytest.fixture
def fake_redis():
    """
    Fake Redis client for unit tests.
    No real Redis required - all operations are in-memory.

    Usage:
        async def test_something(fake_redis):
            await fake_redis.set("key", "value")
            assert await fake_redis.get("key") == "value"
    """
    fakeredis = pytest.importorskip("fakeredis")
    import fakeredis.aioredis

    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
async def redis_client():
    """
    Real Redis client for integration tests.
    Requires Redis to be running (e.g., via docker-compose or CI service).

    Cleans up test keys after each test.
    """
    import redis.asyncio as aioredis

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    client = await aioredis.from_url(redis_url, decode_responses=True)

    try:
        await client.ping()
    except Exception as e:
        pytest.skip(f"Redis not available: {e}")

    yield client

    async for key in client.scan_iter("test:*"):
        await client.delete(key)

    await client.aclose()

@pytest.fixture
def test_db():
    """
    In-memory SQLite database for testing Peewee models.
    Creates tables before test, drops after.
    """
    from peewee import SqliteDatabase
    from models import db, Job

    test_database = SqliteDatabase(":memory:")

    original_db = db
    db.initialize(test_database)

    with test_database:
        test_database.create_tables([Job], safe=True)

    yield test_database

    with test_database:
        test_database.drop_tables([Job], safe=True)
    test_database.close()


@pytest.fixture
def sample_job(test_db):
    """Create a sample job for testing."""
    from models import Job

    job = Job.create(
        code='print("hello")',
        lang="python",
        compiler="python3",
        opts="",
        status="queued",
    )
    return job
@pytest.fixture
def app():
    """
    Quart application instance for testing.
    Configures test mode and returns app without running startup hooks.
    """
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = "sqlite:///test.db"

    from api import app as quart_app

    quart_app.config["TESTING"] = True

    return quart_app


@pytest.fixture
async def app_client(app):
    """
    Quart test client for making HTTP requests.

    Usage:
        async def test_health(app_client):
            response = await app_client.get("/api/health")
            assert response.status_code == 200
    """
    async with app.test_client() as client:
        yield client

@pytest.fixture
async def rate_limited_queue(fake_redis):
    """
    RateLimitedQueue with fake Redis for unit testing.
    """
    from rate_limiter import RateLimitedQueue

    queue = RateLimitedQueue(
        redis_url="redis://fake",
        queue_name="test:benchr",
        max_requests=10,
        window_seconds=60,
        max_queue_size=100,
    )

    queue.redis = fake_redis
    queue._pubsub = await fake_redis.pubsub()

    yield queue

    # Cleanup
    await queue.clear()

@pytest.fixture
def job_data():
    """Sample job submission data."""
    return {
        "code": 'int main() { return 0; }',
        "lang": "c",
        "compiler": "gcc",
        "opts": "-O2",
    }


@pytest.fixture
def python_job_data():
    """Sample Python job submission data."""
    return {
        "code": 'print("Hello, World!")',
        "lang": "python",
        "compiler": "python3",
        "opts": "",
    }
