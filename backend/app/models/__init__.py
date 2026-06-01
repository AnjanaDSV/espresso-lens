from app.models.bean import Bean, BeanCreate, BeanRead
from app.models.extraction import Extraction, ExtractionCreate, ExtractionRead
from app.models.frame import ExtractionFrame, ExtractionFrameCreate, ExtractionFrameRead

# Ensure all models are imported so that metadata registers them for migrations/table creation
__all__ = [
    "Bean",
    "BeanCreate",
    "BeanRead",
    "Extraction",
    "ExtractionCreate",
    "ExtractionRead",
    "ExtractionFrame",
    "ExtractionFrameCreate",
    "ExtractionFrameRead",
]
