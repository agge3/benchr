from abc import ABC, abstractmethod
import json

class ISerializer(ABC):
    @abstractmethod
    def serialize(self, data: dict) -> bytes:
        pass
    @abstractmethod
    def deserializer(self, data: bytes) -> dict:
        pass
class JsonSerializer(ISerializer):
    def serialize(self, data):
        return json.dumps(data).encode('utf-8')
    def deserialize(self, data):
        return json.loads(data)
