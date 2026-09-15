import datetime
import random
from decimal import Decimal, ROUND_HALF_UP


def generate_order_number() -> str:
    """Generates a human-friendly unique order number: VEG-YYYYMMDD-XXXX."""
    date_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
    random_str = f"{random.randint(1000, 9999)}"
    return f"VEG-{date_str}-{random_str}"


def round_currency(amount: Decimal | float | int) -> Decimal:
    """Rounds amount to 2 decimal places using standard financial rounding."""
    return Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
