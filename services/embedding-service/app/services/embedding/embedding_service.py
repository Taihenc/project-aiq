from FlagEmbedding import FlagModel
from typing import List, Union
import numpy as np
from app.config import settings


class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = settings.embedding_model
        
    def load_model(self):
        if self.model is None:
            print(f"Loading embedding model: {self.model_name}")
            self.model = FlagModel(settings.embedding_model, use_fp16=True)
            print("Model loaded successfully")

    def clean_text(self, text):
        if not isinstance(text, str):
            text = str(text)
        cleaned_text = text.lower()
        cleaned_text = cleaned_text.replace("..", "")
        return cleaned_text
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = None) -> np.ndarray:
        if self.model is None:
            self.load_model()
        
        if isinstance(texts, str):
            texts = [texts]

        texts = [self.clean_text(t) for t in texts]
        
        batch_size = batch_size or settings.batch_size
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            max_length=8192
        )
        
        if isinstance(embeddings, dict):
            dense_embeddings = embeddings['dense_vecs']
        else:
            dense_embeddings = embeddings
            
        return dense_embeddings
    
    def encode_single(self, text: str) -> List[float]:
        embedding = self.encode(text)
        return embedding[0].tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.encode(texts)
        return [emb.tolist() for emb in embeddings]
    
    def get_embedding_dimension(self) -> int:
        if self.model is None:
            self.load_model()

        return settings.vector_size



embedding_service = EmbeddingService()