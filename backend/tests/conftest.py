import sys
from pathlib import Path
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.database import Base
from backend.main import app
from backend.auth.database import get_async_session

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest_asyncio.fixture
async def test_db_session():
    """Create a fresh in-memory database for each test.

    Uses FastAPI's dependency_overrides to inject test database into app.
    Each test gets its own isolated in-memory database - no cleanup needed.
    """
    # Create in-memory database (fast, isolated, automatically cleaned up)
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session maker for this test database
    test_session_maker = async_sessionmaker(engine, expire_on_commit=False)

    # Override app's database dependency to use test database
    async def override_get_session():
        async with test_session_maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_async_session] = override_get_session

    # Provide session for direct use in fixtures
    async with test_session_maker() as session:
        yield session

    # Cleanup
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture(scope="function")
def test_gpx_dir(tmp_path):
    """Create a temporary GPX directory for each test"""
    gpx_dir = tmp_path / "gpx"
    gpx_dir.mkdir()
    return gpx_dir
