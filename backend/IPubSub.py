from abc import ABC, abstractmethod
from typing import Optional, Dict, Set
import redis.asyncio as aioredis
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


class IPubSub(ABC):
    """Abstract base class for pub/sub messaging systems"""

    @abstractmethod
    async def connect(self, redis_url: str) -> None:
        """Connect to the pub/sub backend"""
        pass

    @abstractmethod
    async def publish(self, channel: str, message: dict) -> bool:
        """
        Publish a message to a channel

        Args:
            channel: Channel name
            message: Message data (will be JSON serialized)

        Returns:
            bool: True if published successfully
        """
        pass

    @abstractmethod
    def subscribe(self, channel: str, queue: asyncio.Queue) -> None:
        """
        Subscribe a queue to receive messages from a channel

        Args:
            channel: Channel name
            queue: asyncio.Queue to receive messages
        """
        pass

    @abstractmethod
    def unsubscribe(self, channel: str, queue: asyncio.Queue) -> None:
        """
        Unsubscribe a queue from a channel

        Args:
            channel: Channel name
            queue: asyncio.Queue to remove
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the pub/sub connection and cleanup resources"""
        pass


class RedisPubSub(IPubSub):
    """
    Redis implementation of pub/sub messaging (async singleton)

    Usage:
        pubsub = await RedisPubSub.get_instance(redis_url)
        pubsub.subscribe('job_results', my_queue)
        await pubsub.publish('job_results', {'job_id': 123})
    """

    _instance: Optional["RedisPubSub"] = None
    _lock: asyncio.Lock = None

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._pubsub = None
        self._task: Optional[asyncio.Task] = None
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._running = False
        self._connected = False

    @classmethod
    async def get_instance(cls, redis_url: str = None) -> "RedisPubSub":
        """
        Get singleton instance with lazy initialization

        Args:
            redis_url: Redis URL (required on first call)

        Returns:
            RedisPubSub singleton instance
        """
        if cls._lock is None:
            cls._lock = asyncio.Lock()

        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            if redis_url and not cls._instance._connected:
                await cls._instance.connect(redis_url)
            return cls._instance

    async def connect(self, redis_url: str) -> None:
        """Connect to Redis and start listener"""
        if self._connected:
            return

        self._redis = await aioredis.from_url(redis_url, decode_responses=True)
        self._pubsub = self._redis.pubsub()
        await self._pubsub.subscribe("job_results")
        self._running = True
        self._connected = True
        self._task = asyncio.create_task(self._listen())
        print(f"[RedisPubSub] Connected and listening: {redis_url}")

    async def _listen(self):
        """Background listener task"""
        try:
            async for message in self._pubsub.listen():
                if message["type"] != "message":
                    continue

                channel = message["channel"]
                print(f"[RedisPubSub] Received on {channel}: {message['data']}")

                try:
                    data = json.loads(message["data"])

                    if channel in self._subscribers:
                        for queue in list(self._subscribers[channel]):
                            await queue.put(data)

                except json.JSONDecodeError as e:
                    print(f"[RedisPubSub] Invalid JSON on {channel}: {e}")
                except Exception as e:
                    print(f"[RedisPubSub] Error processing message: {e}")

        except asyncio.CancelledError:
            print("[RedisPubSub] Listener cancelled")
        except Exception as e:
            print(f"[RedisPubSub] Listener error: {e}")

    async def publish(self, channel: str, message: dict) -> bool:
        """
        Publish message to Redis channel

        Args:
            channel: Channel name
            message: Message dict to publish

        Returns:
            bool: True if published successfully
        """
        try:
            serialized = json.dumps(message)
            await self._redis.publish(channel, serialized)
            print(f"[RedisPubSub] Published to {channel}: {message}")
            return True
        except Exception as e:
            print(f"[RedisPubSub] Failed to publish to {channel}: {e}")
            return False

    def subscribe(self, channel: str, queue: asyncio.Queue) -> None:
        """
        Subscribe a queue to receive messages from a channel

        Args:
            channel: Channel name
            queue: asyncio.Queue to receive messages
        """
        if channel not in self._subscribers:
            self._subscribers[channel] = set()
        self._subscribers[channel].add(queue)
        print(f"[RedisPubSub] Queue subscribed to {channel}")

    def unsubscribe(self, channel: str, queue: asyncio.Queue) -> None:
        """
        Unsubscribe a queue from a channel

        Args:
            channel: Channel name
            queue: asyncio.Queue to remove
        """
        if channel in self._subscribers:
            self._subscribers[channel].discard(queue)
            if not self._subscribers[channel]:
                del self._subscribers[channel]
        print(f"[RedisPubSub] Queue unsubscribed from {channel}")

    async def close(self) -> None:
        """Close all subscriptions and Redis connection"""
        self._running = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()

        self._connected = False
        print("[RedisPubSub] Closed all connections")


# Convenience function for getting singleton
async def get_pubsub(redis_url: str = None) -> RedisPubSub:
    """Get the PubSub singleton instance"""
    return await RedisPubSub.get_instance(redis_url)
