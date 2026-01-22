from FlagEmbedding import FlagReranker
from typing import List, Tuple, Dict
import json
from app.config import settings
from app.models.models import DocumentResponse

class RerankingService:

    def __init__(self):
        self.reranker = None
        self.model_name = settings.reranking_model
        

    def load_model(self, use_fp16: bool = True):
        if self.reranker is None:
            print(f"Loading model: {self.model_name}")
            print("This will download the model if not already cached locally...")
            
            self.reranker = FlagReranker(
                self.model_name,
                use_fp16=use_fp16
            )
            
            print(f"Model loaded successfully! Model saved at: {self.reranker.model.name_or_path}")
    
    def rerank(
        self, 
        query: str, 
        documents: List[DocumentResponse], 
        top_n: int = None
    ) -> List[Dict]:
        if self.reranker is None:
            self.load_model()

        if not documents:
            return []
        
        texts = [doc.text for doc in documents]
        
        pairs = [[query, text] for text in texts]

        scores = self.reranker.compute_score(pairs)

        if not isinstance(scores, list):
            scores = [scores]
        
        for doc, score in zip(documents, scores):
            doc.reranking_score = float(score)
        
        documents.sort(key=lambda x: x.reranking_score, reverse=True)
        
        if top_n is not None:
            documents = documents[:top_n]
        
        return documents



reranking_service = RerankingService()
