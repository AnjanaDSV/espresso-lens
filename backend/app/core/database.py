from collections.abc import Generator
from sqlmodel import Session, create_engine, SQLModel, select
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


def seed_db() -> None:
    """Insert sample bean profiles if the table is empty."""
    from app.models.bean import Bean

    sample_beans = [
        Bean(
            name="Ethiopia Yirgacheffe",
            roaster="Origin Roasters",
            roast_level="Light",
            origin="Yirgacheffe, Ethiopia",
            notes="Bright floral aroma with blueberry and jasmine notes. Clean, tea-like body with a citrus finish.",
        ),
        Bean(
            name="Colombia Huila",
            roaster="Origin Roasters",
            roast_level="Medium",
            origin="Huila, Colombia",
            notes="Smooth caramel sweetness with red apple and brown sugar. Balanced acidity and medium body.",
        ),
        Bean(
            name="Brazil Santos",
            roaster="Origin Roasters",
            roast_level="Dark",
            origin="Santos, Brazil",
            notes="Rich dark chocolate and roasted hazelnut. Low acidity with a heavy, syrupy body.",
        ),
        Bean(
            name="Guatemala Antigua",
            roaster="Origin Roasters",
            roast_level="Medium-Dark",
            origin="Antigua, Guatemala",
            notes="Bittersweet cocoa with smoky undertones and a hint of dried fruit. Full body, lingering finish.",
        ),
    ]

    with Session(engine) as session:
        existing = session.exec(select(Bean)).first()
        if existing is None:
            session.add_all(sample_beans)
            session.commit()
            print(f"Seeded {len(sample_beans)} sample bean profiles.")
        else:
            print("Bean profiles already present, skipping seed.")


def get_session() -> Generator[Session, None, None]:
    """Dependency generator to provide a clean database session for each request."""
    with Session(engine) as session:
        yield session
