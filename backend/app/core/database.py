from collections.abc import Generator
from sqlmodel import Session, create_engine, SQLModel
from app.core.config import settings

# Create engine
# In production, we'd disable echo=True, but it is highly useful for debugging local developments.
engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    # pool_pre_ping checks the connection health before executing queries
    pool_pre_ping=True,
)


def init_db() -> None:
    """Initialize the database by creating all registered SQLModel tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency generator to provide a clean database session for each request."""
    with Session(engine) as session:
        yield session
