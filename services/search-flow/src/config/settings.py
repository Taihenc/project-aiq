from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="ENVIRONMENT")
    debug: bool = Field(True, validation_alias="DEBUG")
    port: int = Field(8001, validation_alias="PORT")

    azure_api_key: str = Field(..., validation_alias="AZURE_API_KEY")
    azure_api_base: str = Field(..., validation_alias="AZURE_API_BASE")
    azure_api_version: str = Field(..., validation_alias="AZURE_API_VERSION")
    azure_model_name: str = Field(..., validation_alias="AZURE_MODEL_NAME")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

ORGANIZATION_CONTEXT = (
    "A Technology Research Firm specialized in AI, Data Science, and Virus Research. "
    "Company Name: AINGO. "
    "We develop Search solutions and conduct virus research (Project Zorath)."
)
