from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.extraction import Extraction


class BeanBase(SQLModel):
    name: str = Field(index=True)
    roaster: str = Field(index=True)
    roast_level: str  # Light, Medium, Dark, etc.
    origin: Optional[str] = None
    roast_date: Optional[date] = None
    notes: Optional[str] = None


class Bean(BeanBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Relationships
    extractions: List["Extraction"] = Relationship(back_populates="bean")


class BeanCreate(BeanBase):
    pass


class BeanRead(BeanBase):
    id: int
