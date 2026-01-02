"""
Unit tests for RateLimitedQueue.

These tests use fakeredis - no real Redis required.
Run with: pytest tests/unit/test_rate_limiter.py -v
"""

import pytest


pytestmark = pytest.mark.unit


class TestRateLimitedQueueBasics:
    """Basic queue operations."""

    async def test_push_to_empty_queue(self, rate_limited_queue):
        """Should successfully push to an empty queue."""
        result = await rate_limited_queue.push(1)
        assert result is True

    async def test_push_returns_job_in_queue(self, rate_limited_queue):
        """Pushed job should be retrievable."""
        await rate_limited_queue.push(42)

        assert await rate_limited_queue.hasFront() is True
        assert await rate_limited_queue.size() == 1

    async def test_push_multiple_jobs(self, rate_limited_queue):
        """Should handle multiple jobs."""
        for i in range(5):
            await rate_limited_queue.push(i)

        assert await rate_limited_queue.size() == 5

    async def test_empty_queue_is_empty(self, rate_limited_queue):
        """Empty queue should report empty."""
        assert await rate_limited_queue.empty() is True
        assert await rate_limited_queue.hasFront() is False

    async def test_queue_not_empty_after_push(self, rate_limited_queue):
        """Queue should not be empty after push."""
        await rate_limited_queue.push(1)
        assert await rate_limited_queue.empty() is False


class TestRateLimitedQueuePendPop:
    """Test pend (move to processing) and pop (complete) operations."""

    async def test_pend_moves_to_processing(self, rate_limited_queue):
        """Pend should move job from queued to processing."""
        await rate_limited_queue.push(123)

        job_id = await rate_limited_queue.pend(timeout=1)

        assert job_id == 123
        # Job moved to processing, queued should be empty
        assert await rate_limited_queue.queued_size() == 0
        assert await rate_limited_queue.processing_size() == 1

    async def test_pend_empty_queue_returns_none(self, rate_limited_queue):
        """Pend on empty queue should return None after timeout."""
        job_id = await rate_limited_queue.pend(timeout=0.1)
        assert job_id is None

    async def test_pop_removes_from_processing(self, rate_limited_queue):
        """Pop should remove job from processing queue."""
        await rate_limited_queue.push(456)
        await rate_limited_queue.pend(timeout=1)

        await rate_limited_queue.pop(456)

        assert await rate_limited_queue.processing_size() == 0

    async def test_full_lifecycle(self, rate_limited_queue):
        """Test complete job lifecycle: push -> pend -> pop."""
        # Submit job
        await rate_limited_queue.push(999)
        assert await rate_limited_queue.size() == 1

        # Worker picks up job
        job_id = await rate_limited_queue.pend(timeout=1)
        assert job_id == 999
        assert await rate_limited_queue.queued_size() == 0
        assert await rate_limited_queue.processing_size() == 1

        # Job completes
        await rate_limited_queue.pop(999)
        assert await rate_limited_queue.size() == 0


class TestRateLimiting:
    """Test rate limiting functionality."""

    async def test_rate_limit_allows_under_limit(self, fake_redis):
        """Should allow requests under the rate limit."""
        from rate_limiter import RateLimitedQueue

        queue = RateLimitedQueue(
            redis_url="redis://fake",
            queue_name="test:rate",
            max_requests=5,
            window_seconds=60,
            max_queue_size=100,
        )
        queue.redis = fake_redis

        # Should allow 5 requests
        for i in range(5):
            result = await queue.push(i)
            assert result is True, f"Request {i} should be allowed"

    async def test_rate_limit_rejects_over_limit(self, fake_redis):
        """Should reject requests over the rate limit."""
        from rate_limiter import RateLimitedQueue

        queue = RateLimitedQueue(
            redis_url="redis://fake",
            queue_name="test:rate2",
            max_requests=3,
            window_seconds=60,
            max_queue_size=100,
        )
        queue.redis = fake_redis

        # First 3 should succeed
        for i in range(3):
            await queue.push(i)

        # 4th should be rejected
        result = await queue.push(999)
        assert result is False


class TestQueueCapacity:
    """Test queue size limits."""

    async def test_full_queue_rejects_push(self, fake_redis):
        """Should reject push when queue is full."""
        from rate_limiter import RateLimitedQueue

        queue = RateLimitedQueue(
            redis_url="redis://fake",
            queue_name="test:full",
            max_requests=100,  # High rate limit
            window_seconds=60,
            max_queue_size=3,  # Low capacity
        )
        queue.redis = fake_redis

        # Fill the queue
        for i in range(3):
            await queue.push(i)

        assert await queue.full() is True

        # Should reject
        result = await queue.push(999)
        assert result is False

    async def test_queue_not_full_under_capacity(self, rate_limited_queue):
        """Queue should not be full under capacity."""
        await rate_limited_queue.push(1)
        assert await rate_limited_queue.full() is False


class TestClear:
    """Test queue clearing."""

    async def test_clear_empties_all_queues(self, rate_limited_queue):
        """Clear should empty both queued and processing lists."""
        # Add some jobs
        await rate_limited_queue.push(1)
        await rate_limited_queue.push(2)
        await rate_limited_queue.pend(timeout=1)  # Move one to processing

        await rate_limited_queue.clear()

        assert await rate_limited_queue.size() == 0
        assert await rate_limited_queue.queued_size() == 0
        assert await rate_limited_queue.processing_size() == 0
