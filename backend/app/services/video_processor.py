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


# --- Detection thresholds -------------------------------------------------------
# Detection uses BRIGHTNESS ZONES (mean quadrant brightness, 0-1 scale) as the
# primary discriminator, since overall extraction brightness is the most reliable
# indicator of extraction quality in both synthetic samples and real photos.
#
# Zone 1  b < 0.16   Very dark  → Mild channeling  /  Restricted flow
# Zone 2  b < 0.26   Dark       → Detected channel /  Uneven flow
# Zone 3  b ≤ 0.38   Optimal    → None/Mild (texture) / Balanced or Uneven (asym)
# Zone 4  b > 0.38   Bright     → None channeling  /  Balanced or Uneven (asym)
_CH_TEXTURE_MILD = 0.20   # Zone-3/4: max per-quadrant stddev above this → Mild

# Flow asymmetry thresholds (zones 3 & 4 only; zones 1/2 are zone-determined):
_FLOW_STD = 0.040   # inter-quadrant brightness std-dev → Uneven
_FLOW_LR  = 0.080   # left-vs-right mean brightness gap → Uneven

# Crema zone multipliers — empirically calibrated against 5 sample images:
#   perfect≈88%  channeling_severe≈45%  underextracted≈35%
#   overextracted≈41%  uneven_flow≈65%
# Golden-amber hue range (hue 5-40 in OpenCV HSV) covers yellow-gold → deep amber.
_CREMA_MULT         = {1: 1.00, 2: 0.80, 3: 1.50, 4: 0.60}
_CREMA_FLOW_PENALTY = 2.50   # lr_asym × factor = flow-quality penalty (floor 0.50)
# ---------------------------------------------------------------------------------


def analyze_extraction_frame_quality(frame):
    """Analyse a single frame for channeling, flow symmetry, crema quality, and confidence.

    Returns a 6-tuple:
        (detected_channeling: bool,  channeling_severity: str,
         detected_uneven_flow: bool, flow_status: str,
         crema_quality_rating: float, detection_confidence: float)

    All values are native Python types — no numpy scalars — safe for direct DB insert.
    """
    resized = cv2.resize(frame, (64, 64))
    h, w, _ = resized.shape
    q_h, q_w = h // 2, w // 2

    q_tl = cv2.cvtColor(resized[0:q_h, 0:q_w],  cv2.COLOR_BGR2GRAY)
    q_tr = cv2.cvtColor(resized[0:q_h, q_w:w],  cv2.COLOR_BGR2GRAY)
    q_bl = cv2.cvtColor(resized[q_h:h, 0:q_w],  cv2.COLOR_BGR2GRAY)
    q_br = cv2.cvtColor(resized[q_h:h, q_w:w],  cv2.COLOR_BGR2GRAY)

    # ── Base measurements ────────────────────────────────────────────────────
    quad_means = [
        float(cv2.mean(q_tl)[0]) / 255.0,
        float(cv2.mean(q_tr)[0]) / 255.0,
        float(cv2.mean(q_bl)[0]) / 255.0,
        float(cv2.mean(q_br)[0]) / 255.0,
    ]
    mean_b  = sum(quad_means) / 4.0
    std_dev = math.sqrt(sum((x - mean_b) ** 2 for x in quad_means) / 4.0)

    left_mean  = (quad_means[0] + quad_means[2]) / 2.0
    right_mean = (quad_means[1] + quad_means[3]) / 2.0
    lr_asym    = abs(left_mean - right_mean)

    _, q_std_tl = cv2.meanStdDev(q_tl)
    _, q_std_tr = cv2.meanStdDev(q_tr)
    _, q_std_bl = cv2.meanStdDev(q_bl)
    _, q_std_br = cv2.meanStdDev(q_br)
    max_std = max(
        float(q_std_tl[0][0]) / 255.0,
        float(q_std_tr[0][0]) / 255.0,
        float(q_std_bl[0][0]) / 255.0,
        float(q_std_br[0][0]) / 255.0,
    )

    # ── 1. Brightness zone ───────────────────────────────────────────────────
    if mean_b < 0.16:
        zone = 1   # very dark  → over-restricted / severely over-extracted
    elif mean_b < 0.26:
        zone = 2   # dark       → channeled / under-extracted
    elif mean_b <= 0.38:
        zone = 3   # optimal    → normal well-extracted range
    else:
        zone = 4   # bright     → under-extracted / pale crema

    # ── 2. Channeling ────────────────────────────────────────────────────────
    if zone == 1:
        # Very dark: restricted puck contact — flag as Mild, not full Detected
        channeling_severity = "Mild"
        detected_channeling = False
    elif zone == 2:
        # Dark channels visible across the puck face → confirmed channeling
        channeling_severity = "Detected"
        detected_channeling = True
    elif zone == 3 and max_std > _CH_TEXTURE_MILD:
        # Optimal-brightness shot with elevated intra-quadrant texture → Mild channeling
        channeling_severity = "Mild"
        detected_channeling = False
    else:
        # Zone 4 (bright/under-extracted): texture variance is expected, not channeling
        channeling_severity = "None"
        detected_channeling = False

    # ── 3. Flow ──────────────────────────────────────────────────────────────
    if zone == 1:
        # Very dark → choked / restricted flow
        flow_status          = "Restricted"
        detected_uneven_flow = True
    elif zone == 2:
        # Dark zone → uneven distribution across basket
        flow_status          = "Uneven"
        detected_uneven_flow = True
    elif std_dev > _FLOW_STD or lr_asym > _FLOW_LR:
        # Clear left-right or quadrant brightness asymmetry
        flow_status          = "Uneven"
        detected_uneven_flow = True
    else:
        flow_status          = "Balanced"
        detected_uneven_flow = False

    # ── 4. Crema quality ─────────────────────────────────────────────────────
    # Hue 5-40 (OpenCV HSV 0-180): golden-yellow through deep amber/orange.
    # s >= 18 and v >= 40 allow for slightly muted crema tones.
    # Zone multiplier boosts good-extraction shots and penalises poor ones;
    # flow-quality factor reduces score when left-right asymmetry is high.
    hsv   = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    h_ch  = hsv[:, :, 0]
    s_ch  = hsv[:, :, 1]
    v_ch  = hsv[:, :, 2]

    crema_mask  = (h_ch >= 5) & (h_ch <= 40) & (s_ch >= 18) & (v_ch >= 40)
    crema_ratio = float(crema_mask.sum()) / (64 * 64)

    flow_quality         = max(0.50, 1.0 - lr_asym * _CREMA_FLOW_PENALTY)
    crema_quality_rating = float(
        min(1.0, max(0.05, crema_ratio * _CREMA_MULT[zone] * flow_quality))
    )

    # ── 5. Detection confidence ──────────────────────────────────────────────
    if channeling_severity == "None":
        # How far below the Mild texture threshold?
        ch_conf = 0.90 if zone == 4 else min(1.0, (_CH_TEXTURE_MILD - max_std) / _CH_TEXTURE_MILD + 0.5)
    elif channeling_severity == "Detected":
        # Deeper into zone 2 = more confident
        ch_conf = 0.60 + min(1.0, (0.26 - mean_b) / 0.10) * 0.40
    else:  # Mild
        ch_conf = 0.50

    if flow_status == "Balanced":
        fl_margin = max(std_dev / _FLOW_STD, lr_asym / _FLOW_LR)
        fl_conf   = min(1.0, (1.0 - fl_margin) * 0.5 + 0.5)
    elif flow_status == "Restricted":
        fl_conf = 0.60 + min(1.0, (0.16 - mean_b) / 0.16) * 0.40
    else:  # Uneven
        fl_conf = 0.75 if zone == 2 else min(1.0, max(std_dev / _FLOW_STD, lr_asym / _FLOW_LR) * 0.5 + 0.5)

    crema_conf           = 2.0 * abs(crema_quality_rating - 0.5)
    detection_confidence = float(min(1.0, (ch_conf + fl_conf + crema_conf) / 3.0))

    return (
        bool(detected_channeling),
        str(channeling_severity),
        bool(detected_uneven_flow),
        str(flow_status),
        float(crema_quality_rating),
        float(detection_confidence),
    )


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

    # 2. Classify channeling, flow, crema, and confidence
    channeling, ch_severity, uneven_flow, flow_status, crema_rating, confidence = analyze_extraction_frame_quality(frame)

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
                        "channeling_severity": ch_severity,
                        "detected_uneven_flow": uneven_flow,
                        "flow_status": flow_status,
                        "crema_quality_rating": crema_rating,
                        "detection_confidence": confidence,
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
        channeling_severity=ch_severity,
        detected_uneven_flow=uneven_flow,
        flow_status=flow_status,
        crema_quality_rating=crema_rating,
        detection_confidence=confidence,
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

        # 1. Classify channeling, flow, crema, and confidence
        channeling, ch_severity, uneven_flow, flow_status, crema_rating, confidence = analyze_extraction_frame_quality(frame)

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
                            "channeling_severity": ch_severity,
                            "detected_uneven_flow": uneven_flow,
                            "flow_status": flow_status,
                            "crema_quality_rating": crema_rating,
                            "detection_confidence": confidence,
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
            channeling_severity=ch_severity,
            detected_uneven_flow=uneven_flow,
            flow_status=flow_status,
            crema_quality_rating=crema_rating,
            detection_confidence=confidence,
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
            
            # 1. Classify channeling, flow, crema, and confidence
            channeling, ch_severity, uneven_flow, flow_status, crema_rating, confidence = analyze_extraction_frame_quality(frame)

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
                                "channeling_severity": ch_severity,
                                "detected_uneven_flow": uneven_flow,
                                "flow_status": flow_status,
                                "crema_quality_rating": crema_rating,
                                "detection_confidence": confidence,
                            }
                        )
                    ]
                )
            except Exception as qd_err:
                print(f"Warning: Failed to index vector in Qdrant: {qd_err}")

            # 4. Save metadata record to PostgreSQL via SQLModel
            db_frame = ExtractionFrame(
                extraction_id=extraction_id,
                timestamp_seconds=timestamp_seconds,
                qdrant_point_id=point_id,
                detected_channeling=channeling,
                channeling_severity=ch_severity,
                detected_uneven_flow=uneven_flow,
                flow_status=flow_status,
                crema_quality_rating=crema_rating,
                detection_confidence=confidence,
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
