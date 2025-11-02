from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Qdrant Settings
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: Optional[str] = None
    collection_name: str = "documents"
    
    # Embedding Settings
    embedding_model: str = "BAAI/bge-m3"
    vector_size: int = 1024
    batch_size: int = 32

    # Reranking Settings
    reranking_model: str = "BAAI/bge-reranker-v2-m3"

    
    # API Settings
    api_title: str = "Embedding Service"
    api_version: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()