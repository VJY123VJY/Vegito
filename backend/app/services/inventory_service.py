from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.seller_product import SellerProduct
from app.core.constants import InventoryTransactionType
from app.core.exceptions import BadRequestException, NotFoundException
from app.schemas.inventory import InventoryRead, InventoryTransactionRead
from app.utils.pagination import PaginationParams


class InventoryService:
    @staticmethod
    def get_or_create_inventory(db: Session, seller_product_id: int) -> Inventory:
        inv = (
            db.query(Inventory)
            .filter(Inventory.seller_product_id == seller_product_id)
            .with_for_update()
            .first()
        )
        if not inv:
            sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id).first()
            if not sp:
                raise NotFoundException(f"Seller product {seller_product_id} not found")
            inv = Inventory(
                seller_product_id=seller_product_id,
                quantity=sp.stock_quantity,
                reserved_quantity=Decimal("0.000"),
                low_stock_threshold=Decimal("5.000"),
            )
            db.add(inv)
            db.flush()
        return inv

    @staticmethod
    def reserve_stock(
        db: Session,
        seller_product_id: int,
        quantity: Decimal,
        reference_id: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> Inventory:
        """
        Reserves stock during checkout using row-level locking.
        Throws BadRequestException if insufficient stock.
        """
        inv = InventoryService.get_or_create_inventory(db, seller_product_id)
        available = inv.quantity - inv.reserved_quantity

        if quantity > available:
            raise BadRequestException(
                f"Insufficient stock for product ID {seller_product_id}. Available: {available}, requested: {quantity}"
            )

        inv.reserved_quantity += quantity

        txn = InventoryTransaction(
            inventory_id=inv.id,
            transaction_type=InventoryTransactionType.RESERVED.value,
            quantity=quantity,
            reference_type="ORDER",
            reference_id=reference_id,
            note="Stock reserved for checkout",
            created_by=created_by,
        )
        db.add(txn)
        return inv

    @staticmethod
    def commit_stock_deduction(
        db: Session,
        seller_product_id: int,
        quantity: Decimal,
        reference_id: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> Inventory:
        """
        Converts reserved stock to actual deduction when order is placed/confirmed.
        """
        inv = InventoryService.get_or_create_inventory(db, seller_product_id)
        inv.quantity -= quantity
        inv.reserved_quantity = max(Decimal("0.000"), inv.reserved_quantity - quantity)

        # Update SellerProduct.stock_quantity to mirror inventory
        sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id).first()
        if sp:
            sp.stock_quantity = inv.quantity

        txn = InventoryTransaction(
            inventory_id=inv.id,
            transaction_type=InventoryTransactionType.STOCK_OUT.value,
            quantity=quantity,
            reference_type="ORDER",
            reference_id=reference_id,
            note="Stock deducted for confirmed order",
            created_by=created_by,
        )
        db.add(txn)
        return inv

    @staticmethod
    def release_stock(
        db: Session,
        seller_product_id: int,
        quantity: Decimal,
        reference_id: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> Inventory:
        """
        Releases reserved stock if order fails or is cancelled before dispatch.
        """
        inv = InventoryService.get_or_create_inventory(db, seller_product_id)
        inv.reserved_quantity = max(Decimal("0.000"), inv.reserved_quantity - quantity)

        txn = InventoryTransaction(
            inventory_id=inv.id,
            transaction_type=InventoryTransactionType.RELEASED.value,
            quantity=quantity,
            reference_type="ORDER_CANCELLED",
            reference_id=reference_id,
            note="Stock reservation released",
            created_by=created_by,
        )
        db.add(txn)
        return inv

    @staticmethod
    def adjust_stock(
        db: Session,
        seller_product_id: int,
        quantity_change: Decimal,
        transaction_type: str = "ADJUSTMENT",
        note: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> Inventory:
        inv = InventoryService.get_or_create_inventory(db, seller_product_id)
        new_qty = inv.quantity + quantity_change
        if new_qty < 0:
            raise BadRequestException(f"Adjustment would cause negative stock ({new_qty}).")

        inv.quantity = new_qty
        sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id).first()
        if sp:
            sp.stock_quantity = new_qty

        txn = InventoryTransaction(
            inventory_id=inv.id,
            transaction_type=transaction_type,
            quantity=abs(quantity_change),
            reference_type="MANUAL_ADJUSTMENT",
            note=note,
            created_by=created_by,
        )
        db.add(txn)
        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def list_inventory(
        db: Session, pagination: PaginationParams, low_stock_only: bool = False
    ) -> Tuple[List[InventoryRead], int]:
        query = db.query(Inventory).join(SellerProduct, Inventory.seller_product_id == SellerProduct.id)
        if low_stock_only:
            query = query.filter(Inventory.quantity <= Inventory.low_stock_threshold)

        total_count = query.count()
        inv_list = query.offset(pagination.offset).limit(pagination.limit).all()

        results = []
        for inv in inv_list:
            sp = inv.seller_product
            prod = sp.product if sp else None
            available = inv.quantity - inv.reserved_quantity
            results.append(
                InventoryRead(
                    id=inv.id,
                    seller_product_id=inv.seller_product_id,
                    product_id=prod.id if prod else None,
                    product_name=prod.name if prod else None,
                    unit=prod.unit if prod else None,
                    quantity=inv.quantity,
                    reserved_quantity=inv.reserved_quantity,
                    available_quantity=available,
                    low_stock_threshold=inv.low_stock_threshold,
                    is_low_stock=inv.quantity <= inv.low_stock_threshold,
                    updated_at=inv.updated_at,
                )
            )
        return results, total_count
