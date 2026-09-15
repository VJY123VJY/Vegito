from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_seller
from app.models.user import User
from app.schemas.inventory import InventoryRead, InventoryUpdate
from app.schemas.common import APIResponse
from app.utils.pagination import PaginationParams, PaginatedResponse
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=APIResponse[PaginatedResponse[InventoryRead]], summary="List inventory items")
def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    low_stock_only: bool = Query(False, description="Filter items below low stock threshold"),
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    items, total_count = InventoryService.list_inventory(db, pagination, low_stock_only=low_stock_only)
    paginated = PaginatedResponse.create(items, total_count, pagination)
    return APIResponse(data=paginated)


@router.post("/{seller_product_id}/adjust", response_model=APIResponse[InventoryRead], summary="Adjust stock quantity")
def adjust_inventory(
    seller_product_id: int,
    payload: InventoryUpdate,
    current_user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    inv = InventoryService.adjust_stock(
        db=db,
        seller_product_id=seller_product_id,
        quantity_change=payload.quantity_change,
        transaction_type=payload.transaction_type,
        note=payload.note,
        created_by=current_user.id,
    )
    # Get enriched read
    items, _ = InventoryService.list_inventory(db, PaginationParams(page=1, page_size=100))
    inv_read = next((i for i in items if i.seller_product_id == seller_product_id), None)
    return APIResponse(message="Inventory adjusted successfully", data=inv_read)
