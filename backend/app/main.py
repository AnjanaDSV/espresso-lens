from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client.errors import UnexpectedResponse

from app.core.config import settings
from app.core.database import init_db, engine
from app.core.qdrant import init_qdrant_collections, qdrant_client
from app.api.v1.api import api_router


@asynccontextmanager
async lifespan(app: FastAPI):
    # Startup actions
    print("Initializing databases and vectors...")
    
    # 1. SQLModel automatic table creation
    try:
        init_db()
        print("SQLModel tables created successfully.")
    except Exception as db_err:
        print(f"Warning: Failed to initialize PostgreSQL tables: {db_err}")

    # 2. Qdrant vector collection setup
    try:
        init_qdrant_collections()
        print("Qdrant collection initialized successfully.")
    except Exception as qd_err:
        print(f"Warning: Failed to connect or initialize Qdrant collections: {qd_err}")
        
    yield
    
    # Shutdown actions
    print("Shutting down resources...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="EspressoLens - Intelligent Coffee Extraction Frame & Recipe Vector Search Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for the frontend container
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount central API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Welcome to EspressoLens API!",
        "docs_url": "/docs",
        "api_v1_url": f"{settings.API_V1_STR}"
    }


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Robust health-check verifying both PostgreSQL database and Qdrant connectivity."""
    db_healthy = False
    qdrant_healthy = False
    db_error = None
    qdrant_error = None

    # Check PostgreSQL
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        db_healthy = True
    except Exception as e:
        db_error = str(e)

    # Check Qdrant
    try:
        # Pings Qdrant API
        qdrant_client.get_collections()
        qdrant_healthy = True
    except Exception as e:
        qdrant_error = str(e)

    overall_status = "healthy" if (db_healthy and qdrant_healthy) else "unhealthy"

    return {
        "status": overall_status,
        "services": {
            "postgresql": {"status": "healthy" if db_healthy else "unhealthy", "error": db_error},
            "qdrant": {"status": "healthy" if qdrant_healthy else "unhealthy", "error": qdrant_error},
        }
    }
