from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from src.core.domain.model.llm import Model
from src.core.application.usecase.llm import ModelService
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.infrastructure.config.dependencies import get_model_service
from src.core.application.dto.llm import (
    CreateModelRequest,
    UpdateModelRequest,
)
from src.infrastructure.adapter.input.rest.v1.examples.llm_examples import (
    LIST_MODELS_RESPONSES,
    GET_MODEL_RESPONSES,
    CREATE_MODEL_RESPONSES,
    UPDATE_MODEL_RESPONSES,
    DELETE_MODEL_RESPONSES,
)

router = APIRouter()


@router.get(
    "",
    response_model=BaseResponse[List[Model]],
    responses=LIST_MODELS_RESPONSES,
)
async def list_models(
    provider: Optional[str] = Query(None),
    service: ModelService = Depends(get_model_service),
):
    """List all available models, optionally filtered by provider."""
    models = await service.list_models(provider=provider)
    return BaseResponse(data=models)


@router.get(
    "/{model_id}",
    response_model=BaseResponse[Model],
    responses=GET_MODEL_RESPONSES,
)
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


@router.post(
    "",
    response_model=BaseResponse[Model],
    responses=CREATE_MODEL_RESPONSES,
)
async def create_model(
    request: CreateModelRequest,
    service: ModelService = Depends(get_model_service),
):
    """Create a new model."""
    created_model = await service.create_model(request)
    return BaseResponse(data=created_model)


@router.put(
    "/{model_id}",
    response_model=BaseResponse[Model],
    responses=UPDATE_MODEL_RESPONSES,
)
async def update_model(
    model_id: str,
    request: UpdateModelRequest,
    service: ModelService = Depends(get_model_service),
):
    """Update an existing model."""
    try:
        result = await service.update_model(model_id, request)
        return BaseResponse(data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/{model_id}",
    response_model=BaseResponse[bool],
    responses=DELETE_MODEL_RESPONSES,
)
async def delete_model(
    model_id: str,
    service: ModelService = Depends(get_model_service),
):
    """Delete a model."""
    try:
        result = await service.delete_model(model_id)
        return BaseResponse(data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
