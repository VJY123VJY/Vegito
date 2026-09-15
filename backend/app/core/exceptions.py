from typing import Any, Optional


class VegitoException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
        details: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        super().__init__(self.message)


class NotFoundException(VegitoException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message=message, status_code=404, code="NOT_FOUND", details=details)


class UnauthorizedException(VegitoException):
    def __init__(self, message: str = "Authentication required", details: Optional[Any] = None):
        super().__init__(message=message, status_code=401, code="UNAUTHORIZED", details=details)


class ForbiddenException(VegitoException):
    def __init__(self, message: str = "Permission denied", details: Optional[Any] = None):
        super().__init__(message=message, status_code=403, code="FORBIDDEN", details=details)


class BadRequestException(VegitoException):
    def __init__(self, message: str = "Invalid request", details: Optional[Any] = None):
        super().__init__(message=message, status_code=400, code="BAD_REQUEST", details=details)


class ConflictException(VegitoException):
    def __init__(self, message: str = "Resource conflict", details: Optional[Any] = None):
        super().__init__(message=message, status_code=409, code="CONFLICT", details=details)


class ValidationException(VegitoException):
    def __init__(self, message: str = "Validation failed", details: Optional[Any] = None):
        super().__init__(message=message, status_code=422, code="UNPROCESSABLE_ENTITY", details=details)
