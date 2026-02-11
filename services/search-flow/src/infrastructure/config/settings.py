from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    azure_model_name: str = "azure/gpt-4o-mini"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

ORGANIZATION_CONTEXT = (
    "A Technology Research Firm specialized in AI, Data Science, and Virus Research. "
    "Company Name: AINGO. "
    "We develop Search solutions and conduct virus research (Project Zorath)."
)
