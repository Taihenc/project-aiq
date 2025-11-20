from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Chunking
    max_chunk_size: int = 800
    chunk_overlap: int = 120 
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()