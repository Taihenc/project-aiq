from typing import Optional
from langfuse._client.get_client import get_client
from openinference.instrumentation.crewai import CrewAIInstrumentor
from langfuse import Langfuse
from loguru import logger


class LangfuseService:
    def setup(self) -> Langfuse:
        langfuse = get_client()

        try:
            langfuse.auth_check()
            logger.info("Langfuse authentication successful")
        except Exception as e:
            logger.error(f"Langfuse authentication failed: {e}")

        # Instrumentation for Langfuse tracing
        CrewAIInstrumentor().instrument(skip_dep_check=True)

        return langfuse
