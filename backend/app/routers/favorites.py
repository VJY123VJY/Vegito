from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import require_customer
from app.models.user import User
from app.models.customer_favorite import CustomerFavorite
from app.models.product import Product
from app.schemas.favorite import FavoriteAdd, FavoriteRead
from app.schemas.product import ProductRead
from app.schemas.common import APIResponse
from app.core.exceptions import NotFoundException, ConflictException

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("", response_model=APIResponse[List[FavoriteRead]], summary="List favorite products")
def list_favorites(current_user: User = Depends(require_customer), db: Session = Depends(get_db)):
    favs = (
        db.query(CustomerFavorite)
        .options(
            joinedload(CustomerFavorite.product).joinedload(Product.images),
            joinedload(CustomerFavorite.product).joinedload(Product.category),
        )
        .filter(CustomerFavorite.user_id == current_user.id)
        .order_by(CustomerFavorite.created_at.desc())
        .all()
    )
    results = []
    for f in favs:
        read_obj = FavoriteRead.model_validate(f)
        if f.product:
            read_obj.product = ProductRead.model_validate(f.product)
        results.append(read_obj)
    return APIResponse(data=results)


@router.post("", response_model=APIResponse[FavoriteRead], status_code=status.HTTP_201_CREATED, summary="Add product to favorites")
def add_favorite(
    payload: FavoriteAdd,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise NotFoundException(f"Product {payload.product_id} not found")

    existing = (
        db.query(CustomerFavorite)
        .filter(
            CustomerFavorite.user_id == current_user.id,
            CustomerFavorite.product_id == payload.product_id,
        )
        .first()
    )
    if existing:
        raise ConflictException("Product is already in favorites")

    fav = CustomerFavorite(user_id=current_user.id, product_id=payload.product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    read_obj = FavoriteRead.model_validate(fav)
    read_obj.product = ProductRead.model_validate(product)
    return APIResponse(message="Product added to favorites", data=read_obj)


@router.delete("/{product_id}", response_model=APIResponse[bool], summary="Remove product from favorites")
def remove_favorite(
    product_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(CustomerFavorite)
        .filter(
            CustomerFavorite.user_id == current_user.id,
            CustomerFavorite.product_id == product_id,
        )
        .first()
    )
    if not fav:
        raise NotFoundException("Favorite not found")

    db.delete(fav)
    db.commit()
    return APIResponse(message="Product removed from favorites", data=True)
