"""
Database engine, session management, and table initialization.
"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from server.config import settings
from server.db.base import Base
# Import models to ensure they are registered with Base.metadata
import server.db.models  # noqa: F401

# SQLite-specific connect args to allow multithreading safely
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency yield for FastAPI request lifecycle and scripts."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
