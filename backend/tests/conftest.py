import sys
from pathlib import Path
import pytest
import pytest_asyncio
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.database import Base
from backend.main import app
from backend.auth.database import get_async_session


async def create_test_user(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        text(
            "INSERT OR IGNORE INTO users (id, email, hashed_password, is_active, is_superuser, is_verified)"
            " VALUES (:id, :email, :hashed_password, 1, 0, 0)"
        ),
        {
            "id": user_id,
            "email": f"{user_id}@test.com",
            "hashed_password": "not-a-real-hash",
        },
    )
    await session.flush()


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

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

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
