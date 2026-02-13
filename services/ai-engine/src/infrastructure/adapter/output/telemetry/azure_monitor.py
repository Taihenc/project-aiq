import os
from azure.monitor.opentelemetry import configure_azure_monitor
from openinference.instrumentation.crewai import CrewAIInstrumentor


class AzureMonitorService:
    def setup(self):
        connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        
        if connection_string:
            try:
                configure_azure_monitor(
                    connection_string=connection_string,
                )
                print("Azure Monitor configured successfully")
                
                # Check for content recording enablement (critical for Foundry)
                if os.getenv("AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED", "").lower() == "true":
                    print("Azure AI Foundry Content Recording: ENABLED")
                else:
                    print("Azure AI Foundry Content Recording: DISABLED (Prompts/Completions will not be traced)")

                # Instrumentation for CrewAI with OpenInference
                # This will use the global tracer provider configured by Azure Monitor
                CrewAIInstrumentor().instrument(skip_dep_check=True)
            except Exception as e:
                print(f"Failed to configure Azure Monitor: {e}")
        else:
            print("APPLICATIONINSIGHTS_CONNECTION_STRING not set, skipping Azure Monitor setup")
