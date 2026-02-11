import asyncio
from typing import List, Dict
from src.core.application.dto.request import SearchChatRequest
from src.core.domain.model.state import FlowResponse
from src.infrastructure.adapter.output.crew.flow import SearchCrewFlow


class SearchFlowService:
    async def execute_workflow(self, request: SearchChatRequest) -> FlowResponse:
        flow = SearchCrewFlow()

        # Determine strict inputs matching FlowState
        inputs = {
            "query": request.query,
            "context": request.context,
            "history": request.history,
        }

        # Kickoff the flow in a separate thread to avoid blocking the event loop
        # and to prevent asyncio.run() conflicts if CrewAI uses it internally.
        await asyncio.to_thread(flow.kickoff, inputs=inputs)

        # Return the final response from state
        if flow.state.final_response:
            return flow.state.final_response

        # Fallback if something went wrong
        return FlowResponse(
            action="no_skill", response="Error: No response generated from the flow."
        )
