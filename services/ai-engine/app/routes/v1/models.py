from fastapi import APIRouter, HTTPException, Path
from app.services import ModelService
from app.schemas import BaseResponse

router = APIRouter(prefix="/models", tags=["models"])

model_service = ModelService()


@router.get(
    "/",
    response_model=BaseResponse,
    summary="Get All Available Models",
    description="Retrieve all available models in the system with their configuration details",
    responses={
        200: {
            "description": "Successfully retrieved models list",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Models fetched successfully",
                        "data": {
                            "configs": {
                                "gpt-4o-mini": {
                                    "model": "gpt-4o-mini",
                                    "provider": "azure",
                                    "temperature": 0.7,
                                    "max_tokens": 4096,
                                    "top_p": 1.0,
                                },
                            },
                            "count": 1,
                        },
                    }
                }
            },
        }
    },
)
async def get_models_config():
    models = model_service.get_models_config()

    return BaseResponse(
        success=True,
        message="Models fetched successfully",
        data={
            "configs": models,
            "count": len(models),
        },
    )


@router.get(
    "/{model}",
    response_model=BaseResponse,
    summary="Get Specific Model Configuration",
    description="Retrieve configuration details for a specific model",
    responses={
        200: {
            "description": "Successfully retrieved model configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Model fetched successfully",
                        "data": {
                            "config": {
                                "model": "gpt-4o-mini",
                                "provider": "azure",
                                "temperature": 0.7,
                                "max_tokens": 4096,
                                "top_p": 1.0,
                            }
                        },
                    }
                }
            },
        },
        404: {
            "description": "Model not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Model 'invalid-model' not found"}
                }
            },
        },
    },
)
async def get_model_config(
    model: str = Path(
        ...,
        description="Name of the model to retrieve configuration for",
        example="gpt-4o-mini",
        min_length=1,
        max_length=50,
    )
):
    model_config = model_service.get_model_config(model)
    if not model_config:
        raise HTTPException(status_code=404, detail=f"Model '{model}' not found")
    return BaseResponse(
        success=True,
        message="Model fetched successfully",
        data={"config": model_config},
    )
