from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="ENVIRONMENT")
    debug: bool = Field(True, validation_alias="DEBUG")

    mcp_server_url: str = Field(
        "http://localhost:8003/v1/mcp/sse", validation_alias="MCP_SERVER_URL"
    )

    embedding_service_url: str = Field(
        "http://localhost:8003", validation_alias="EMBEDDING_SERVICE_URL"
    )

    crew_verbose: bool = Field(False, validation_alias="CREW_VERBOSE")
    crew_max_iter: int = Field(5, validation_alias="CREW_MAX_ITER")
    crew_max_rpm: int = Field(100, validation_alias="CREW_MAX_RPM")
    crew_max_execution_time: int = Field(300, validation_alias="CREW_MAX_EXECUTION_TIME")
    crew_tracing: bool = Field(False, validation_alias="CREWAI_TRACING_ENABLED")
    crew_stream: bool = Field(True, validation_alias="CREWAI_STREAM")
    crew_max_tokens: int = Field(1500, validation_alias="CREW_MAX_TOKENS")

    # Search defaults
    search_top_k: int = Field(10, validation_alias="SEARCH_TOP_K")
    search_top_n: int = Field(5, validation_alias="SEARCH_TOP_N")

    # HyDE
    crew_hyde_verbose: bool = Field(True, validation_alias="CREW_HYDE_VERBOSE")
    crew_hyde_max_tokens: int = Field(512, validation_alias="CREW_HYDE_MAX_TOKENS")
    azure_hyde_model_name: str = Field(
        "gpt-4o-mini", validation_alias="AZURE_HYDE_MODEL_NAME"
    )

    # must be in .env
    azure_api_key: str = Field(..., validation_alias="AZURE_API_KEY")
    azure_api_base: str = Field(..., validation_alias="AZURE_API_BASE")
    azure_api_version: str = Field(..., validation_alias="AZURE_API_VERSION")
    azure_model_name: str = Field(..., validation_alias="AZURE_MODEL_NAME")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
