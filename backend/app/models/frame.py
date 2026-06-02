from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.extraction import Extraction


class ExtractionFrameBase(SQLModel):
    extraction_id: int = Field(foreign_key="extraction.id", index=True)
    timestamp_seconds: float
    qdrant_point_id: str = Field(index=True)  # Links to vector DB point UUID
    
    # Detected extraction metrics from computer vision analysis
    detected_channeling: bool = Field(default=False)
    detected_uneven_flow: bool = Field(default=False)
    crema_quality_rating: float = Field(default=0.0)

    # Enhanced detection fields (added via migrate_db on startup)
    channeling_severity: str = Field(default="None")      # "None" | "Mild" | "Detected"
    flow_status: str = Field(default="Balanced")          # "Balanced" | "Uneven"
    detection_confidence: float = Field(default=0.5)      # 0.0–1.0

    notes: Optional[str] = None


class ExtractionFrame(ExtractionFrameBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Relationships
    extraction: "Extraction" = Relationship(back_populates="frames")


class ExtractionFrameCreate(ExtractionFrameBase):
    pass


class ExtractionFrameRead(ExtractionFrameBase):
    id: int
