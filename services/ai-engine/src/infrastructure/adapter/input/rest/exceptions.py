from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse


async def common_exception_handler(request: Request, exc: HTTPException):
    """
    Global exception handler for HTTPException to return a consistent BaseResponse format.
    """
    response_data = BaseResponse(
        success=False,
        data=None,
        message=exc.detail,
    ).model_dump()

    response_data["error_code"] = getattr(exc, "error_code", "ERROR_001")

    return JSONResponse(status_code=exc.status_code, content=response_data)
