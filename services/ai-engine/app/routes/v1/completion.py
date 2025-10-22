from fastapi import APIRouter, HTTPException, Path, Body
from app.services import CompletionService
from app.schemas.completions import ChatCompletionRequest

router = APIRouter(prefix="/completions", tags=["completions"])

completion_service = CompletionService()


@router.post(
    "/crews/{crew}",
    summary="Create Crew Completion",
    description="Process messages through a specific crew and return AI-generated response",
    responses={
        200: {
            "description": "Successfully processed crew completion",
            "content": {
                "application/json": {
                    "example": {
                        "message": "สวัสดีครับ! ผมคือ AI Assistant ที่พร้อมช่วยเหลือคุณในเรื่องต่างๆ ครับ"
                    }
                }
            },
        },
        400: {
            "description": "Invalid request - empty messages or last message not from user",
            "content": {
                "application/json": {
                    "example": {"detail": "Messages list cannot be empty"}
                }
            },
        },
        404: {
            "description": "Crew not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Crew 'document_search_crew' not found"}
                }
            },
        },
        500: {
            "description": "Internal server error during crew processing",
            "content": {
                "application/json": {
                    "example": {"detail": "Error processing crew: Connection timeout"}
                }
            },
        },
    },
)
async def create_crew_completion(
    crew: str = Path(
        ...,
        description="Name of the crew to process messages through",
        example="document_search_crew",
        min_length=1,
        max_length=50,
    ),
    request: ChatCompletionRequest = Body(
        example={
            "messages": [
                {"role": "user", "content": "สวัสดี ผมชื่อพล"},
                {"role": "assistant", "content": "สวัสดีครับพล ยินดีที่ได้รู้จักครับ"},
                {"role": "user", "content": "มีชื่อผมในหน่วยStarไหม"},
            ]
        }
    ),
):
    return await completion_service.create_crew_completion(crew, request.messages)
