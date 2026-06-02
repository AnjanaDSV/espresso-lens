# EspressoLens

EspressoLens is an intelligent espresso extraction diagnostic suite. It analyzes espresso shot videos and images frame-by-frame using computer vision and vector embeddings to detect shot defects — channeling, uneven flow, and crema quality issues — and enables semantic search across historical brews.

Built for home baristas and commercial operators who want data-driven feedback on their extraction technique.

---

## Features

- **Video & Image Upload** — Drag-and-drop upload of espresso shot recordings or stills
- **Frame-by-Frame Analysis** — OpenCV-powered processing extracts frames and computes visual metrics per frame
- **Defect Detection** — Identifies channeling, uneven flow patterns, and crema quality rating (0–1 scale)
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

## License

MIT
