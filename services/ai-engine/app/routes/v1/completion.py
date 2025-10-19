from fastapi import APIRouter
from app.services import CompletionService

router = APIRouter()

completion_service = CompletionService()


@router.post(f"/")
async def create_completion():
    return completion_service.create_completion()
