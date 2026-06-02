# EspressoLens

EspressoLens is an intelligent espresso extraction diagnostic suite. It analyzes espresso shot videos and images frame-by-frame using computer vision and vector embeddings to detect shot defects — channeling, uneven flow, and crema quality issues — and enables semantic search across historical brews.

Built for home baristas and commercial operators who want data-driven feedback on their extraction technique.

![EspressoLens Dashboard](docs/screenshots/ui-demo.png)

---

## Features

- **Video & Image Upload** — Drag-and-drop upload of espresso shot recordings or stills
- **Frame-by-Frame Analysis** — OpenCV-powered processing extracts frames and computes visual metrics per frame
- **Defect Detection** — Identifies channeling, uneven flow patterns, and crema quality rating (0–1 scale)
- **Source Tracking** — After analysis, a subtitle shows exactly what was analyzed: the filename for user uploads (e.g. `my-espresso.jpg`) or the sample name for demo images (e.g. `Perfect Shot (sample)`)
- **Plain English Interpretation** — A single-sentence summary below the metrics explains the overall result in plain language (e.g. *"Channeling issue detected — check your tamp and distribution."*)
- **Confidence Score** — AI certainty rating (0–100%) for each analysis, shown with a hover tooltip: *"How certain the AI is about this reading"*
- **Brew Doctor** — Collapsible remediation card that surfaces targeted, actionable advice for every detected issue; shows a multi-card layout when multiple problems are found simultaneously
- **5 Built-in Demo Samples** — One-click sample images covering: Perfect Shot, Channeling, Underextracted, Overextracted, and Uneven Flow — no upload required to explore the full pipeline
- **Vector Embeddings** — Each analyzed frame is encoded into a 512-dimensional L2-normalized embedding and indexed in Qdrant
- **Semantic Search** — Query across extraction history by visual similarity (e.g. "strong channeling", "tiger-stripe crema")
- **Bean Database** — Catalog of coffee bean profiles with roast level, origin, tasting notes, and target parameters
- **Extraction Logs** — Full history of extraction runs with dose, yield, time, pressure profile, and diagnostic status
- **AI Pipeline Inspector** — Interactive modal showing CLIP ViT-B/32 pipeline specs and Qdrant vector collection config

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.11+, SQLModel (SQLAlchemy + Pydantic) |
| Relational DB | PostgreSQL 16 |
| Vector DB | Qdrant (512-dim cosine similarity) |
| Vision | OpenCV (`opencv-python-headless`), CLIP ViT-B/32 architecture |
| Dependency Mgmt | `uv` (Python), npm (Node) |
| Orchestration | Docker & Docker Compose |

---

## Architecture

```
espresso-lens/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile.dev
│   └── app/
│       ├── main.py                  # FastAPI entrypoint
│       ├── api/v1/endpoints/        # extractions, beans, search routes
│       ├── core/                    # DB and Qdrant connectors, config
│       ├── models/                  # SQLModel table definitions
│       └── services/
│           └── video_processor.py   # OpenCV frame extraction + embedding
└── frontend/
    ├── Dockerfile.dev
    └── src/
        ├── app/                     # Next.js App Router pages
        │   ├── page.tsx             # Main dashboard
        │   ├── extraction-logs/     # Extraction history table
        │   └── bean-database/       # Bean catalog management
        └── components/
            └── shared/
                └── Header.tsx       # Nav + AI pipeline modals
```

### Data Models

**Bean** — Coffee profiles (name, roaster, roast level, origin, notes)

**Extraction** — Shot runs linked to a Bean (dose, yield, time, temperature, pressure profile, rating, video path)

**ExtractionFrame** — Per-frame analysis results linked to an Extraction (timestamp, channeling detected, uneven flow detected, crema rating, Qdrant point ID)

**Qdrant Points** — 512-dim L2-normalized vectors with payload metadata (extraction ID, defect flags, crema rating) stored in the `espresso_extraction_frames` collection using cosine distance.

---

## API Endpoints

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | PostgreSQL + Qdrant connectivity check |
| `POST` | `/beans/` | Create bean profile |
| `GET` | `/beans/` | List all beans |
| `GET` | `/beans/{id}` | Get bean by ID |
| `POST` | `/extractions/` | Log new extraction run |
| `GET` | `/extractions/` | List all extractions |
| `GET` | `/extractions/{id}` | Get extraction by ID |
| `POST` | `/extractions/{id}/upload-file` | Upload video or image file |
| `POST` | `/extractions/{id}/process-video` | Trigger OpenCV frame processing |
| `POST` | `/extractions/{id}/frames` | Add analyzed frame record |
| `GET` | `/extractions/{id}/frames` | List frames for extraction |
| `POST` | `/search/index-frame` | Index frame embedding in Qdrant |
| `POST` | `/search/search-similar` | Semantic vector similarity search |

Interactive API docs: `http://localhost:8000/docs`

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git

For local development outside Docker:
- Node.js 18+
- Python 3.11+ and [uv](https://github.com/astral-sh/uv)

### Run with Docker

```bash
git clone https://github.com/AnjanaDSV/espresso-lens.git
cd espresso-lens
docker compose up --build
```

All four services start with coordinated health checks. Once healthy:

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:3000 |
| FastAPI Docs | http://localhost:8000/docs |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| PostgreSQL | localhost:5432 |

### Local Development (without Docker)

**Backend:**
```bash
cd backend
uv pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend** — create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/espressolens
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=espresso_extraction_frames
ENVIRONMENT=development
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
WATCHPACK_POLLING=true
```

---

## Docker Services

| Service | Image | Ports | Notes |
|---|---|---|---|
| `db` | postgres:16-alpine | 5432 | Persistent volume, health-checked |
| `qdrant` | qdrant/qdrant:latest | 6333, 6334 | Persistent volume |
| `backend` | python:3.11-slim (custom) | 8000 | Hot-reload via volume mount |
| `frontend` | node:18-alpine (custom) | 3000 | Hot-reload via volume mount, depends on backend |

---

## Demo Guide

The fastest way to explore EspressoLens is through the **Load Sample Image** buttons on the dashboard. Each synthetic image represents a distinct real-world extraction scenario.

### Sample Images

Click any button in the "Load Sample Image / Demo" row, then hit **Analyze with AI** to run the full pipeline on that image.

| Button | Shot Type | What It Represents |
|---|---|---|
| **Perfect Shot** | Ideal extraction | Even golden crema, balanced radial flow, no defects detected |
| **Channeling** | Severe defect | Water channeled through weak spots in the puck, creating dark streaks and uneven extraction |
| **Underextracted** | Too-fast shot | Pale blonde color, thin crema, under-developed flavors — shot ran too fast |
| **Overextracted** | Too-slow shot | Near-black burnt appearance, heavy bitterness — shot ran too slow with excessive contact time |
| **Uneven Flow** | Asymmetric flow | One side of the basket extracting much darker than the other, indicating uneven puck preparation |

### Diagnostic Metrics

After analysis, four metrics are returned for each uploaded frame:

| Metric | What It Measures | Values |
|---|---|---|
| **Channeling** | Whether water found shortcuts through the coffee puck instead of flowing evenly | `None` / `Mild` / `Detected` |
| **Flow** | How symmetrically and evenly water moved through the grounds | `Balanced` / `Uneven` / `Restricted` |
| **Crema** | Percentage (0–100%) of the frame's surface covered by golden crema foam — higher is better | `0%` → `100%` |
| **Confidence** | How certain the AI is about this reading — hover the card in the UI for the tooltip | `0%` → `100%` |

Below the metrics, a **plain English interpretation** summarizes the overall result in one sentence. Above the card, a **source label** confirms what was analyzed (filename or sample name).

### Expected Results Per Sample

| Sample | Channeling | Flow | Crema |
|---|---|---|---|
| `perfect_shot.jpg` | None | Balanced | ~85–95% |
| `channeling_severe.jpg` | Detected | Uneven | ~40–55% |
| `underextracted.jpg` | None | Balanced | ~20–35% |
| `overextracted.jpg` | None | Balanced | ~30–45% |
| `uneven_flow.jpg` | None | Uneven | ~50–65% |

### What Happens Under the Hood

When you click **Analyze with AI**, the following pipeline runs:

1. **Upload** — The image is POSTed to `POST /api/v1/extractions/{id}/upload-file`
2. **OpenCV processing** — The frame is decoded in memory; color statistics and quadrant analysis are computed across the image
3. **Embedding generation** — A 512-dimensional L2-normalized vector is derived from the frame's visual features, mimicking the output of a CLIP ViT-B/32 vision encoder
4. **Defect detection** — Color distribution, brightness variance, and quadrant asymmetry are evaluated against thresholds to flag channeling and uneven flow
5. **Qdrant indexing** — The embedding is stored in the `espresso_extraction_frames` collection with cosine distance; a UUID point ID is returned as proof of indexing
6. **Result display** — Channeling flag, flow symmetry flag, crema coverage rating, and Qdrant point ID are rendered back in the dashboard

To generate fresh sample images locally:

```bash
pip install Pillow numpy
python scripts/generate_test_images.py
```

### Remediation Guide (Brew Doctor)

After every analysis the **Brew Doctor** card appears automatically below the result. It reads all four diagnostic flags and surfaces a separate actionable tip card for each detected issue. When multiple problems are found, all relevant cards are shown simultaneously. The section is collapsible and defaults to open.

| Condition | Trigger | Actionable Tips |
|---|---|---|
| **Channeling Detected** | `channeling_severity = "Detected"` | Distribute grounds evenly before tamping; check tamp pressure (aim for 30 lbs); use a WDT tool (Weiss Distribution Technique); try a coarser grind |
| **Mild Channeling** | `channeling_severity = "Mild"` | Minor puck unevenness — redistribution before tamping will help; check tamp levelness; try a slightly coarser grind |
| **Uneven / Restricted Flow** | `flow_status = "Uneven"` or `"Restricted"` | Adjust grind size — finer for slow flow, coarser for fast; check portafilter basket for blockages; ensure a level, consistent tamp angle |
| **Low Crema Coverage** | `crema_quality_rating < 0.70` | Use fresher beans (within 2–4 weeks of roast date); try a slightly finer grind; verify water temperature is 93–96°C |
| **Perfect Shot** | All checks pass | Celebration message — note your grind size and dose so you can reproduce the result |

---

## License

MIT
