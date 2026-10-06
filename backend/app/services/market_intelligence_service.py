import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.market_intelligence import MarketIntelligence
from app.models.product import Product
from app.schemas.market_intelligence import MarketIntelligenceCreate, MarketIntelligenceUpdate, MarketIntelligenceRead
from app.core.exceptions import NotFoundException

class MarketIntelligenceService:
    @staticmethod
    def get_by_product_id(db: Session, product_id: int) -> Optional[MarketIntelligenceRead]:
        item = (
            db.query(MarketIntelligence)
            .options(joinedload(MarketIntelligence.product))
            .filter(MarketIntelligence.product_id == product_id)
            .order_by(MarketIntelligence.timestamp.desc())
            .first()
        )
        if not item:
            return None
        res = MarketIntelligenceRead.model_validate(item)
        if item.product:
            res.product_name = item.product.name
        return res

    @staticmethod
    def list_all(db: Session) -> List[MarketIntelligenceRead]:
        items = (
            db.query(MarketIntelligence)
            .options(joinedload(MarketIntelligence.product))
            .order_by(MarketIntelligence.product_id.asc(), MarketIntelligence.timestamp.desc())
            .all()
        )
        # Deduplicate to latest record per product
        seen = set()
        unique_items = []
        for it in items:
            if it.product_id not in seen:
                seen.add(it.product_id)
                read_obj = MarketIntelligenceRead.model_validate(it)
                if it.product:
                    read_obj.product_name = it.product.name
                unique_items.append(read_obj)
        return unique_items

    @staticmethod
    def upsert(db: Session, payload: MarketIntelligenceCreate) -> MarketIntelligenceRead:
        product = db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise NotFoundException(f"Product {payload.product_id} not found")

        existing = (
            db.query(MarketIntelligence)
            .filter(MarketIntelligence.product_id == payload.product_id)
            .first()
        )

        today = payload.market_date or datetime.date.today()

        if existing:
            existing.previous_price = existing.reference_price
            existing.reference_price = payload.reference_price
            existing.suggested_range_min = payload.suggested_range_min
            existing.suggested_range_max = payload.suggested_range_max
            existing.market = payload.market
            existing.district = payload.district
            existing.state = payload.state
            existing.unit = payload.unit
            existing.trend = payload.trend
            existing.demand_signal = payload.demand_signal
            existing.supply_signal = payload.supply_signal
            existing.source = payload.source
            existing.source_url = payload.source_url
            existing.confidence = payload.confidence
            existing.market_date = today
            existing.timestamp = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            db.refresh(existing)
            res = MarketIntelligenceRead.model_validate(existing)
            res.product_name = product.name
            return res
        else:
            new_item = MarketIntelligence(
                product_id=payload.product_id,
                market=payload.market,
                district=payload.district,
                state=payload.state,
                reference_price=payload.reference_price,
                previous_price=payload.previous_price,
                suggested_range_min=payload.suggested_range_min,
                suggested_range_max=payload.suggested_range_max,
                unit=payload.unit,
                trend=payload.trend,
                demand_signal=payload.demand_signal,
                supply_signal=payload.supply_signal,
                source=payload.source,
                source_url=payload.source_url,
                confidence=payload.confidence,
                market_date=today,
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            res = MarketIntelligenceRead.model_validate(new_item)
            res.product_name = product.name
            return res
