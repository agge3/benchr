import queue
from abc import ABC, abstractmethod
class IQueue:
    def __init__(self, maxsize, env):
        #load_dotenv(env)
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
        self._queue = queue.Queue(maxsize=maxsize)

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
