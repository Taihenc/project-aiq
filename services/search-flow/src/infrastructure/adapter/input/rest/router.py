from fastapi import APIRouter, HTTPException
from src.core.application.dto.request import SearchChatRequest
from src.core.domain.model.state import FlowResponse
from src.core.application.usecase.search_service import SearchFlowService

router = APIRouter()

# In a real app, use dependency injection
service = SearchFlowService()


@router.post("/chat", response_model=FlowResponse)
async def chat_with_search(request: SearchChatRequest):
    try:
        response = await service.execute_workflow(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
