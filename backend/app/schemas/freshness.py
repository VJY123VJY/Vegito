from typing import Optional, List
from pydantic import BaseModel


class FreshnessTimelineStep(BaseModel):
    key: str
    title: str
    icon: str
    timestamp: Optional[str] = None
    formatted_date: Optional[str] = None
    formatted_time: Optional[str] = None
    display_text: str
    is_completed: bool = True


class FreshnessInfo(BaseModel):
    score: int
    status: str
    badge: str
    color: str
    shelf_life_days: int
    added_date: Optional[str] = None
    added_time: Optional[str] = None
    harvest_date: Optional[str] = None
    harvest_time: Optional[str] = None
    storage_condition: Optional[str] = None
    origin: Optional[str] = None
    timeline: List[FreshnessTimelineStep] = []
    disclaimer: str = (
        "Freshness indicator is calculated based on verified harvest, listing timestamps, "
        "and storage metadata. It is not a food safety guarantee."
    )
