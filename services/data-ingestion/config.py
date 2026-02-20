from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Chunking (char size)
    max_chunk_size: int = 512

    # Upload
    api_url: str = "http://127.0.0.1:8003/v1/upload"

    # API
    upload_dir: str = "uploaded-files"

    # SharePoint Integration
    enable_sharepoint_integration: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
