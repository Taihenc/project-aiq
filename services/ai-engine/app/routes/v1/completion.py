from fastapi import APIRouter, Path, Body
from app.services.completions import CompletionService
from app.schemas.completions import CrewRequest
from app.schemas.base import BaseResponse

router = APIRouter(prefix="/completions", tags=["completions"])

completion_service = CompletionService()


@router.post(
    "/crews/{crew}",
    response_model=BaseResponse,
    summary="Create Crew Completion",
    description="Process messages through a specific crew and return AI-generated response",
    responses={
        200: {
            "description": "Successfully processed crew completion",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew completion created successfully",
                        "data": {
                            "output": "ในส่วนของdata จะreturn object แบบไหนก็ได้ ขึ้นกับการออกแบบcrew นั้นๆ"
                        },
                    }
                }
            },
        },
        400: {
            "description": "Failed to process crew completion",
            "content": {
                "application/json": {
                    "example": {"detail": "Validation error: Invalid input"}
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
    request: CrewRequest = Body(
        example={
            "inputs": {
                "user_query": "มีชื่อผมในหน่วยStarไหม?",
                "chat_history": [
                    {"role": "user", "content": "สวัสดี ผมชื่อพล"},
                    {"role": "assistant", "content": "สวัสดีครับพล ยินดีที่ได้รู้จักครับ"},
                ],
                "context": [],
            },
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": False,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "top_p": 1.0,
        }
    ),
):
    return await completion_service.create_crew_completion(crew, request)
