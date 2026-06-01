from collections.abc import Generator
from sqlmodel import Session
from app.core.database import get_session

# Dep for database session injection in routes
SessionDep = get_session
