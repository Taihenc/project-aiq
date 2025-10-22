from FlagEmbedding import BGEM3FlagModel
from typing import List, Union
import numpy as np
from app.config import settings


class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = settings.embedding_model
        
    def load_model(self):
        """Load BGE-M3 model"""
        if self.model is None:
            print(f"Loading embedding model: {self.model_name}")
            self.model = BGEM3FlagModel(
                self.model_name,
                use_fp16=True  # Use FP16 for faster inference
            )
            print("Model loaded successfully")
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = None) -> np.ndarray:
        """
        Encode text(s) into embeddings
        
        Args:
            texts: Single text string or list of texts
            batch_size: Batch size for encoding
            
        Returns:
            numpy array of embeddings
        """
        if self.model is None:
            self.load_model()
        
        # Convert single string to list
        if isinstance(texts, str):
            texts = [texts]
        
        batch_size = batch_size or settings.batch_size
        
        # BGE-M3 returns a dictionary with 'dense_vecs' key
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            max_length=8192  # BGE-M3 supports up to 8192 tokens
        )
        
        # Extract dense vectors
        if isinstance(embeddings, dict):
            dense_embeddings = embeddings['dense_vecs']
        else:
            dense_embeddings = embeddings
            
        return dense_embeddings
    
    def encode_single(self, text: str) -> List[float]:
        """
        Encode a single text into embedding
        
        Args:
            text: Text string to encode
            
        Returns:
            List of floats representing the embedding
        """
        embedding = self.encode(text)
        return embedding[0].tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Encode multiple texts into embeddings
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embeddings
        """
        embeddings = self.encode(texts)
        return [emb.tolist() for emb in embeddings]
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embeddings"""
        if self.model is None:
            self.load_model()
        # BGE-M3 has 1024 dimensions
        return settings.vector_size


# Global instance
embedding_service = EmbeddingService()