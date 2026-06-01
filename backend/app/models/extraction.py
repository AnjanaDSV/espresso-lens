from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.bean import Bean
    from app.models.frame import ExtractionFrame


class ExtractionBase(SQLModel):
    bean_id: int = Field(foreign_key="bean.id", index=True)
    dose_in_grams: float
    yield_in_grams: float
    extraction_time_seconds: float
    temperature_fahrenheit: Optional[float] = None
    pressure_profile: Optional[str] = None # e.g. "9 Bar Constant", "Lever profiling"
    overall_rating: Optional[float] = None # 1.0 to 10.0 scale
    video_path: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Extraction(ExtractionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Relationships
    bean: "Bean" = Relationship(back_populates="extractions")
    frames: List["ExtractionFrame"] = Relationship(back_populates="extraction")


class ExtractionCreate(ExtractionBase):
    pass


class ExtractionRead(ExtractionBase):
    id: int
