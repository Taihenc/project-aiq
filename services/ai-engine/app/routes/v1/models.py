from fastapi import APIRouter
from app.services import ModelService

router = APIRouter()

model_service = ModelService()


@router.get(f"/")
async def get_models():
    return model_service.get_models()


@router.get("/{model_id}")
async def get_model(model_id: str):
    return model_service.get_model(model_id)
