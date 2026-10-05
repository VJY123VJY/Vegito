import datetime
from typing import Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order


def compute_order_display_number(db: Session, order_id: int) -> str:
    """
    Computes a human-friendly 2-digit display order number (01, 02, 03...)
    for the order based on its sequence within the operational day.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return "01"

    dt = order.placed_at or order.created_at
    if not dt:
        return f"{(order.id % 100):02d}"

    start_of_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    rank = db.query(func.count(Order.id)).filter(
        Order.created_at >= start_of_day,
        Order.created_at < end_of_day,
        Order.id <= order.id,
    ).scalar() or 1

    return f"{rank:02d}"


def batch_compute_order_display_numbers(db: Session, order_ids: List[int]) -> Dict[int, str]:
    """
    Computes 2-digit display numbers for multiple orders in an efficient batch.
    """
    if not order_ids:
        return {}

    orders = db.query(Order.id, Order.created_at, Order.placed_at).filter(Order.id.in_(order_ids)).all()
    results = {}

    # Group by date
    orders_by_date = {}
    for o in orders:
        dt = o.placed_at or o.created_at
        date_key = dt.date() if dt else datetime.date.today()
        orders_by_date.setdefault(date_key, []).append(o.id)

    for d, ids in orders_by_date.items():
        start_of_day = datetime.datetime.combine(d, datetime.time.min)
        end_of_day = datetime.datetime.combine(d, datetime.time.max)

        all_day_orders = (
            db.query(Order.id)
            .filter(Order.created_at >= start_of_day, Order.created_at <= end_of_day)
            .order_by(Order.id.asc())
            .all()
        )

        for rank, row in enumerate(all_day_orders, start=1):
            if row.id in ids:
                results[row.id] = f"{rank:02d}"

    for oid in order_ids:
        if oid not in results:
            results[oid] = f"{(oid % 100):02d}"

    return results
