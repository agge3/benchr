"""
Unit tests for IQueue implementations (GlobalQueue, RedisQueue).

Run with: pytest tests/unit/test_queue.py -v
"""

import pytest


pytestmark = pytest.mark.unit


class TestGlobalQueue:
    """Tests for in-memory GlobalQueue."""

    def test_create_queue(self):
        """Should create queue with specified maxsize."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=10)
        assert queue.size() == 0
        assert queue.empty() is True

    def test_push_and_pop(self):
        """Should push and pop items correctly."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=10)

        queue.push(42)
        assert queue.size() == 1
        assert queue.empty() is False

        item = queue.pop()
        assert item == 42
        assert queue.empty() is True

    def test_fifo_order(self):
        """Queue should maintain FIFO order."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=10)

        queue.push(1)
        queue.push(2)
        queue.push(3)

        assert queue.pop() == 1
        assert queue.pop() == 2
        assert queue.pop() == 3

    def test_full_queue(self):
        """Should reject push when full."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=2)

        assert queue.push(1) is True
        assert queue.push(2) is True
        assert queue.full() is True
        assert queue.push(3) is False  # Rejected

    def test_pop_empty_returns_none(self):
        """Pop on empty queue should return None."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=10)
        assert queue.pop() is None

    def test_has_front(self):
        """hasFront should reflect queue state."""
        from IQueue import GlobalQueue

        queue = GlobalQueue(maxsize=10)

        assert queue.hasFront() is False
        queue.push(1)
        assert queue.hasFront() is True
        queue.pop()
        assert queue.hasFront() is False


class TestRedisQueueUnit:
    """
    Unit tests for RedisQueue using fakeredis.
    These test the queue logic without a real Redis connection.
    """

    @pytest.fixture
    def redis_queue(self, fake_redis):
        """Create a RedisQueue with injected fake Redis."""
        from IQueue import RedisQueue

        # Create queue but skip real connection
        queue = RedisQueue.__new__(RedisQueue)
        queue.name = "test:queue"
        queue.redis_url = "redis://fake"
        queue.redis = fake_redis
        queue.queued_key = "test:queue:queued"
        queue.processing_key = "test:queue:processing"
        queue.notify_channel = "test:queue:notify"
        queue.maxsize = 100

        return queue

    def test_push_increments_size(self, redis_queue):
        """Push should increment queue size."""
        redis_queue.push(1)
        assert redis_queue.size() == 1

    def test_empty_on_new_queue(self, redis_queue):
        """New queue should be empty."""
        assert redis_queue.empty() is True

    def test_not_empty_after_push(self, redis_queue):
        """Queue should not be empty after push."""
        redis_queue.push(1)
        assert redis_queue.empty() is False

    def test_has_front_reflects_state(self, redis_queue):
        """hasFront should return True when items exist."""
        assert redis_queue.hasFront() is False
        redis_queue.push(1)
        assert redis_queue.hasFront() is True

    def test_full_at_maxsize(self, redis_queue):
        """Queue should be full at maxsize."""
        redis_queue.maxsize = 3

        redis_queue.push(1)
        redis_queue.push(2)
        redis_queue.push(3)

        assert redis_queue.full() is True

    def test_push_rejected_when_full(self, redis_queue):
        """Push should return False when queue is full."""
        redis_queue.maxsize = 2

        assert redis_queue.push(1) is True
        assert redis_queue.push(2) is True
        assert redis_queue.push(3) is False

    def test_queued_vs_processing_size(self, redis_queue):
        """Should track queued and processing separately."""
        redis_queue.push(1)
        redis_queue.push(2)

        assert redis_queue.queued_size() == 2
        assert redis_queue.processing_size() == 0

        # Move one to processing
        redis_queue.pend(timeout=1)

        assert redis_queue.queued_size() == 1
        assert redis_queue.processing_size() == 1
        # Total size unchanged
        assert redis_queue.size() == 2

    def test_clear_removes_all(self, redis_queue):
        """Clear should remove all items."""
        redis_queue.push(1)
        redis_queue.push(2)
        redis_queue.pend(timeout=1)

        redis_queue.clear()

        assert redis_queue.size() == 0
        assert redis_queue.queued_size() == 0
        assert redis_queue.processing_size() == 0
