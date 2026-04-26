from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True

    # Chunking (char size)
    max_chunk_size: int = 512

    # Upload
    api_url: str = "http://127.0.0.1:8003/v1/upload"

    # API
    upload_dir: str = "uploaded-files"

    # SharePoint Integration
    enable_sharepoint_integration: bool = True

    # SSL Verification
    verify_ssl: bool = True

    # RabbitMQ
    rabbitmq_host: str = "localhost"

    # Services
    file_storage_url: str = "http://localhost:8007"
    embedding_service_url: str = "http://localhost:8003"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
