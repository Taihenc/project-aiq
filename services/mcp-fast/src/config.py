from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    embedding_service: str = "http://localhost:8003"
    ingestion_service: str = "http://localhost:8002"
    server_port: int = 8005
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"

settings = Settings()
