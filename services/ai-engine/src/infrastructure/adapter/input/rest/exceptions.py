from fastapi import Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from src.infrastructure.adapter.input.rest.v1.responses import BaseResponse
from src.core.domain.exceptions import (
    DomainException,
    EntityNotFoundException,
    DuplicateEntityException,
    BusinessRuleViolation,
    ExternalServiceError,
)


async def central_exception_handler(request: Request, exc: Exception):
    """
    Central exception handler for all non-domain exceptions.
    Handles HTTPException, RequestValidationError, and generic Exception.
    """
    status_code = 500
    message = "An unexpected error occurred."
    error_code = "INTERNAL_ERROR"
    details = None

    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        message = exc.detail
        error_code = getattr(exc, "error_code", f"HTTP_{status_code}")

    elif isinstance(exc, RequestValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        errors = []
        for error in exc.errors():
            error_msg = f"{error['loc'][-1]}: {error['msg']}"
            errors.append(error_msg)
        message = "Validation Error: " + "; ".join(errors)
        error_code = "VALIDATION_ERROR"

    else:
        # For unhandled exceptions, we might want to log the error here
        # message = str(exc) # Uncomment to expose internal errors in response
        pass

    response_data = BaseResponse(
        success=False,
        data=details,
        message=message,
        error_code=error_code,
    ).model_dump()

    return JSONResponse(status_code=status_code, content=response_data)


async def domain_exception_handler(request: Request, exc: DomainException):
    """
    Global exception handler for DomainException.
    """
    status_code = 500  # Default
    if isinstance(exc, EntityNotFoundException):
        status_code = 404
    elif isinstance(exc, DuplicateEntityException):
        status_code = 409
    elif isinstance(exc, BusinessRuleViolation):
        status_code = 400
    elif isinstance(exc, ExternalServiceError):
        status_code = 502  # Bad Gateway for external service failures

    response_data = BaseResponse(
        success=False,
        data=None,
        message=exc.message,
        error_code=exc.code,
    ).model_dump()

    return JSONResponse(status_code=status_code, content=response_data)


def setup_exception_handlers(app):
    """
    Register all exception handlers to the FastAPI application.
    """
    app.add_exception_handler(Exception, central_exception_handler)
    app.add_exception_handler(HTTPException, central_exception_handler)
    app.add_exception_handler(RequestValidationError, central_exception_handler)
    app.add_exception_handler(DomainException, domain_exception_handler)
