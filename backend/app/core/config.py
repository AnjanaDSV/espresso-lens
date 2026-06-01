from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "EspressoLens API"
    ENVIRONMENT: Literal["development", "production", "test"] = "development"

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/espressolens"

    # Qdrant Vector DB
    QDRANT_HOST: str = "qdrant"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "espresso_extraction_frames"


settings = Settings()
