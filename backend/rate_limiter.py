from IQueue import IQueue
import asyncio
import redis.asyncio as aioredis
from typing import Optional
import time


class RateLimitedQueue(IQueue):
    """
    Async Redis queue with sliding window rate limiting.
    Extends IQueue interface.
    """

    def __init__(
        self,
        redis_url: str,
        queue_name: str,
        max_requests: int,
        window_seconds: int,
        max_queue_size: int,
    ):
        # Note: intentionally not calling super().__init__()
        # IQueue's init has different signature and uses sync redis
        self.redis_url = redis_url
        self.queue_name = queue_name
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_queue_size = max_queue_size
        self.redis: Optional[aioredis.Redis] = None

        # Keys (compatible with existing RedisQueue)
        self.queued_key = f"{queue_name}:queued"
        self.processing_key = f"{queue_name}:processing"
        self.rate_key = f"{queue_name}:rate"
        self.notify_channel = f"{queue_name}:notify"
        self._pubsub = None

    async def connect(self):
        self.redis = await aioredis.from_url(self.redis_url, decode_responses=True)
        self._pubsub = self.redis.pubsub()
        await self._pubsub.subscribe(self.notify_channel)
        print(f"[RateLimitedQueue] Connected to {self.redis_url}")

    async def disconnect(self):
        if self._pubsub:
            await self._pubsub.unsubscribe(self.notify_channel)
            await self._pubsub.close()
        if self.redis:
            await self.redis.close()
        print("[RateLimitedQueue] Disconnected")

    async def _check_rate_limit(self) -> bool:
        """Check if within rate limit using sliding window"""
        now = time.time()
        window_start = now - self.window_seconds

        await self.redis.zremrangebyscore(self.rate_key, 0, window_start)
        count = await self.redis.zcard(self.rate_key)

        return count < self.max_requests

    async def _record_request(self, job_id: int):
        """Record request in rate limit window"""
        now = time.time()
        pipe = self.redis.pipeline()
        pipe.zadd(self.rate_key, {str(job_id): now})
        pipe.expire(self.rate_key, self.window_seconds + 60)
        await pipe.execute()

    #    IQueue interface implementation

    async def full(self):
        return await self.size() >= self.max_queue_size

    async def empty(self):
        return await self.redis.llen(self.queued_key) == 0

    async def push(self, job_id: int) -> bool:
        """Add job if within rate limit and queue capacity"""
        if not await self._check_rate_limit():
            print(f"[RateLimitedQueue] Rate limit exceeded, rejecting job {job_id}")
            return False

        if await self.full():
            print(f"[RateLimitedQueue] Queue full, rejecting job {job_id}")
            return False

        pipe = self.redis.pipeline()
        pipe.rpush(self.queued_key, job_id)
        pipe.publish(self.notify_channel, str(job_id))
        await pipe.execute()

        await self._record_request(job_id)
        return True

    async def pend(self, timeout: float = 5.0) -> Optional[int]:
        """Atomically move job from queued to processing"""
        try:
            result = await self.redis.brpoplpush(
                self.queued_key, self.processing_key, timeout=int(timeout)
            )
            if result:
                return int(result)
            return None
        except Exception as e:
            print(f"[RateLimitedQueue] pend error: {e}")
            return None

    async def pop(self, job_id: int = None):
        """Remove job from processing queue"""
        if job_id:
            await self.redis.lrem(self.processing_key, 1, str(job_id))
        else:
            # Fallback: pop from right (FIFO order)
            await self.redis.rpop(self.processing_key)

    async def hasFront(self) -> bool:
        return await self.redis.llen(self.queued_key) > 0

    async def size(self) -> int:
        queued = await self.redis.llen(self.queued_key)
        processing = await self.redis.llen(self.processing_key)
        return queued + processing

    #    Additional async methods

    async def poll(self, timeout: float = 5.0):
        """Wait for queue notification (event-driven)"""
        try:
            msg = await asyncio.wait_for(
                self._pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=timeout
                ),
                timeout=timeout + 1,
            )
            return msg
        except asyncio.TimeoutError:
            return None

    async def queued_size(self) -> int:
        return await self.redis.llen(self.queued_key)

    async def processing_size(self) -> int:
        return await self.redis.llen(self.processing_key)

    async def requeue_processing(self) -> int:
        """Recovery: move all processing jobs back to queued"""
        count = 0
        while True:
            result = await self.redis.rpoplpush(self.processing_key, self.queued_key)
            if not result:
                break
            count += 1
        if count > 0:
            print(f"[RateLimitedQueue] Requeued {count} processing jobs")
        return count

    async def clear(self):
        """Clear all queues"""
        await self.redis.delete(self.queued_key)
        await self.redis.delete(self.processing_key)
        await self.redis.delete(self.rate_key)
        print("[RateLimitedQueue] Cleared")
