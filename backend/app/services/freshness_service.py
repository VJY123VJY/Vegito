import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


from app.schemas.freshness import FreshnessInfo, FreshnessTimelineStep


class FreshnessService:
    """
    Centralized Freshness Engine for Vegito produce.
    Backend is the single source of truth.
    Sellers provide factual dates/times and storage conditions,
    while this engine computes the scientific freshness score and lifecycle timeline.
    """

    # Configurable default shelf lives (in days) by produce type / category
    DEFAULT_SHELF_LIFE_DAYS: Dict[str, int] = {
        "leafy": 3,         # Spinach, Coriander, Fenugreek / Methi
        "leafy vegetables": 3,
        "vegetable": 7,     # Tomato, Capsicum, Cucumber, Gourds, Cabbage, Cauliflower
        "vegetables": 7,
        "fruit": 6,         # Banana, Berries, Grapes
        "fruits": 6,
        "hardy_fruit": 14,  # Apple, Orange, Pomegranate
        "root": 21,         # Potato, Onion, Garlic, Radish, Beetroot, Carrot
        "root vegetables": 21,
        "default": 7,
    }

    # Configurable storage condition multipliers (decelerates or accelerates aging)
    STORAGE_CONDITION_MODIFIERS: Dict[str, float] = {
        "cold storage": 1.4,
        "cold_storage": 1.4,
        "refrigerated": 1.4,
        "hydro_cooled": 1.25,
        "cool & dry ventilated": 1.15,
        "cool dry place": 1.15,
        "naturally ventilated": 1.05,
        "farm fresh shaded": 1.05,
        "ambient": 1.0,
        "ambient / room temperature": 1.0,
        "open market": 0.9,
    }

    # Configurable Freshness Thresholds
    THRESHOLDS = [
        {"min": 90, "max": 100, "status": "Very Fresh", "badge": "🟢 Very Fresh", "color": "#16835b"},
        {"min": 75, "max": 89,  "status": "Fresh",      "badge": "🟢 Fresh",      "color": "#10b981"},
        {"min": 50, "max": 74,  "status": "Good",       "badge": "🟡 Good",       "color": "#eab308"},
        {"min": 25, "max": 49,  "status": "Aging",      "badge": "🟠 Aging",      "color": "#f97316"},
        {"min": 0,  "max": 24,  "status": "Low Freshness", "badge": "🔴 Low Freshness", "color": "#ef4444"},
    ]

    @classmethod
    def get_shelf_life(cls, product_name: str = "", category_name: str = "", product_shelf_life: Optional[int] = None) -> int:
        if product_shelf_life and product_shelf_life > 0:
            return product_shelf_life

        name_lower = product_name.lower()
        cat_lower = category_name.lower()

        # Check by specific product heuristics
        if any(w in name_lower for w in ["potato", "onion", "garlic", "beetroot", "radish"]):
            return cls.DEFAULT_SHELF_LIFE_DAYS["root"]
        if any(w in name_lower for w in ["spinach", "palak", "coriander", "kothmir", "methi", "fenugreek", "leaf"]):
            return cls.DEFAULT_SHELF_LIFE_DAYS["leafy"]
        if any(w in name_lower for w in ["apple", "orange", "pomegranate"]):
            return cls.DEFAULT_SHELF_LIFE_DAYS["hardy_fruit"]
        if any(w in name_lower for w in ["banana", "mango", "grape"]):
            return cls.DEFAULT_SHELF_LIFE_DAYS["fruit"]

        # Check category name
        if "leafy" in cat_lower:
            return cls.DEFAULT_SHELF_LIFE_DAYS["leafy"]
        if "root" in cat_lower:
            return cls.DEFAULT_SHELF_LIFE_DAYS["root"]
        if "fruit" in cat_lower:
            return cls.DEFAULT_SHELF_LIFE_DAYS["fruit"]
        if "vegetable" in cat_lower:
            return cls.DEFAULT_SHELF_LIFE_DAYS["vegetable"]

        return cls.DEFAULT_SHELF_LIFE_DAYS["default"]

    @classmethod
    def get_storage_multiplier(cls, storage_condition: Optional[str]) -> float:
        if not storage_condition:
            return 1.0
        clean = storage_condition.strip().lower()
        return cls.STORAGE_CONDITION_MODIFIERS.get(clean, 1.0)

    @classmethod
    def calculate(
        cls,
        seller_product: Any,
        product: Any = None,
        now: Optional[datetime.datetime] = None,
    ) -> FreshnessInfo:
        if now is None:
            now = datetime.datetime.now(datetime.timezone.utc)
        elif now.tzinfo is None:
            now = now.replace(tzinfo=datetime.timezone.utc)

        prod = product or getattr(seller_product, "product", None)
        prod_name = getattr(prod, "name", "") if prod else ""
        cat_name = getattr(getattr(prod, "category", None), "name", "") if prod else ""
        prod_shelf_life = getattr(prod, "shelf_life_days", None) if prod else None

        shelf_life_days = cls.get_shelf_life(prod_name, cat_name, prod_shelf_life)
        storage_multiplier = cls.get_storage_multiplier(getattr(seller_product, "storage_condition", None))
        total_shelf_hours = max(24.0, shelf_life_days * 24.0 * storage_multiplier)

        # 1. Harvest timestamp
        harvest_date = getattr(seller_product, "harvest_date", None)
        harvest_time = getattr(seller_product, "harvest_time", None)
        harvest_dt: Optional[datetime.datetime] = None
        if harvest_date:
            h_time = harvest_time or datetime.time(6, 0)
            harvest_dt = datetime.datetime.combine(harvest_date, h_time).replace(tzinfo=datetime.timezone.utc)

        # 2. Added timestamp
        added_date = getattr(seller_product, "added_date", None)
        added_time = getattr(seller_product, "added_time", None)
        added_dt: Optional[datetime.datetime] = None
        if added_date:
            a_time = added_time or datetime.time(8, 30)
            added_dt = datetime.datetime.combine(added_date, a_time).replace(tzinfo=datetime.timezone.utc)
        else:
            # Fallback to created_at
            created_at = getattr(seller_product, "created_at", None)
            if created_at:
                if created_at.tzinfo is None:
                    added_dt = created_at.replace(tzinfo=datetime.timezone.utc)
                else:
                    added_dt = created_at
            else:
                added_dt = now

        # Reference start of aging: harvest if available, else added
        ref_dt = harvest_dt if harvest_dt is not None else added_dt
        elapsed_seconds = (now - ref_dt).total_seconds()
        elapsed_hours = max(0.0, elapsed_seconds / 3600.0)

        # Freshness formula:
        # Non-linear decay representing initial slow respiration followed by degradation
        if elapsed_hours <= 0:
            score = 100
        elif elapsed_hours >= total_shelf_hours:
            score = max(5, int(15 * (1 - (elapsed_hours - total_shelf_hours) / (total_shelf_hours * 2))))
        else:
            ratio = elapsed_hours / total_shelf_hours
            score = int(round(100.0 * (1.0 - (ratio ** 0.85))))
            score = max(10, min(100, score))

        # Status match
        matched_threshold = cls.THRESHOLDS[-1]
        for t in cls.THRESHOLDS:
            if t["min"] <= score <= t["max"]:
                matched_threshold = t
                break

        # Timeline generation using authentic backend timestamps
        timeline: List[FreshnessTimelineStep] = []

        if harvest_dt:
            timeline.append(
                FreshnessTimelineStep(
                    key="harvested",
                    title="Harvested",
                    icon="🌱",
                    timestamp=harvest_dt.isoformat(),
                    formatted_date=harvest_dt.strftime("%d %b %Y"),
                    formatted_time=harvest_dt.strftime("%I:%M %p"),
                    display_text=f"{harvest_dt.strftime('%d %b')} · {harvest_dt.strftime('%I:%M %p')}",
                    is_completed=True,
                )
            )

        if added_dt:
            timeline.append(
                FreshnessTimelineStep(
                    key="added_by_seller",
                    title="Added by Seller",
                    icon="📦",
                    timestamp=added_dt.isoformat(),
                    formatted_date=added_dt.strftime("%d %b %Y"),
                    formatted_time=added_dt.strftime("%I:%M %p"),
                    display_text=f"{added_dt.strftime('%d %b')} · {added_dt.strftime('%I:%M %p')}",
                    is_completed=True,
                )
            )

        created_at = getattr(seller_product, "created_at", None)
        if created_at:
            if created_at.tzinfo is None:
                c_dt = created_at.replace(tzinfo=datetime.timezone.utc)
            else:
                c_dt = created_at
            timeline.append(
                FreshnessTimelineStep(
                    key="available_vegito",
                    title="Available on Vegito",
                    icon="🛒",
                    timestamp=c_dt.isoformat(),
                    formatted_date=c_dt.strftime("%d %b %Y"),
                    formatted_time=c_dt.strftime("%I:%M %p"),
                    display_text=f"{c_dt.strftime('%d %b')} · {c_dt.strftime('%I:%M %p')}",
                    is_completed=True,
                )
            )

        timeline.append(
            FreshnessTimelineStep(
                key="current_freshness",
                title="Current Freshness",
                icon=matched_threshold["badge"].split()[0],
                timestamp=now.isoformat(),
                formatted_date=now.strftime("%d %b %Y"),
                formatted_time=now.strftime("%I:%M %p"),
                display_text=f"{score}% · {matched_threshold['status']}",
                is_completed=True,
            )
        )

        return FreshnessInfo(
            score=score,
            status=matched_threshold["status"],
            badge=matched_threshold["badge"],
            color=matched_threshold["color"],
            shelf_life_days=shelf_life_days,
            added_date=harvest_dt.strftime("%Y-%m-%d") if harvest_date else (added_dt.strftime("%Y-%m-%d") if added_dt else None),
            added_time=added_time.strftime("%H:%M:%S") if added_time else (added_dt.strftime("%I:%M %p") if added_dt else None),
            harvest_date=harvest_date.strftime("%Y-%m-%d") if harvest_date else None,
            harvest_time=harvest_time.strftime("%H:%M:%S") if harvest_time else None,
            storage_condition=getattr(seller_product, "storage_condition", None) or "Naturally Ventilated",
            origin=getattr(seller_product, "origin", None) or "Solapur Local Farm",
            timeline=timeline,
        )
