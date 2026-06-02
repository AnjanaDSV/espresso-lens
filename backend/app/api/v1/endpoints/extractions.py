import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from app.api.deps import SessionDep
from app.models.extraction import Extraction, ExtractionCreate, ExtractionRead
from app.models.bean import Bean
from app.models.frame import ExtractionFrame, ExtractionFrameCreate, ExtractionFrameRead

router = APIRouter()


@router.post("/", response_model=ExtractionRead, status_code=status.HTTP_201_CREATED)
def create_extraction(
    extraction_in: ExtractionCreate, session: Session = Depends(SessionDep)
) -> Extraction:
    """Log a new espresso extraction run, linking it to a coffee bean profile."""
    # Ensure the bean exists
    bean = session.get(Bean, extraction_in.bean_id)
    if not bean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Associated bean profile with ID {extraction_in.bean_id} does not exist",
        )
        
    db_extraction = Extraction.model_validate(extraction_in)
    session.add(db_extraction)
    session.commit()
    session.refresh(db_extraction)
    return db_extraction


@router.get("/", response_model=List[ExtractionRead])
def read_extractions(
    skip: int = 0, limit: int = 100, session: Session = Depends(SessionDep)
) -> List[Extraction]:
    """Retrieve all logged extraction runs."""
    statement = select(Extraction).offset(skip).limit(limit)
    extractions = session.exec(statement).all()
    return list(extractions)


@router.get("/{extraction_id}", response_model=ExtractionRead)
def read_extraction(
    extraction_id: int, session: Session = Depends(SessionDep)
) -> Extraction:
    """Retrieve details for a specific extraction run."""
    db_extraction = session.get(Extraction, extraction_id)
    if not db_extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction run with ID {extraction_id} not found",
        )
    return db_extraction


@router.post("/{extraction_id}/frames", response_model=ExtractionFrameRead, status_code=status.HTTP_201_CREATED)
def add_extraction_frame(
    extraction_id: int,
    frame_in: ExtractionFrameCreate,
    session: Session = Depends(SessionDep),
) -> ExtractionFrame:
    """Log an analyzed video frame with vision results for a specific extraction run."""
    # Ensure the extraction exists
    extraction = session.get(Extraction, extraction_id)
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction run with ID {extraction_id} not found",
        )
        
    db_frame = ExtractionFrame.model_validate(frame_in)
    db_frame.extraction_id = extraction_id
    session.add(db_frame)
    session.commit()
    session.refresh(db_frame)
    return db_frame


@router.get("/{extraction_id}/frames", response_model=List[ExtractionFrameRead])
def get_extraction_frames(
    extraction_id: int, session: Session = Depends(SessionDep)
) -> List[ExtractionFrame]:
    """Retrieve all analyzed video frames linked to a specific extraction run."""
    statement = select(ExtractionFrame).where(ExtractionFrame.extraction_id == extraction_id)
    frames = session.exec(statement).all()
    return list(frames)


@router.post("/{extraction_id}/process-video", response_model=List[ExtractionFrameRead])
def process_extraction_video(
    extraction_id: int,
    video_path: str,
    sample_rate_seconds: float = 1.0,
    session: Session = Depends(SessionDep),
) -> List[ExtractionFrame]:
    """Trigger the OpenCV visual processor on an uploaded or locally stored video file path.

    This splits the video frame-by-frame, extracts visual features, indexes the 512-dimension
    embeddings inside Qdrant, and populates the PostgreSQL database with frame diagnostics.
    """
    from app.services.video_processor import process_video_file
    try:
        frames = process_video_file(
            extraction_id=extraction_id,
            video_path=video_path,
            session=session,
            sample_rate_seconds=sample_rate_seconds
        )
        return frames
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video frame analysis processing failed: {str(e)}",
        )


_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("/{extraction_id}/upload-file", response_model=List[ExtractionFrameRead])
def upload_extraction_file(
    extraction_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(SessionDep),
) -> List[ExtractionFrame]:
    """Upload an extraction video or static image file.

    Images are decoded in-memory — no temp file is written. The raw bytes are
    passed directly to the embedding pipeline, which generates a 512-dimension
    vector, upserts it to Qdrant, and saves the frame log to PostgreSQL.

    Videos are saved to a temporary path and processed frame-by-frame via OpenCV.
    """
    content_type = (file.content_type or "").lower()
    ext = os.path.splitext(file.filename or "")[1].lower()
    is_image = content_type in _IMAGE_CONTENT_TYPES or ext in _IMAGE_EXTENSIONS

    if is_image:
        try:
            image_bytes = file.file.read()
            from app.services.video_processor import process_image_bytes
            return process_image_bytes(
                image_bytes=image_bytes,
                session=session,
                filename=file.filename or "upload",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image embedding pipeline failed: {str(e)}",
            )

    # --- Video path: save to temp file, run OpenCV frame-splitting loop ---
    temp_dir = os.path.join(os.path.dirname(__file__), "../../../../temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from app.services.video_processor import process_video_file
        return process_video_file(
            extraction_id=extraction_id,
            video_path=file_path,
            session=session,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video frame analysis pipeline failed: {str(e)}",
        )
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
