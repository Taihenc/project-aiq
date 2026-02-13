import asyncio
from typing import List, Dict
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.services.crew.flow import SearchCrewFlow


from langfuse import observe
from src.services.crew.tools.factory import MCPToolFactory


class SearchFlowService:
    @observe(name="search_flow", as_type="generation")
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        # 1. Fetch Tools Dynamically
        tools = await MCPToolFactory.get_tools()

        # 2. Initialize Flow with Tools
        flow = SearchCrewFlow()
        flow.set_tools(tools)  # Inject tools

        # Determine strict inputs matching FlowState
        # Ensure context items are converted to dicts for JSON serialization
        context_dicts = [item.model_dump() for item in request.context]
        inputs = {
            "query": request.query,
            "context": context_dicts,
            "history": request.history,
        }

        # Kickoff the flow in a separate thread to avoid blocking the event loop
        # and to prevent asyncio.run() conflicts if CrewAI uses it internally.

        # Note: We can't easily pass objects (tools) into kickoff inputs as they are serialized.
        # So we set them on the instance before kickoff.

        try:
            await asyncio.to_thread(flow.kickoff, inputs=inputs)
        except Exception as e:
            # Basic error logging
            print(f"❌ Error during flow execution: {e}")
            return FlowResponse(
                action="no_skill", response=f"Error executing search flow: {str(e)}"
            )

        # Return the final response from state
        if flow.state.final_response:
            return flow.state.final_response

        # Fallback if something went wrong
        return FlowResponse(
            action="no_skill", response="Error: No response generated from the flow."
        )
