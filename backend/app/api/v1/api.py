from fastapi import APIRouter
from app.api.v1.endpoints import beans, extractions, search

api_router = APIRouter()

# Include sub-routers with logical prefixes
api_router.include_router(beans.router, prefix="/beans", tags=["Beans"])
api_router.include_router(extractions.router, prefix="/extractions", tags=["Extractions"])
api_router.include_router(search.router, prefix="/search", tags=["Vector Search"])
