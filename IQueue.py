from abc import ABC, abstractmethod
import queue
import redis
import os

class IQueue:
    def __init__(self, maxsize, env):
        load_dotenv(env)
        self._queue = queue.Queue(maxsize=maxsize)

    @abstractmethod
    def full(self):
        pass

    @abstractmethod
    def empty(self):
        pass

    @abstractmethod
    def push(self, program_id: str):
        pass

    @abstractmethod
    def pop(self):
        pass

    @abstractmethod
    def hasFront(self):
        pass

    @abstractmethod
    def size(self):
        pass

class GlobalQueue(IQueue):
    def __init__(self,
                 maxsize = 1024
                 ):
        self._queue = IQueue(maxsize)

    def full(self):
        return self._queue.full()

    def empty(self):
        return self._queue.empty()

    def push(self, program_id: str):
        if (self._queue.full()):
            return False

        self._queue.put(program_id)
        return True
        
    def pop(self):
        if self.empty():
            return None

        return self._queue.get()

    def hasFront(self):
        return self._queue.qsize() > 0
    
    def size(self):
        return self._queue.qsize()


class RedisQueue(IQueue):
    def __init__(self,
                 name,
                 redis_url,
                 maxsize = 1024
                 ):
        self.name = name
        self.redis_url = redis_url
        self.redis = None   # multiclients connect to one redis instance
        self.queued_key = f"{name}:queued"
        self.processing_key = f"{name}:processing"
        self.notify_channel = f"{name}:notify"
        self.maxsize = maxsize
        self.init()

    def init(self):
        # connect to redis url and ensure valid redis instance
        try:
            self.redis = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True
            )
            # test connection
            self.redis.ping()
            print(f"REDIS: connected to redis: {self.redis_url}")
        except redis.ConnectionError as e:
            print(f"REDIS: ERROR: cannot connect to redis")
            raise
        except Exception as e:
            print(f"REDIS: ERROR: {e}")
            raise

    def full(self):
        return self.size() >= self.maxsize

    def empty(self):
        """Check if queue is empty (only queued items count)"""
        try:
            return self.redis.llen(self.queued_key) == 0
        except redis.ConnectionError:
            print("[RedisQueue] Connection error in empty()")
            return True

    def push(self, job_id: int):
        """
        Add job to queued list
        
        Returns:
            True if added, False if queue is full
        """
        if self.full():
            print(f"[RedisQueue] Queue full, cannot push job {job_id}")
            return False
        
        try:
            # Add to right of queued list (FIFO)
            self.redis.rpush(self.queued_key, job_id)
            
            # Optional: notify subscribers
            self.redis.publish(self.notify_channel, job_id)
            
            return True
        except redis.ConnectionError as e:
            print(f"[RedisQueue] Connection error in push(): {e}")
            return False
    
    def pend(self, timeout=5):
        """
        Move job from queued to processing (atomic operation)
        This marks the job as being worked on.
        
        Args:
            timeout: Seconds to wait for a job (blocking)
        
        Returns:
            job_id (int) or None if timeout
        """
        try:
            # Atomically move from queued to processing
            # BRPOPLPUSH: blocking right pop from queued, left push to processing
            result = self.redis.brpoplpush(
                self.queued_key,
                self.processing_key,
                timeout=timeout
            )
            
            if result:
                return int(result)
            return None
            
        except redis.ConnectionError as e:
            print(f"[RedisQueue] Connection error in pend(): {e}")
            return None
        except ValueError as e:
            print(f"[RedisQueue] Invalid job_id in pend(): {e}")
            return None
    
    def pop(self, timeout=5):
        """
        Remove job from processing queue (job is complete)
        
        Args:
            timeout: Seconds to wait for a job (blocking)
        
        Returns:
            job_id (int) or None if timeout/empty
        """
        if self.redis.llen(self.processing_key) == 0:
            return None
        
        try:
            # Remove from right of processing list
            result = self.redis.brpop(self.processing_key, timeout=timeout)
            
            if result:
                _, job_id = result
                return int(job_id)
            return None
            
        except redis.ConnectionError as e:
            print(f"[RedisQueue] Connection error in pop(): {e}")
            return None
        except ValueError as e:
            print(f"[RedisQueue] Invalid job_id in pop(): {e}")
            return None
    
    def hasFront(self):
        """
        Check if there are jobs waiting in queued list
        Note: processing jobs don't count as "queued"
        
        Returns:
            True if queued list has items
        """
        try:
            return self.redis.llen(self.queued_key) > 0
        except redis.ConnectionError:
            return False
    
    def size(self):
        """
        Total size = queued + processing
        
        Returns:
            Total number of jobs in both lists
        """
        try:
            queued = self.redis.llen(self.queued_key)
            processing = self.redis.llen(self.processing_key)
            return queued + processing
        except redis.ConnectionError:
            print("[RedisQueue] Connection error in size()")
            return 0
    
    def queued_size(self):
        """Get size of queued list only"""
        try:
            return self.redis.llen(self.queued_key)
        except redis.ConnectionError:
            return 0
    
    def processing_size(self):
        """Get size of processing list only"""
        try:
            return self.redis.llen(self.processing_key)
        except redis.ConnectionError:
            return 0
    
    def clear(self):
        """Clear both queued and processing lists (use with caution!)"""
        try:
            self.redis.delete(self.queued_key)
            self.redis.delete(self.processing_key)
            print("[RedisQueue] Queue cleared")
        except redis.ConnectionError:
            print("[RedisQueue] Connection error in clear()")
    
    def peek_queued(self):
        """Look at first queued job without removing it"""
        try:
            result = self.redis.lindex(self.queued_key, -1)  # Right-most (next to pop)
            if result:
                return int(result)
            return None
        except (redis.ConnectionError, ValueError):
            return None
    
    def peek_processing(self):
        """Look at first processing job without removing it"""
        try:
            result = self.redis.lindex(self.processing_key, -1)
            if result:
                return int(result)
            return None
        except (redis.ConnectionError, ValueError):
            return None
    
    def requeue_processing(self):
        """
        Move all processing jobs back to queued (recovery operation)
        Use this if JobManager crashes and you want to retry jobs
        
        Returns:
            Number of jobs moved
        """
        try:
            count = 0
            while True:
                result = self.redis.rpoplpush(self.processing_key, self.queued_key)
                if not result:
                    break
                count += 1
            
            if count > 0:
                print(f"[RedisQueue] Requeued {count} processing jobs")
            return count
            
        except redis.ConnectionError:
            print("[RedisQueue] Connection error in requeue_processing()")
            return 0
