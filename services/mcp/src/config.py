from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    embedding_service: str = "http://localhost:8003"
    ingestion_service: str = "http://localhost:8002"
    server_port: int = 8004
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from .env


settings = Settings()