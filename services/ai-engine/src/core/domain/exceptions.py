class DomainException(Exception):
    """Base class for all domain exceptions."""

    def __init__(self, message: str, code: str = "ERROR_001"):
        super().__init__(message)
        self.message = message
        self.code = code


class EntityNotFoundException(DomainException):
    """Raised when an entity is not found."""

    def __init__(self, message: str):
        super().__init__(message, code="NOT_FOUND")


class DuplicateEntityException(DomainException):
    """Raised when creating a duplicate entity."""

    def __init__(self, message: str):
        super().__init__(message, code="DUPLICATE_ENTITY")


class BusinessRuleViolation(DomainException):
    """Raised when a business rule is violated."""

    def __init__(self, message: str):
        super().__init__(message, code="BUSINESS_RULE_VIOLATION")


class ExternalServiceError(DomainException):
    """Raised when an external service fails."""

    def __init__(self, message: str, code: str = "EXTERNAL_SERVICE_ERROR"):
        super().__init__(message, code=code)


class LLMProviderError(ExternalServiceError):
    """Raised when the LLM provider fails."""

    def __init__(self, message: str):
        super().__init__(message, code="LLM_PROVIDER_ERROR")


class InactiveEntityException(DomainException):
    """Raised when an entity is inactive."""

    def __init__(self, message: str):
        super().__init__(message, code="INACTIVE_ENTITY")
