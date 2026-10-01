import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.models.user import User
from app.models.product import Product
from app.models.seller_product import SellerProduct
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.address import Address
from app.models.delivery_task import DeliveryTask
from app.models.delivery_task_status_history import DeliveryTaskStatusHistory
from app.models.delivery_partner import DeliveryPartner
from app.models.notification import Notification
from app.models.business_profile import BusinessProfile
from app.models.bulk_pricing_rule import BulkPricingRule
from app.models.bulk_cart_item import BulkCartItem
from app.models.saved_shopping_list import SavedShoppingList, SavedShoppingListItem
from app.models.recurring_bulk_order import RecurringBulkOrder, RecurringBulkOrderItem
from app.models.b2b_invoice import B2BInvoice

from app.schemas.business import (
    BusinessProfileCreate,
    BusinessProfileUpdate,
    BulkCartItemCreate,
    BulkCartItemUpdate,
    BulkCartRead,
    BulkCartItemRead,
    BulkOrderCreateRequest,
    SendCustomQuoteRequest,
    SavedShoppingListCreate,
    RecurringBulkOrderCreate,
    EventGroceryEstimateRequest,
    EventGroceryEstimateResponse,
    EventGroceryItem,
    B2BAnalyticsRead,
    TopProductMetric,
)
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
)
from app.utils.helpers import generate_order_number


class BulkOrderService:

    # -----------------------------------------------------------------------
    # Business Profiles
    # -----------------------------------------------------------------------

    @staticmethod
    def get_business_profile(db: Session, user_id: int) -> Optional[BusinessProfile]:
        return db.query(BusinessProfile).filter(BusinessProfile.user_id == user_id).first()

    @staticmethod
    def create_or_update_business_profile(
        db: Session, user_id: int, data: BusinessProfileCreate
    ) -> BusinessProfile:
        existing = BulkOrderService.get_business_profile(db, user_id)
        if existing:
            for field, val in data.model_dump(exclude_unset=True).items():
                setattr(existing, field, val)
            db.commit()
            db.refresh(existing)
            return existing

        profile = BusinessProfile(
            user_id=user_id,
            business_name=data.business_name,
            business_type=data.business_type,
            contact_person=data.contact_person,
            phone=data.phone,
            email=data.email,
            business_address=data.business_address,
            delivery_address=data.delivery_address,
            gstin=data.gstin,
            preferred_delivery_time=data.preferred_delivery_time,
            payment_preference=data.payment_preference or "UPI",
            is_approved=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    # -----------------------------------------------------------------------
    # Bulk Pricing Rules
    # -----------------------------------------------------------------------

    @staticmethod
    def get_effective_bulk_price(
        db: Session, seller_product_id: int, quantity: Decimal
    ) -> Tuple[Decimal, Decimal, bool]:
        """
        Returns (effective_unit_price, base_price, rule_applied).
        """
        sp = db.query(SellerProduct).filter(SellerProduct.id == seller_product_id).first()
        if not sp:
            raise NotFoundException(f"Seller product #{seller_product_id} not found")

        base_price = Decimal(str(sp.price))
        rule = (
            db.query(BulkPricingRule)
            .filter(
                BulkPricingRule.seller_product_id == seller_product_id,
                BulkPricingRule.is_active == True,
                BulkPricingRule.min_quantity <= quantity,
                or_(
                    BulkPricingRule.max_quantity == None,
                    BulkPricingRule.max_quantity >= quantity,
                ),
            )
            .order_by(BulkPricingRule.min_quantity.desc())
            .first()
        )

        if rule:
            return Decimal(str(rule.unit_price)), base_price, True
        return base_price, base_price, False

    @staticmethod
    def create_bulk_pricing_rule(
        db: Session, seller_id: int, seller_product_id: int, min_qty: Decimal, unit_price: Decimal, max_qty: Optional[Decimal] = None
    ) -> BulkPricingRule:
        sp = db.query(SellerProduct).filter(
            SellerProduct.id == seller_product_id,
            SellerProduct.seller_id == seller_id,
        ).first()
        if not sp:
            raise ForbiddenException("Seller product not owned by this seller")

        rule = BulkPricingRule(
            seller_product_id=seller_product_id,
            min_quantity=min_qty,
            max_quantity=max_qty,
            unit_price=unit_price,
            is_active=True,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def list_pricing_rules_for_seller_product(db: Session, seller_product_id: int) -> List[BulkPricingRule]:
        return (
            db.query(BulkPricingRule)
            .filter(
                BulkPricingRule.seller_product_id == seller_product_id,
                BulkPricingRule.is_active == True,
            )
            .order_by(BulkPricingRule.min_quantity.asc())
            .all()
        )

    # -----------------------------------------------------------------------
    # Bulk Cart Operations
    # -----------------------------------------------------------------------

    @staticmethod
    def get_bulk_cart(db: Session, user_id: int) -> BulkCartRead:
        items = (
            db.query(BulkCartItem)
            .filter(BulkCartItem.user_id == user_id)
            .order_by(BulkCartItem.created_at.asc())
            .all()
        )

        read_items: List[BulkCartItemRead] = []
        total_quantity = Decimal("0.000")
        total_subtotal = Decimal("0.00")

        for item in items:
            sp = item.seller_product
            product = sp.product if sp else None
            seller = sp.seller if sp else None
            seller_profile = getattr(seller, "seller_profile", None) if seller else None

            # Get image
            img_url = None
            if product and product.images:
                prim = [i.image_url for i in product.images if i.is_primary]
                img_url = prim[0] if prim else product.images[0].image_url

            # Real inventory stock
            inv = sp.inventory if sp else None
            available_stock = (inv.quantity - inv.reserved_quantity) if inv else sp.stock_quantity if sp else Decimal("0.000")
            if available_stock < Decimal("0.000"):
                available_stock = Decimal("0.000")

            effective_price, base_price, rule_applied = BulkOrderService.get_effective_bulk_price(
                db, item.seller_product_id, item.quantity
            )
            subtotal = effective_price * item.quantity

            total_quantity += item.quantity
            total_subtotal += subtotal

            read_items.append(
                BulkCartItemRead(
                    id=item.id,
                    seller_product_id=item.seller_product_id,
                    product_name=product.name if product else "Produce",
                    product_image_url=img_url,
                    seller_id=sp.seller_id if sp else 0,
                    seller_business_name=seller_profile.business_name if seller_profile else "Solapur Mandi Seller",
                    quantity=item.quantity,
                    unit=item.unit,
                    base_unit_price=base_price,
                    effective_unit_price=effective_price,
                    subtotal=subtotal,
                    bulk_rule_applied=rule_applied,
                    available_stock=available_stock,
                    is_in_stock=available_stock >= item.quantity,
                    notes=item.notes,
                )
            )

        return BulkCartRead(
            items=read_items,
            total_items_count=len(read_items),
            total_quantity=total_quantity,
            estimated_subtotal=total_subtotal,
        )

    @staticmethod
    def add_to_bulk_cart(db: Session, user_id: int, payload: BulkCartItemCreate) -> BulkCartItem:
        sp = db.query(SellerProduct).filter(SellerProduct.id == payload.seller_product_id).first()
        if not sp:
            raise NotFoundException("Seller product not found")

        existing = (
            db.query(BulkCartItem)
            .filter(
                BulkCartItem.user_id == user_id,
                BulkCartItem.seller_product_id == payload.seller_product_id,
            )
            .first()
        )

        if existing:
            existing.quantity = existing.quantity + payload.quantity
            if payload.notes:
                existing.notes = payload.notes
            db.commit()
            db.refresh(existing)
            return existing

        item = BulkCartItem(
            user_id=user_id,
            seller_product_id=payload.seller_product_id,
            quantity=payload.quantity,
            unit=payload.unit or getattr(sp.product, "unit", "KG"),
            notes=payload.notes,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_bulk_cart_item(db: Session, user_id: int, item_id: int, payload: BulkCartItemUpdate) -> BulkCartItem:
        item = db.query(BulkCartItem).filter(BulkCartItem.id == item_id, BulkCartItem.user_id == user_id).first()
        if not item:
            raise NotFoundException("Bulk cart item not found")

        if payload.quantity <= Decimal("0.000"):
            db.delete(item)
            db.commit()
            return item

        item.quantity = payload.quantity
        if payload.notes is not None:
            item.notes = payload.notes
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def remove_bulk_cart_item(db: Session, user_id: int, item_id: int) -> None:
        item = db.query(BulkCartItem).filter(BulkCartItem.id == item_id, BulkCartItem.user_id == user_id).first()
        if item:
            db.delete(item)
            db.commit()

    @staticmethod
    def clear_bulk_cart(db: Session, user_id: int) -> None:
        db.query(BulkCartItem).filter(BulkCartItem.user_id == user_id).delete()
        db.commit()

    # -----------------------------------------------------------------------
    # Bulk Order Request Submission (Idempotent)
    # -----------------------------------------------------------------------

    @staticmethod
    def create_bulk_order_request(db: Session, user_id: int, data: BulkOrderCreateRequest) -> Order:
        # Idempotency check: if key matches an existing order submitted within 24h, return it
        if data.idempotency_key:
            existing_order = (
                db.query(Order)
                .filter(
                    Order.customer_id == user_id,
                    Order.idempotency_key == data.idempotency_key,
                )
                .first()
            )
            if existing_order:
                return existing_order

        # Verify address
        address = db.query(Address).filter(Address.id == data.address_id, Address.user_id == user_id).first()
        if not address:
            raise BadRequestException("Delivery address not found or not owned by customer")

        # Verify business profile
        b_profile = BulkOrderService.get_business_profile(db, user_id)
        if not b_profile:
            # Auto-create basic business profile if customer hasn't filled it yet
            user = db.query(User).filter(User.id == user_id).first()
            b_profile = BusinessProfile(
                user_id=user_id,
                business_name=user.name or "Business Customer",
                business_type="BUSINESS",
                contact_person=user.name or "Manager",
                phone=user.phone,
                email=user.email,
                business_address=address.address_line1,
                delivery_address=address.address_line1,
                preferred_delivery_time=data.delivery_time_window,
            )
            db.add(b_profile)
            db.flush()

        # Load seller products and group
        subtotal = Decimal("0.00")
        order_items_to_create = []
        primary_seller_id = None
        primary_shop_id = None

        for item_req in data.items:
            sp = db.query(SellerProduct).filter(SellerProduct.id == item_req.seller_product_id).first()
            if not sp:
                raise NotFoundException(f"Seller product #{item_req.seller_product_id} not found")

            if not primary_seller_id:
                primary_seller_id = sp.seller_id
                sp_profile = getattr(sp.seller, "seller_profile", None)
                if sp_profile:
                    primary_shop_id = sp_profile.id

            eff_price, _, _ = BulkOrderService.get_effective_bulk_price(db, sp.id, item_req.quantity)
            item_subtotal = eff_price * item_req.quantity
            subtotal += item_subtotal

            order_items_to_create.append({
                "seller_product_id": sp.id,
                "product_name": sp.product.name,
                "unit": item_req.unit or sp.product.unit or "KG",
                "quantity": item_req.quantity,
                "unit_price": eff_price,
                "subtotal": item_subtotal,
                "seller_notes": item_req.notes,
            })

        order_number = generate_order_number()

        order = Order(
            order_number=order_number,
            order_type="BULK",
            customer_id=user_id,
            business_id=b_profile.id,
            address_id=data.address_id,
            seller_id=primary_seller_id,
            shop_id=primary_shop_id,
            customer_delivery_address=address.address_line1,
            landmark=address.landmark,
            status="BULK_REQUESTED",
            payment_method="COD",
            payment_status="PENDING",
            subtotal=subtotal,
            delivery_charge=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total_amount=subtotal,
            requested_delivery_date=data.delivery_date,
            requested_delivery_window=data.delivery_time_window,
            customer_note=data.special_instructions,
            quote_status="PENDING",
            idempotency_key=data.idempotency_key,
        )
        db.add(order)
        db.flush()

        for oi_data in order_items_to_create:
            oi = OrderItem(
                order_id=order.id,
                seller_product_id=oi_data["seller_product_id"],
                product_name=oi_data["product_name"],
                unit=oi_data["unit"],
                quantity=oi_data["quantity"],
                unit_price=oi_data["unit_price"],
                subtotal=oi_data["subtotal"],
                seller_notes=oi_data["seller_notes"],
            )
            db.add(oi)

        # Status history
        history = OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status="BULK_REQUESTED",
            changed_by=user_id,
            note="Bulk order request submitted by business customer",
        )
        db.add(history)

        # Send notification to seller
        if primary_seller_id:
            notif = Notification(
                user_id=primary_seller_id,
                title="📦 New Bulk Order Request",
                message=f"New bulk request #{order.order_number} from {b_profile.business_name} ({data.delivery_date}).",
                type="BULK_ORDER",
                data={"order_id": order.id, "order_number": order.order_number},
            )
            db.add(notif)

        # Clear bulk cart after order created
        db.query(BulkCartItem).filter(BulkCartItem.user_id == user_id).delete()

        db.commit()
        db.refresh(order)
        return order

    # -----------------------------------------------------------------------
    # Seller Actions: Accept Standard Price OR Send Custom Quote
    # -----------------------------------------------------------------------

    @staticmethod
    def seller_accept_standard_price(db: Session, seller_id: int, order_id: int) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.seller_id != seller_id:
            raise ForbiddenException("Bulk order not assigned to this seller")

        if order.status not in ("BULK_REQUESTED", "QUOTE_PENDING", "NEW"):
            raise BadRequestException(f"Order in state '{order.status}' cannot be accepted as standard price")

        # Inventory check & atomic reservation
        for item in order.items:
            if not item.seller_product_id:
                continue
            inv = (
                db.query(Inventory)
                .filter(Inventory.seller_product_id == item.seller_product_id)
                .with_for_update()
                .first()
            )
            if not inv:
                # Fallback to seller product stock
                sp = db.query(SellerProduct).filter(SellerProduct.id == item.seller_product_id).first()
                if not sp or sp.stock_quantity < item.quantity:
                    raise BadRequestException(
                        f"Insufficient stock for {item.product_name}. Available: {sp.stock_quantity if sp else 0}, Requested: {item.quantity}"
                    )
            else:
                available = inv.quantity - inv.reserved_quantity
                if available < item.quantity:
                    raise BadRequestException(
                        f"Insufficient stock for {item.product_name}. Available: {available}, Requested: {item.quantity}"
                    )
                # Atomically reserve
                inv.reserved_quantity += item.quantity
                db.add(
                    InventoryTransaction(
                        inventory_id=inv.id,
                        transaction_type="RESERVE",
                        quantity=item.quantity,
                        reference_id=str(order.id),
                        notes=f"Bulk order #{order.order_number} reservation",
                    )
                )

        order.status = "CONFIRMED"
        order.accepted_at = func.now()
        order.quote_status = "ACCEPTED"

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                old_status="BULK_REQUESTED",
                new_status="CONFIRMED",
                changed_by=seller_id,
                note="Seller accepted bulk order at standard/tiered rates",
            )
        )

        # Generate B2B Invoice
        BulkOrderService._generate_b2b_invoice(db, order)

        # Notify Customer
        db.add(
            Notification(
                user_id=order.customer_id,
                title="✅ Bulk Order Confirmed",
                message=f"Your bulk order #{order.order_number} has been confirmed by the seller!",
                type="ORDER_CONFIRMED",
                data={"order_id": order.id, "order_number": order.order_number},
            )
        )

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def seller_send_custom_quote(
        db: Session, seller_id: int, order_id: int, payload: SendCustomQuoteRequest
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.seller_id != seller_id:
            raise ForbiddenException("Bulk order not assigned to this seller")

        if order.status not in ("BULK_REQUESTED", "QUOTE_PENDING", "QUOTE_SENT"):
            raise BadRequestException(f"Cannot send quote for order in state '{order.status}'")

        # Map quoted prices
        quote_item_map = {q.order_item_id: q for q in payload.items}
        quote_subtotal = Decimal("0.00")

        for item in order.items:
            quoted = quote_item_map.get(item.id)
            if quoted:
                item.quoted_unit_price = quoted.quoted_unit_price
                item.quoted_subtotal = quoted.quoted_unit_price * item.quantity
                item.seller_notes = quoted.seller_notes
                quote_subtotal += item.quoted_subtotal
            else:
                quote_subtotal += item.subtotal

        quote_total = quote_subtotal + payload.delivery_fee

        order.quote_total = quote_total
        order.quote_delivery_fee = payload.delivery_fee
        order.quote_notes = payload.notes
        order.quote_status = "SENT"
        order.quote_sent_at = datetime.datetime.utcnow()
        order.quote_expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=payload.expires_in_hours or 24)
        order.status = "QUOTE_SENT"

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                old_status="BULK_REQUESTED",
                new_status="QUOTE_SENT",
                changed_by=seller_id,
                note=f"Seller sent custom quote: ₹{quote_total}",
            )
        )

        # Notify customer
        db.add(
            Notification(
                user_id=order.customer_id,
                title="📋 Quote Received for Bulk Order",
                message=f"Seller sent a quote of ₹{quote_total:.0f} for order #{order.order_number}. Review and accept.",
                type="QUOTE_RECEIVED",
                data={"order_id": order.id, "order_number": order.order_number, "quote_total": str(quote_total)},
            )
        )

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def seller_reject_bulk_order(db: Session, seller_id: int, order_id: int, reason: Optional[str] = None) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.seller_id != seller_id:
            raise ForbiddenException("Bulk order not assigned to this seller")

        if order.status in ("DELIVERED", "CANCELLED"):
            raise BadRequestException(f"Order in state '{order.status}' cannot be rejected")

        # If inventory was reserved, release it safely
        for item in order.items:
            if item.seller_product_id:
                inv = db.query(Inventory).filter(Inventory.seller_product_id == item.seller_product_id).first()
                if inv and inv.reserved_quantity >= item.quantity:
                    inv.reserved_quantity -= item.quantity
                    db.add(
                        InventoryTransaction(
                            inventory_id=inv.id,
                            transaction_type="RELEASE",
                            quantity=item.quantity,
                            reference_id=str(order.id),
                            notes=f"Released reservation from rejected bulk order #{order.order_number}",
                        )
                    )

        prev_status = order.status
        order.status = "CANCELLED"
        order.quote_status = "REJECTED"
        order.cancelled_at = func.now()

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                old_status=prev_status,
                new_status="CANCELLED",
                changed_by=seller_id,
                note=f"Seller declined bulk order: {reason or 'Unavailable'}",
            )
        )

        db.add(
            Notification(
                user_id=order.customer_id,
                title="❌ Bulk Order Declined",
                message=f"Seller was unable to fulfill bulk order #{order.order_number}. Reason: {reason or 'Capacity/Stock constraints'}.",
                type="ORDER_CANCELLED",
                data={"order_id": order.id, "order_number": order.order_number},
            )
        )

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def list_seller_bulk_orders(
        db: Session, seller_id: int, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(Order)
            .filter(Order.seller_id == seller_id, Order.order_type == "BULK")
            .order_by(Order.created_at.desc())
        )
        if status:
            query = query.filter(Order.status == status)

        orders = query.all()
        results = []
        for o in orders:
            b_profile = o.business or db.query(BusinessProfile).filter(BusinessProfile.user_id == o.customer_id).first()
            results.append({
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "quote_status": o.quote_status,
                "quote_total": str(o.quote_total) if o.quote_total else None,
                "quote_delivery_fee": str(o.quote_delivery_fee) if o.quote_delivery_fee else None,
                "quote_expires_at": o.quote_expires_at.isoformat() if o.quote_expires_at else None,
                "subtotal": str(o.subtotal),
                "delivery_charge": str(o.delivery_charge),
                "total_amount": str(o.total_amount),
                "business_name": b_profile.business_name if b_profile else (o.customer.name or "Business Client"),
                "business_type": b_profile.business_type if b_profile else "RESTAURANT",
                "contact_person": b_profile.contact_person if b_profile else o.customer.name,
                "contact_phone": b_profile.phone if b_profile else o.customer.phone,
                "delivery_address": o.customer_delivery_address or (b_profile.delivery_address if b_profile else "Solapur"),
                "requested_delivery_date": str(o.requested_delivery_date) if o.requested_delivery_date else None,
                "requested_delivery_window": o.requested_delivery_window,
                "customer_note": o.customer_note,
                "items_count": len(o.items),
                "items_summary": [
                    {
                        "product_name": it.product_name,
                        "quantity": str(it.quantity),
                        "unit": it.unit,
                        "unit_price": str(it.unit_price),
                        "subtotal": str(it.subtotal),
                    }
                    for it in o.items
                ],
                "created_at": o.created_at.isoformat(),
            })
        return results

    @staticmethod
    def get_seller_bulk_order(db: Session, seller_id: int, order_id: int) -> Dict[str, Any]:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.seller_id != seller_id:
            raise ForbiddenException("Bulk order not assigned to this seller")

        b_profile = order.business or db.query(BusinessProfile).filter(BusinessProfile.user_id == order.customer_id).first()

        items_detail = []
        for it in order.items:
            inv = db.query(Inventory).filter(Inventory.seller_product_id == it.seller_product_id).first() if it.seller_product_id else None
            sp = db.query(SellerProduct).filter(SellerProduct.id == it.seller_product_id).first() if it.seller_product_id else None

            stock_total = inv.quantity if inv else (sp.stock_quantity if sp else Decimal("0.000"))
            stock_reserved = inv.reserved_quantity if inv else Decimal("0.000")
            stock_available = max(Decimal("0.000"), stock_total - stock_reserved)

            items_detail.append({
                "id": it.id,
                "seller_product_id": it.seller_product_id,
                "product_name": it.product_name,
                "unit": it.unit,
                "quantity": str(it.quantity),
                "unit_price": str(it.unit_price),
                "subtotal": str(it.subtotal),
                "quoted_unit_price": str(it.quoted_unit_price) if it.quoted_unit_price is not None else None,
                "quoted_subtotal": str(it.quoted_subtotal) if it.quoted_subtotal is not None else None,
                "seller_notes": it.seller_notes,
                "available_stock": str(stock_available),
                "is_sufficient_stock": stock_available >= it.quantity,
            })

        history_items = [
            {
                "status": h.new_status,
                "note": h.note,
                "changed_at": h.created_at.isoformat(),
            }
            for h in order.status_history
        ]

        return {
            "id": order.id,
            "order_number": order.order_number,
            "order_type": order.order_type,
            "status": order.status,
            "quote_status": order.quote_status,
            "quote_total": str(order.quote_total) if order.quote_total else None,
            "quote_delivery_fee": str(order.quote_delivery_fee) if order.quote_delivery_fee else None,
            "quote_notes": order.quote_notes,
            "quote_sent_at": order.quote_sent_at.isoformat() if order.quote_sent_at else None,
            "quote_expires_at": order.quote_expires_at.isoformat() if order.quote_expires_at else None,
            "subtotal": str(order.subtotal),
            "delivery_charge": str(order.delivery_charge),
            "total_amount": str(order.total_amount),
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "requested_delivery_date": str(order.requested_delivery_date) if order.requested_delivery_date else None,
            "requested_delivery_window": order.requested_delivery_window,
            "customer_note": order.customer_note,
            "customer": {
                "id": order.customer_id,
                "name": order.customer.name,
                "phone": order.customer.phone,
                "email": order.customer.email,
            },
            "business": {
                "id": b_profile.id if b_profile else None,
                "business_name": b_profile.business_name if b_profile else order.customer.name,
                "business_type": b_profile.business_type if b_profile else "RESTAURANT",
                "contact_person": b_profile.contact_person if b_profile else order.customer.name,
                "phone": b_profile.phone if b_profile else order.customer.phone,
                "email": b_profile.email if b_profile else order.customer.email,
                "delivery_address": order.customer_delivery_address or (b_profile.delivery_address if b_profile else "Solapur"),
                "gstin": b_profile.gstin if b_profile else None,
            },
            "items": items_detail,
            "history": history_items,
            "created_at": order.created_at.isoformat(),
        }

    # -----------------------------------------------------------------------
    # Customer Actions: Accept or Reject Quote (Idempotent)
    # -----------------------------------------------------------------------

    @staticmethod
    def customer_handle_quote(
        db: Session, customer_id: int, order_id: int, action: str, idempotency_key: Optional[str] = None
    ) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or order.customer_id != customer_id:
            raise ForbiddenException("Bulk order not owned by this customer")

        if action == "ACCEPT":
            if order.quote_status == "ACCEPTED" and order.status == "CONFIRMED":
                return order  # Idempotent response

            if order.status != "QUOTE_SENT":
                raise BadRequestException(f"Order status is '{order.status}', cannot accept quote")

            # Validate expiration
            if order.quote_expires_at and order.quote_expires_at < datetime.datetime.utcnow():
                order.quote_status = "EXPIRED"
                db.commit()
                raise BadRequestException("Quote has expired. Please request a new quote.")

            # Validate & Reserve Inventory
            for item in order.items:
                if not item.seller_product_id:
                    continue
                inv = (
                    db.query(Inventory)
                    .filter(Inventory.seller_product_id == item.seller_product_id)
                    .with_for_update()
                    .first()
                )
                if inv:
                    available = inv.quantity - inv.reserved_quantity
                    if available < item.quantity:
                        raise BadRequestException(
                            f"Stock changed. Insufficient quantity for {item.product_name}. Available: {available}"
                        )
                    inv.reserved_quantity += item.quantity
                    db.add(
                        InventoryTransaction(
                            inventory_id=inv.id,
                            transaction_type="RESERVE",
                            quantity=item.quantity,
                            reference_id=str(order.id),
                            notes=f"Bulk quote accepted #{order.order_number}",
                        )
                    )

            # Apply quoted unit prices to primary order
            new_subtotal = Decimal("0.00")
            for item in order.items:
                if item.quoted_unit_price is not None:
                    item.unit_price = item.quoted_unit_price
                    item.subtotal = item.quoted_subtotal or (item.unit_price * item.quantity)
                new_subtotal += item.subtotal

            order.subtotal = new_subtotal
            if order.quote_delivery_fee:
                order.delivery_charge = order.quote_delivery_fee
            order.total_amount = order.subtotal + order.delivery_charge
            order.quote_status = "ACCEPTED"
            order.status = "CONFIRMED"
            order.accepted_at = func.now()

            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    old_status="QUOTE_SENT",
                    new_status="CONFIRMED",
                    changed_by=customer_id,
                    note="Customer accepted quote. Bulk order confirmed.",
                )
            )

            # Generate Invoice
            BulkOrderService._generate_b2b_invoice(db, order)

            # Notify seller
            if order.seller_id:
                db.add(
                    Notification(
                        user_id=order.seller_id,
                        title="🎉 Bulk Quote Accepted!",
                        message=f"{order.customer.name} accepted your quote for Order #{order.order_number}. Total: ₹{order.total_amount:.0f}.",
                        type="QUOTE_ACCEPTED",
                        data={"order_id": order.id, "order_number": order.order_number},
                    )
                )

        elif action == "REJECT":
            order.quote_status = "REJECTED"
            order.status = "CANCELLED"
            order.cancelled_at = func.now()

            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    old_status="QUOTE_SENT",
                    new_status="CANCELLED",
                    changed_by=customer_id,
                    note="Customer rejected quote.",
                )
            )

            if order.seller_id:
                db.add(
                    Notification(
                        user_id=order.seller_id,
                        title="❌ Bulk Quote Declined",
                        message=f"Quote for Order #{order.order_number} was declined by customer.",
                        type="QUOTE_REJECTED",
                        data={"order_id": order.id, "order_number": order.order_number},
                    )
                )
        else:
            raise BadRequestException("Action must be ACCEPT or REJECT")

        db.commit()
        db.refresh(order)
        return order

    # -----------------------------------------------------------------------
    # Invoice Generation (Private Helper)
    # -----------------------------------------------------------------------

    @staticmethod
    def _generate_b2b_invoice(db: Session, order: Order) -> B2BInvoice:
        existing = db.query(B2BInvoice).filter(B2BInvoice.order_id == order.id).first()
        if existing:
            return existing

        b_profile = order.business or BulkOrderService.get_business_profile(db, order.customer_id)
        seller = order.seller
        seller_profile = getattr(seller, "seller_profile", None) if seller else None

        inv_num = f"INV-B2B-{order.order_number}"

        invoice = B2BInvoice(
            invoice_number=inv_num,
            order_id=order.id,
            business_id=b_profile.id if b_profile else None,
            business_name=b_profile.business_name if b_profile else order.customer.name or "Business",
            business_address=b_profile.delivery_address if b_profile else order.customer_delivery_address or "Solapur",
            gstin=b_profile.gstin if b_profile else None,
            seller_id=order.seller_id,
            seller_name=seller_profile.business_name if seller_profile else "Solapur Mandi Producer",
            subtotal=order.subtotal,
            discount_amount=order.discount_amount,
            delivery_fee=order.delivery_charge,
            total_amount=order.total_amount,
            payment_status=order.payment_status,
            payment_method=order.payment_method,
        )
        db.add(invoice)
        db.flush()
        return invoice

    # -----------------------------------------------------------------------
    # Saved Shopping Lists
    # -----------------------------------------------------------------------

    @staticmethod
    def list_saved_lists(db: Session, user_id: int) -> List[SavedShoppingList]:
        return (
            db.query(SavedShoppingList)
            .filter(SavedShoppingList.user_id == user_id)
            .order_by(SavedShoppingList.created_at.desc())
            .all()
        )

    @staticmethod
    def create_saved_list(db: Session, user_id: int, data: SavedShoppingListCreate) -> SavedShoppingList:
        sl = SavedShoppingList(user_id=user_id, name=data.name, description=data.description)
        db.add(sl)
        db.flush()

        for it in data.items:
            sli = SavedShoppingListItem(
                list_id=sl.id,
                product_id=it.product_id,
                seller_product_id=it.seller_product_id,
                quantity=it.quantity,
                unit=it.unit or "KG",
            )
            db.add(sli)

        db.commit()
        db.refresh(sl)
        return sl

    @staticmethod
    def add_saved_list_to_bulk_cart(db: Session, user_id: int, list_id: int) -> int:
        sl = db.query(SavedShoppingList).filter(SavedShoppingList.id == list_id, SavedShoppingList.user_id == user_id).first()
        if not sl:
            raise NotFoundException("Saved list not found")

        added_count = 0
        for item in sl.items:
            sp_id = item.seller_product_id
            if not sp_id:
                # Find best matching seller product for product_id
                sp = (
                    db.query(SellerProduct)
                    .filter(SellerProduct.product_id == item.product_id, SellerProduct.is_available == True)
                    .order_by(SellerProduct.price.asc())
                    .first()
                )
                if sp:
                    sp_id = sp.id

            if sp_id:
                BulkOrderService.add_to_bulk_cart(
                    db,
                    user_id,
                    BulkCartItemCreate(
                        seller_product_id=sp_id,
                        quantity=item.quantity,
                        unit=item.unit,
                        notes=f"From list: {sl.name}",
                    ),
                )
                added_count += 1

        return added_count

    @staticmethod
    def delete_saved_list(db: Session, user_id: int, list_id: int) -> None:
        sl = db.query(SavedShoppingList).filter(SavedShoppingList.id == list_id, SavedShoppingList.user_id == user_id).first()
        if sl:
            db.delete(sl)
            db.commit()

    # -----------------------------------------------------------------------
    # Recurring Bulk Orders
    # -----------------------------------------------------------------------

    @staticmethod
    def list_recurring_orders(db: Session, user_id: int) -> List[RecurringBulkOrder]:
        return (
            db.query(RecurringBulkOrder)
            .filter(RecurringBulkOrder.user_id == user_id)
            .order_by(RecurringBulkOrder.created_at.desc())
            .all()
        )

    @staticmethod
    def create_recurring_order(db: Session, user_id: int, data: RecurringBulkOrderCreate) -> RecurringBulkOrder:
        b_profile = BulkOrderService.get_business_profile(db, user_id)
        if not b_profile:
            raise BadRequestException("Business profile required before scheduling recurring orders")

        ro = RecurringBulkOrder(
            user_id=user_id,
            business_id=b_profile.id,
            title=data.title,
            frequency=data.frequency,
            delivery_time_window=data.delivery_time_window,
            address_id=data.address_id,
            seller_id=data.seller_id,
            next_run_date=data.next_run_date,
            special_instructions=data.special_instructions,
            is_active=True,
        )
        db.add(ro)
        db.flush()

        for it in data.items:
            roi = RecurringBulkOrderItem(
                recurring_order_id=ro.id,
                seller_product_id=it.seller_product_id,
                quantity=it.quantity,
                unit=it.unit or "KG",
            )
            db.add(roi)

        db.commit()
        db.refresh(ro)
        return ro

    @staticmethod
    def toggle_recurring_order(db: Session, user_id: int, recurring_id: int) -> RecurringBulkOrder:
        ro = (
            db.query(RecurringBulkOrder)
            .filter(RecurringBulkOrder.id == recurring_id, RecurringBulkOrder.user_id == user_id)
            .first()
        )
        if not ro:
            raise NotFoundException("Recurring order not found")

        ro.is_active = not ro.is_active
        db.commit()
        db.refresh(ro)
        return ro

    # -----------------------------------------------------------------------
    # Event Grocery Estimator (Authentic Indian Catering Metrics)
    # -----------------------------------------------------------------------

    @staticmethod
    def estimate_event_groceries(db: Session, req: EventGroceryEstimateRequest) -> EventGroceryEstimateResponse:
        """
        Estimates wholesale requirements per person per day using standard Indian catering benchmarks.
        Correlates against actual PostgreSQL products and active seller prices.
        """
        people = req.people_count
        meals = req.meals_per_day
        days = req.days_count

        # Benchmark ratios per person per meal (kg)
        ratios = {
            "potato": Decimal("0.090"),
            "onion": Decimal("0.080"),
            "tomato": Decimal("0.070"),
            "spinach": Decimal("0.040"),
            "banana": Decimal("0.100"),
        }

        total_multiplier = Decimal(str(meals * days))

        products = db.query(Product).filter(Product.is_active == True).all()
        suggested: List[EventGroceryItem] = []
        total_budget = Decimal("0.00")

        for p in products:
            p_lower = p.name.lower()
            matched_key = None
            for k in ratios.keys():
                if k in p_lower:
                    matched_key = k
                    break

            if matched_key:
                kg_needed = (ratios[matched_key] * Decimal(str(people)) * total_multiplier).quantize(Decimal("1.0"))
                sp = (
                    db.query(SellerProduct)
                    .filter(SellerProduct.product_id == p.id, SellerProduct.is_available == True)
                    .order_by(SellerProduct.price.asc())
                    .first()
                )
                unit_price = sp.price if sp else p.min_price or Decimal("35.00")
                item_cost = kg_needed * Decimal(str(unit_price))
                total_budget += item_cost

                suggested.append(
                    EventGroceryItem(
                        product_id=p.id,
                        product_name=p.name,
                        category=p.category.name if p.category else "Vegetables",
                        estimated_quantity=kg_needed,
                        unit=p.unit or "KG",
                        approximate_price=Decimal(str(unit_price)),
                        available_in_stock=sp.is_available if sp else False,
                    )
                )

        return EventGroceryEstimateResponse(
            event_type=req.event_type,
            people_count=req.people_count,
            total_estimated_budget=total_budget,
            suggested_items=suggested,
        )

    # -----------------------------------------------------------------------
    # Business Analytics (Real DB Metrics)
    # -----------------------------------------------------------------------

    @staticmethod
    def get_b2b_analytics(db: Session, user_id: int) -> B2BAnalyticsRead:
        orders = (
            db.query(Order)
            .filter(Order.customer_id == user_id, Order.order_type == "BULK")
            .all()
        )

        total_orders = len(orders)
        active_orders = len([o for o in orders if o.status in ("BULK_REQUESTED", "CONFIRMED", "ACCEPTED", "PACKING", "READY", "OUT_FOR_DELIVERY")])
        pending_quotes = len([o for o in orders if o.quote_status in ("PENDING", "SENT")])

        # Monthly spend (last 30 days)
        thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        recent_orders = [o for o in orders if o.created_at >= thirty_days_ago and o.status in ("CONFIRMED", "DELIVERED")]
        monthly_spend = sum((o.total_amount for o in recent_orders), Decimal("0.00"))

        avg_value = Decimal("0.00")
        confirmed_orders = [o for o in orders if o.status in ("CONFIRMED", "DELIVERED")]
        if confirmed_orders:
            avg_value = sum((o.total_amount for o in confirmed_orders), Decimal("0.00")) / Decimal(str(len(confirmed_orders)))

        # Top products aggregation
        product_spend_map: Dict[str, Dict[str, Any]] = {}
        for o in confirmed_orders:
            for it in o.items:
                if it.product_name not in product_spend_map:
                    product_spend_map[it.product_name] = {
                        "name": it.product_name,
                        "quantity": Decimal("0.000"),
                        "unit": it.unit,
                        "spend": Decimal("0.00"),
                    }
                product_spend_map[it.product_name]["quantity"] += it.quantity
                product_spend_map[it.product_name]["spend"] += it.subtotal

        top_products = [
            TopProductMetric(
                product_name=v["name"],
                total_quantity=v["quantity"],
                unit=v["unit"],
                total_spend=v["spend"],
            )
            for v in sorted(product_spend_map.values(), key=lambda x: x["spend"], reverse=True)[:5]
        ]

        freq = "N/A"
        if len(confirmed_orders) >= 4:
            freq = "Weekly"
        elif len(confirmed_orders) >= 1:
            freq = "Monthly"

        return B2BAnalyticsRead(
            monthly_spend=monthly_spend,
            total_orders_count=total_orders,
            active_orders_count=active_orders,
            pending_quotes_count=pending_quotes,
            average_order_value=avg_value,
            top_products=top_products,
            top_sellers=[],
            purchase_frequency=freq,
        )
