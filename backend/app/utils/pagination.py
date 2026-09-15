from typing import TypeVar, Generic, Sequence, Optional
from pydantic import BaseModel, Field
from math import ceil

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number starting at 1")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (max 100)")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PaginationMeta(BaseModel):
    total_items: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class PaginatedResponse(BaseModel, Generic[T]):
    items: Sequence[T]
    meta: PaginationMeta

    @classmethod
    def create(cls, items: Sequence[T], total_items: int, params: PaginationParams):
        total_pages = ceil(total_items / params.page_size) if params.page_size > 0 else 0
        meta = PaginationMeta(
            total_items=total_items,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_previous=params.page > 1,
        )
        return cls(items=items, meta=meta)
