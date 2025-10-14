from abc import ABC, abstractmethod
from sentence_transformers import SentenceTransformer
from openai import AsyncOpenAI
import torch

class Embedder(ABC):
    """Abstract base class for embedding models."""

    model_name: str

    @abstractmethod
    async def encode(self, texts):
        """Encode text(s) into vector(s)."""
        pass

    @abstractmethod
    async def get_embedding_size(self):
        """Get size of vector."""
        pass

class LocalEmbedder(Embedder):
    def __init__(self, model_name="bge-m3"):
        self.model_name = model_name
        self.model = SentenceTransformer("./" + model_name)

    async def encode(self, texts):
        vectors = self.model.encode(texts).tolist()
        return torch.tensor(vectors)
    
    async def get_embedding_size(self):
        return self.model.get_sentence_embedding_dimension()


class OpenAIEmbedder(Embedder):
    def __init__(self, model_name="text-embedding-3-large"):
        self.model_name = model_name
        self.client = AsyncOpenAI()

    async def encode(self, texts):
        response = await self.client.embeddings.create(
            model=self.model,
            input=texts
        )

        vectors = [d.embedding for d in response.data]
        return torch.tensor(vectors)

