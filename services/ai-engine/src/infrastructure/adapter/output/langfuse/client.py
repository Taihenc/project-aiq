from typing import Optional
from langfuse._client.get_client import get_client
from openinference.instrumentation.crewai import CrewAIInstrumentor
from langfuse import Langfuse


class LangfuseService:
    def setup(self) -> Langfuse:
        langfuse = get_client()

        try:
            langfuse.auth_check()
            print("Langfuse authentication successful")
        except Exception as e:
            print(f"Langfuse authentication failed: {e}")

        # Instrumentation for Langfuse tracing
        CrewAIInstrumentor().instrument(skip_dep_check=True)

        return langfuse
