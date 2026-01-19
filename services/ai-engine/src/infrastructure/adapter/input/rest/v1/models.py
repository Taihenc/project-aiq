from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from src.core.domain.model.llm import Model
from src.core.application.usecase.model_service import ModelService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_model_service

router = APIRouter()


@router.get("", response_model=BaseResponse[List[Model]])
async def list_models(
    provider: Optional[str] = Query(None),
    service: ModelService = Depends(get_model_service),
):
    """List all available models, optionally filtered by provider."""
    models = await service.list_models(provider=provider)
    return BaseResponse(data=models)


@router.get("/{model_id}", response_model=BaseResponse[Model])
async def get_model(
    model_id: str,
    service: ModelService = Depends(get_model_service),
):
    """Get a specific model by ID."""
    try:
        model = await service.get_model(model_id)
        return BaseResponse(data=model)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
