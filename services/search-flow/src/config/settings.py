from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="ENVIRONMENT")
    debug: bool = Field(True, validation_alias="DEBUG")
    port: int = Field(8000, validation_alias="PORT")

    azure_api_key: str = Field(..., validation_alias="AZURE_API_KEY")
    azure_api_base: str = Field(..., validation_alias="AZURE_API_BASE")
    azure_api_version: str = Field(..., validation_alias="AZURE_API_VERSION")
    azure_model_name: str = Field(..., validation_alias="AZURE_MODEL_NAME")

    mcp_server_url: str = Field(
        "http://localhost:8003/v1/mcp/sse", validation_alias="MCP_SERVER_URL"
    )

    embedding_service_url: str = Field(
        "http://localhost:8003", validation_alias="EMBEDDING_SERVICE_URL"
    )

    # Capability to Tool Mapping
    capability_tool_map: dict = {
        "search": "search_documents",
        "page_lookup": "get_pages",
        "chunk_lookup": "get_chunks",
        # "graph_search": "graph_search",
    }

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
