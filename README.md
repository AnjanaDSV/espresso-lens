# EspressoLens ☕🔍

EspressoLens is an intelligent, high-end multi-repo workspace designed to perform semantic retrieval and analysis over **espresso extraction video frames** linked to detailed **coffee bean profiles**. It aids home baristas and commercial operators in diagnosing shot quality defects (such as channeling, uneven flow, and crema issues) using state-of-the-art vision embeddings.

## Tech Stack & Architecture

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS) styled beautifully with `shadcn/ui` components for an immersive, premium UX.
- **Backend**: FastAPI (Python 3.11/3.12) utilizing `SQLModel` (unified SQL databases & Pydantic validation) for streamlined DB interaction.
- **Dependency Management**: Powered by `uv` for ultra-fast, robust package installation and environment builds.
- **Databases**:
  - **PostgreSQL**: Relational storage for structured records: bean metadata, extraction runs, and analytical parameters.
  - **Qdrant Vector Database**: Vector storage indexing visual frames from extraction videos for high-dimensional semantic search.
- **Orchestration**: Fully dockerized with multi-service synchronization via `docker-compose.yml`.

---

## Directory Structure

```
espresso-lens/
├── .gitignore
├── README.md
├── docker-compose.yml
├── backend/                  # FastAPI + SQLModel + Qdrant Client + uv
│   ├── app/
│   │   ├── api/              # Endpoints (extractions, beans, semantic search)
│   │   ├── core/             # Base configurations, Database and Qdrant connectors
│   │   ├── models/           # SQLModel data models
│   │   └── main.py           # Application entrypoint
│   └── Dockerfile.dev        # Fast reload Python container
└── frontend/                 # Next.js App Router + TypeScript + Tailwind
    ├── src/
    │   ├── app/              # Dashboard pages and layout
    │   ├── components/       # Visual components and UI widgets
    │   ├── lib/              # Client-side API hooks and utility functions
    │   └── styles/           # Tailwind globals
    └── Dockerfile.dev        # Next.js hot-reload development container
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed locally:
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (optional, for local development outside containers)
- [Python 3.11+](https://www.python.org/) and [uv](https://github.com/astral-sh/uv) (optional, for local backend tooling)

### Running the Complete Stack

To boot up all services (Next.js, FastAPI, PostgreSQL, and Qdrant) in coordinated containers:

```bash
docker compose up --build
```

Once all containers are running and healthy, you can access the respective interfaces:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Qdrant Vector Console Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)
- **PostgreSQL**: Standard endpoint at `localhost:5432`

---

## License

This project is licensed under the MIT License.
