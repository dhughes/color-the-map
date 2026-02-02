from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
import os

# Global engine and session maker (lazy initialized)
_engine = None
_async_session_maker = None


def get_database_url() -> str:
    """Get database URL from environment variable or default path.

    This allows tests to override the database by setting DATABASE_URL
    environment variable before importing this module.
    """
    from ..config import config

    # Check for environment variable first (used by tests)
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    # Default to configured path for development/production
    return f"sqlite+aiosqlite:///{config.DB_PATH}"


def get_engine():
    """Get or create the database engine (lazy initialization).

    Engine is created on first use, not at import time, allowing
    tests to set DATABASE_URL before engine creation.
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            get_database_url(),
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    return _engine


def get_session_maker():
    """Get or create the async session maker (lazy initialization)."""
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _async_session_maker


async def get_async_session():
    """Provide async database session with automatic rollback on exception.

    If the request handler raises an exception, any uncommitted changes
    are rolled back to prevent partial/inconsistent database state.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
