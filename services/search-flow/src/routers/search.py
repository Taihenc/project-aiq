from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from src.dtos.request import SearchChatRequest
from src.models.state import FlowResponse
from src.dtos.response import APIResponse
from src.services.search_service import SearchFlowService

router = APIRouter()

service = SearchFlowService()


@router.post("/completions", response_model=APIResponse[FlowResponse])
async def completions_sync(request: SearchChatRequest):
    try:
        response = await service.execute_workflow(request)
        return APIResponse(data=response)
    except Exception as e:
        return APIResponse(status_code=500, message=str(e), data=None)


@router.post("/completions/stream")
async def completions_stream(request: SearchChatRequest):
    try:
        return StreamingResponse(
            service.execute_workflow_stream(request),
            media_type="text/event-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
