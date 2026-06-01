import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from qdrant_client.http import models as qmodels

from app.api.deps import SessionDep
from app.core.config import settings
from app.core.qdrant import qdrant_client
from app.models.frame import ExtractionFrame, ExtractionFrameRead

router = APIRouter()


class FrameVectorPayload(BaseModel):
    extraction_id: int
    timestamp_seconds: float
    detected_channeling: bool = False
    detected_uneven_flow: bool = False
    crema_quality_rating: float = 0.0
    vector: List[float] = Field(..., description="512-dimensional visual embedding vector")
    notes: Optional[str] = None


class SearchResult(BaseModel):
    score: float
    frame: ExtractionFrameRead


@router.post("/index-frame", response_model=ExtractionFrameRead, status_code=status.HTTP_201_CREATED)
def index_extraction_frame(
    payload: FrameVectorPayload,
    session: Session = Depends(SessionDep),
) -> ExtractionFrame:
    """Index an extraction video frame's embedding in Qdrant and save metadata in PostgreSQL."""
    if len(payload.vector) != 512:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Visual embedding vector must be exactly 512 dimensions. Got {len(payload.vector)}.",
        )

    # Generate a unique point ID for Qdrant (must be a valid UUID or uint64)
    point_id = str(uuid.uuid4())

    # 1. Store visual embedding in Qdrant
    try:
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[
                qmodels.PointStruct(
                    id=point_id,
                    vector=payload.vector,
                    payload={
                        "extraction_id": payload.extraction_id,
                        "timestamp_seconds": payload.timestamp_seconds,
                        "detected_channeling": payload.detected_channeling,
                        "detected_uneven_flow": payload.detected_uneven_flow,
                        "crema_quality_rating": payload.crema_quality_rating,
                    },
                )
            ],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert embedding in Qdrant vector database: {str(e)}",
        )

    # 2. Store metadata in PostgreSQL
    db_frame = ExtractionFrame(
        extraction_id=payload.extraction_id,
        timestamp_seconds=payload.timestamp_seconds,
        qdrant_point_id=point_id,
        detected_channeling=payload.detected_channeling,
        detected_uneven_flow=payload.detected_uneven_flow,
        crema_quality_rating=payload.crema_quality_rating,
        notes=payload.notes,
    )
    session.add(db_frame)
    session.commit()
    session.refresh(db_frame)
    return db_frame


@router.post("/search-similar", response_model=List[SearchResult])
def search_similar_frames(
    query_vector: List[float] = Field(..., description="512-dimensional query visual embedding vector"),
    limit: int = 5,
    session: Session = Depends(SessionDep),
) -> List[SearchResult]:
    """Perform a semantic vector search in Qdrant for visually similar extraction runs or anomalies."""
    if len(query_vector) != 512:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Query vector must be exactly 512 dimensions. Got {len(query_vector)}.",
        )

    # 1. Search in Qdrant
    try:
        search_results = qdrant_client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=query_vector,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Qdrant vector search failed: {str(e)}",
        )

    # 2. Correlate with PostgreSQL metadata records
    results = []
    for hit in search_results:
        # Retrieve the metadata record using the mapped qdrant_point_id
        statement = select(ExtractionFrame).where(ExtractionFrame.qdrant_point_id == str(hit.id))
        frame_record = session.exec(statement).first()
        if frame_record:
            results.append(
                SearchResult(
                    score=hit.score,
                    frame=frame_record,
                )
            )

    return results
