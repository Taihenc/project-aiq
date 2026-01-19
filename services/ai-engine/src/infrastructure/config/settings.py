from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "agent_service"
    redis_url: str = "redis://localhost:6379/0"

    # LLM Defaults
    agent_temperature: float = 0.7
    agent_max_tokens: int = 4096

    # Mock Data
    mock_models: list[dict] = [
        {
            "id": "gpt-4-turbo",
            "name": "GPT-4 Turbo",
            "provider": "openai",
            "description": "High performance model",
            "context_window": 128000,
            "is_active": True,
            "default_config": {"temperature": 0.7, "max_tokens": 4096},
        },
        {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "provider": "openai",
            "description": "Cost-effective model",
            "context_window": 16385,
            "is_active": True,
            "default_config": {"temperature": 0.7, "max_tokens": 4096},
        },
        {
            "id": "claude-3-opus",
            "name": "Claude 3 Opus",
            "provider": "anthropic",
            "description": "Powerful model from Anthropic",
            "context_window": 200000,
            "is_active": True,
            "default_config": {"temperature": 0.7, "max_tokens": 4096},
        },
    ]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
