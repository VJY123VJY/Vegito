from typing import TypeVar, Generic, Optional, Any
from pydantic import BaseModel, ConfigDict
from app.utils.pagination import PaginationMeta, PaginatedResponse

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
