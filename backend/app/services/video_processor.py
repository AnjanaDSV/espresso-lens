import os
import uuid
import math
from typing import List, Optional
from sqlmodel import Session, select
from qdrant_client.http import models as qmodels

# OpenCV is used for frame extraction and computer vision features
import cv2

from app.core.config import settings
from app.core.qdrant import qdrant_client
from app.models.bean import Bean
from app.models.extraction import Extraction
from app.models.frame import ExtractionFrame


def generate_mock_vision_embeddings(frame) -> List[float]:
    """Extract features from the image frame and map them deterministically to a 512-dim vector.
    
    This function computes color distribution statistics across different quadrants
    of the portafilter basket image, mixes in low-frequency pixel features, pads
    the resulting array to exactly 512 dimensions, and normalizes it to unit length (L2) 
    so that Cosine Distance queries work perfectly in Qdrant.
    """
    # Resize frame to a small, fast-processing dimension (e.g., 64x64)
    resized = cv2.resize(frame, (64, 64))
    
    # Split the image into 4 quadrants (2x2 grid)
    h, w, c = resized.shape
    q_h, q_w = h // 2, w // 2
    
    quadrants = [
        resized[0:q_h, 0:q_w],     # Top-Left
        resized[0:q_h, q_w:w],     # Top-Right
        resized[q_h:h, 0:q_w],     # Bottom-Left
        resized[q_h:h, q_w:w],     # Bottom-Right
    ]
    
    features = []
    for q in quadrants:
        # Get mean and standard deviation for blue, green, and red channels
        means, stddevs = cv2.meanStdDev(q)
        for val in means.flatten():
            features.append(val / 255.0)
        for val in stddevs.flatten():
            features.append(val / 255.0)
            
    # Add overall brightness mean and standard deviation
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray_mean, gray_std = cv2.meanStdDev(gray)
    features.append(gray_mean[0][0] / 255.0)
    features.append(gray_std[0][0] / 255.0)
    
    # We now have 26 real feature values.
    # To expand this deterministically to 512 dimensions, we use a sine wave generator
    # seeded by the statistical features to create a robust, continuous embedding spectrum.
    vector = []
    num_features = len(features)
    for i in range(512):
        # Blend the features dynamically based on frequency mix
        feat_idx1 = i % num_features
        feat_idx2 = (i + 7) % num_features
        
        mix_factor = math.sin(i * 0.05) * features[feat_idx1] + math.cos(i * 0.1) * features[feat_idx2]
        vector.append(mix_factor)
        
    # L2 Normalization (Unit length: sum of squares = 1)
    sq_sum = sum(x * x for x in vector)
    norm = math.sqrt(sq_sum) if sq_sum > 0 else 1.0
    normalized_vector = [x / norm for x in vector]
    
    return [float(x) for x in normalized_vector]


def analyze_extraction_frame_quality(frame):
    """Analyze a single video frame to detect channeling, uneven flow, and crema quality.
    
    In a full production application, this would run a deep learning model.
    Here, we analyze the RGB channels and standard deviations of the basket face
    to extract realistic coffee extraction parameters:
    - High standard deviation in the bright crema regions indicates potential channeling (sprays/microchannels).
    - Asymmetric brightness between portafilter quadrants indicates uneven flow.
    - Overall luminance intensity is correlated with crema blonding levels.
    """
    resized = cv2.resize(frame, (64, 64))
    h, w, c = resized.shape
    q_h, q_w = h // 2, w // 2
    
    # Quadrant grayscale conversions
    top_left = cv2.cvtColor(resized[0:q_h, 0:q_w], cv2.COLOR_BGR2GRAY)
    top_right = cv2.cvtColor(resized[0:q_h, q_w:w], cv2.COLOR_BGR2GRAY)
    bottom_left = cv2.cvtColor(resized[q_h:h, 0:q_w], cv2.COLOR_BGR2GRAY)
    bottom_right = cv2.cvtColor(resized[q_h:h, q_w:w], cv2.COLOR_BGR2GRAY)
    
    # Compute brightness means
    means = [
        cv2.mean(top_left)[0] / 255.0,
        cv2.mean(top_right)[0] / 255.0,
        cv2.mean(bottom_left)[0] / 255.0,
        cv2.mean(bottom_right)[0] / 255.0
    ]
    
    # 1. Detected Uneven Flow: check if standard deviation between quadrant means is high
    mean_val = sum(means) / 4.0
    variance = sum((x - mean_val) ** 2 for x in means) / 4.0
    std_dev = math.sqrt(variance)
    
    # An uneven flow is classified if asymmetry threshold is exceeded
    detected_uneven_flow = std_dev > 0.08
    
    # 2. Detected Channeling: check if any high frequency 'spray' or high-intensity spots occur
    # represented here by a high local standard deviation inside the quadrants
    _, q_std1 = cv2.meanStdDev(top_left)
    _, q_std2 = cv2.meanStdDev(top_right)
    max_std = max(q_std1[0][0] / 255.0, q_std2[0][0] / 255.0)
    
    detected_channeling = max_std > 0.22
    
    # 3. Crema Quality Rating: determined by a combination of target coffee colors
    # (rich dark golds and browns) vs late blonding (very bright white/yellow)
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    h_channel = hsv[:, :, 0]
    s_channel = hsv[:, :, 1]
    v_channel = hsv[:, :, 2]
    
    # Golden brown Hues are generally between 10 and 25 in OpenCV's 180-degree Hue scale
    brown_pixels = ((h_channel >= 8) & (h_channel <= 24) & (s_channel >= 40)).sum()
    total_pixels = 64 * 64
    brown_ratio = brown_pixels / total_pixels
    
    # Score is high when there's rich brown/amber colors (ratio > 0.4)
    crema_quality_rating = min(1.0, max(0.1, brown_ratio * 2.0))
    
    # cv2 operations return numpy scalars; convert to native Python types before
    # any DB insert, otherwise psycopg2 sees e.g. np.bool_ / np.float64 and
    # raises InvalidSchemaName: schema "np" does not exist.
    return bool(detected_channeling), bool(detected_uneven_flow), float(crema_quality_rating)


def process_image_bytes(
    image_bytes: bytes,
    session: Session,
    filename: str = "uploaded_image",
    bean_id: Optional[int] = None,
) -> List[ExtractionFrame]:
    """Decode a static image from raw bytes, embed it, and persist results.

    Creates a new parent Extraction row first (using the provided bean_id or the
    first available bean), commits it to obtain a real database-backed ID, then
    decodes the image in-memory via cv2.imdecode and runs the full embedding and
    storage pipeline on the single resulting frame.
    """
    import numpy as np

    # 0. Ensure a valid parent Extraction record exists before writing the child frame.
    #    Resolve bean_id: use the caller-supplied value or fall back to the first bean.
    if bean_id is None:
        first_bean = session.exec(select(Bean).limit(1)).first()
        if first_bean is None:
            raise ValueError(
                "No bean profiles found in the database. "
                "Please add a coffee bean before uploading an image."
            )
        bean_id = first_bean.id

    db_extraction = Extraction(
        bean_id=bean_id,
        dose_in_grams=0.0,
        yield_in_grams=0.0,
        extraction_time_seconds=0.0,
        notes=f"Auto-generated extraction record for image upload: {filename}",
    )
    session.add(db_extraction)
    session.commit()
    session.refresh(db_extraction)
    extraction_id = db_extraction.id

    # 1. Decode image in-memory
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise IOError(f"Could not decode image bytes for: {filename}")

    # 2. Classify channeling and flow metrics
    channeling, uneven_flow, crema_rating = analyze_extraction_frame_quality(frame)

    # 3. Generate 512-dimension embedding vector
    vector = generate_mock_vision_embeddings(frame)

    # 4. Upsert vector point to Qdrant collection
    point_id = str(uuid.uuid4())
    try:
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[
                qmodels.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "extraction_id": extraction_id,
                        "timestamp_seconds": 0.0,
                        "detected_channeling": channeling,
                        "detected_uneven_flow": uneven_flow,
                        "crema_quality_rating": crema_rating,
                    },
                )
            ],
        )
    except Exception as qd_err:
        print(f"Warning: Failed to index image vector in Qdrant: {qd_err}")

    # 5. Persist frame record in PostgreSQL via SQLModel
    db_frame = ExtractionFrame(
        extraction_id=extraction_id,
        timestamp_seconds=0.0,
        qdrant_point_id=point_id,
        detected_channeling=channeling,
        detected_uneven_flow=uneven_flow,
        crema_quality_rating=crema_rating,
        notes=f"Processed static image: {filename}",
    )
    session.add(db_frame)
    session.commit()
    session.refresh(db_frame)
    return [db_frame]


def process_video_file(
    extraction_id: int,
    video_path: str,
    session: Session,
    sample_rate_seconds: float = 1.0
) -> List[ExtractionFrame]:
    """Ingest an espresso extraction video, sample it at set intervals,

    extract vision features, index vectors in Qdrant, and persist metadata in PostgreSQL.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at: {video_path}")

    # Check if the file is a static image rather than a video stream
    ext = os.path.splitext(video_path)[1].lower()
    if ext in [".jpg", ".jpeg", ".png"]:
        frame = cv2.imread(video_path)
        if frame is None:
            raise IOError(f"Could not read image file: {video_path}")

        # 1. Classify channeling and flow metrics from image
        channeling, uneven_flow, crema_rating = analyze_extraction_frame_quality(frame)

        # 2. Extract 512-dimension visual embedding vector
        vector = generate_mock_vision_embeddings(frame)

        # 3. Upsert to Qdrant collection
        point_id = str(uuid.uuid4())
        try:
            qdrant_client.upsert(
                collection_name=settings.QDRANT_COLLECTION,
                points=[
                    qmodels.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "extraction_id": extraction_id,
                            "timestamp_seconds": 0.0,
                            "detected_channeling": channeling,
                            "detected_uneven_flow": uneven_flow,
                            "crema_quality_rating": crema_rating,
                        }
                    )
                ]
            )
        except Exception as qd_err:
            print(f"Warning: Failed to index vector in Qdrant: {qd_err}")

        # 4. Save metadata record to PostgreSQL via SQLModel
        db_frame = ExtractionFrame(
            extraction_id=extraction_id,
            timestamp_seconds=0.0,
            qdrant_point_id=point_id,
            detected_channeling=channeling,
            detected_uneven_flow=uneven_flow,
            crema_quality_rating=crema_rating,
            notes=f"Processed static image file: {os.path.basename(video_path)}"
        )

        session.add(db_frame)
        session.commit()
        session.refresh(db_frame)
        return [db_frame]
        
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Could not open video file: {video_path}")
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if fps == 0 or total_frames == 0:
        cap.release()
        raise ValueError("Invalid video file telemetry (FPS or frame count is zero).")
        
    frame_step = int(fps * sample_rate_seconds)
    if frame_step == 0:
        frame_step = 1
        
    processed_frames = []
    
    try:
        frame_idx = 0
        while frame_idx < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            success, frame = cap.read()
            if not success or frame is None:
                break
                
            timestamp_seconds = frame_idx / fps
            
            # 1. Classify channeling and flow metrics from frame
            channeling, uneven_flow, crema_rating = analyze_extraction_frame_quality(frame)
            
            # 2. Extract 512-dimension visual embedding vector
            vector = generate_mock_vision_embeddings(frame)
            
            # 3. Upsert to Qdrant collection
            point_id = str(uuid.uuid4())
            try:
                qdrant_client.upsert(
                    collection_name=settings.QDRANT_COLLECTION,
                    points=[
                        qmodels.PointStruct(
                            id=point_id,
                            vector=vector,
                            payload={
                                "extraction_id": extraction_id,
                                "timestamp_seconds": timestamp_seconds,
                                "detected_channeling": channeling,
                                "detected_uneven_flow": uneven_flow,
                                "crema_quality_rating": crema_rating,
                            }
                        )
                    ]
                )
            except Exception as qd_err:
                # Log Qdrant warning but continue database transaction
                print(f"Warning: Failed to index vector in Qdrant: {qd_err}")
            
            # 4. Save metadata record to PostgreSQL via SQLModel
            db_frame = ExtractionFrame(
                extraction_id=extraction_id,
                timestamp_seconds=timestamp_seconds,
                qdrant_point_id=point_id,
                detected_channeling=channeling,
                detected_uneven_flow=uneven_flow,
                crema_quality_rating=crema_rating,
                notes=f"Processed frame at index {frame_idx}"
            )
            
            session.add(db_frame)
            processed_frames.append(db_frame)
            
            # Advance to the next sample index
            frame_idx += frame_step
            
        session.commit()
        for f in processed_frames:
            session.refresh(f)
            
    finally:
        cap.release()
        
    return processed_frames
