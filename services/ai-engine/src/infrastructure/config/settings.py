from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="ENVIRONMENT")
    debug: bool = Field(True, validation_alias="DEBUG")
    mongo_uri: str = Field("mongodb://localhost:27017", validation_alias="MONGO_URI")
    mongo_db_name: str = Field("ai-engine", validation_alias="MONGO_DB_NAME")

    # Redis
    redis_url: str = Field("redis://localhost:6379/0", validation_alias="REDIS_URL")

    # Azure
    azure_api_key: str = Field(validation_alias="AZURE_API_KEY")
    azure_api_base: str = Field(validation_alias="AZURE_API_BASE")
    azure_api_version: str = Field(validation_alias="AZURE_API_VERSION")

    # OpenAI
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")

    # Anthropic
    anthropic_api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")

    # LLM Defaults
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
