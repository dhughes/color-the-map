import sys
from pathlib import Path
import os
import pytest
import pytest_asyncio
import asyncio

# CRITICAL: Set DATABASE_URL *BEFORE* importing any application code
# This ensures tests use a separate database file
_test_database_path = Path(__file__).parent.parent.parent / "data" / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_test_database_path}"

# Now safe to import app code - it will use test database
# ruff: noqa: E402 - imports must come after DATABASE_URL is set
from backend.database import Base
from backend.auth.database import get_engine

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create test database schema once for entire test session."""
    # Delete existing test database to start fresh
    if _test_database_path.exists():
        _test_database_path.unlink()

    # Create schema in test database using SQLAlchemy
    # (In production, Alembic migrations handle this)
    async def create_tables():
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(create_tables())

    yield

    # Cleanup after all tests
    if _test_database_path.exists():
        _test_database_path.unlink()


@pytest_asyncio.fixture(autouse=True)
async def clean_test_data():
    """Clean test database between tests to prevent conflicts.

    Runs before each test to ensure a clean state.
    Users and tracks created by one test don't affect the next.
    """
    from backend.auth.database import get_session_maker
    from backend.auth.models import User, RefreshToken
    from backend.models.track_model import Track
    from sqlalchemy import delete

    yield  # Let test run first

    # Cleanup after test completes
    session_maker = get_session_maker()
    async with session_maker() as session:
        await session.execute(delete(RefreshToken))
        await session.execute(delete(Track))
        await session.execute(delete(User))
        await session.commit()


@pytest.fixture(scope="function")
def test_gpx_dir(tmp_path):
    """Create a temporary GPX directory for each test"""
    gpx_dir = tmp_path / "gpx"
    gpx_dir.mkdir()
    return gpx_dir
