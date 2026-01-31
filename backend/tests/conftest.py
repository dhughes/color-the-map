import sys
from pathlib import Path
import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.database import Base
from backend.config import config

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture(scope="session")
def test_db_path(tmp_path_factory):
    """Create a temporary test database path for the entire test session"""
    return tmp_path_factory.mktemp("data") / "test.db"


@pytest.fixture(scope="session")
def test_engine(test_db_path):
    """Create a SQLAlchemy engine for the test database"""
    engine = create_engine(f"sqlite:///{test_db_path}")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a new database session for each test with proper cleanup order"""
    connection = test_engine.connect()
    transaction = connection.begin()
    session_maker = sessionmaker(bind=connection)
    session = session_maker()

    yield session

    # Cleanup order is critical:
    # 1. Rollback the transaction first (undoes all changes)
    # 2. Close the session (releases resources)
    # 3. Close the connection (returns to pool)
    transaction.rollback()
    session.close()
    connection.close()


@pytest.fixture(scope="session")
def test_async_engine(test_db_path):
    """Create an async SQLAlchemy engine for the test database"""
    import asyncio

    engine = create_async_engine(f"sqlite+aiosqlite:///{test_db_path}")

    # Create tables
    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(create_tables())

    yield engine

    # Cleanup
    asyncio.run(engine.dispose())


@pytest_asyncio.fixture(scope="function")
async def async_db_session(tmp_path):
    """Create a fresh async database session for each test

    Uses a separate database file per test for complete isolation.
    No transactions needed - each test starts with clean state.
    """
    test_db = tmp_path / "async_test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{test_db}")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    session_maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    session = session_maker()

    yield session

    # Cleanup
    await session.close()
    await engine.dispose()


@pytest.fixture(scope="function")
def test_gpx_dir(tmp_path):
    """Create a temporary GPX directory for each test"""
    gpx_dir = tmp_path / "gpx"
    gpx_dir.mkdir()
    return gpx_dir


@pytest.fixture(scope="function", autouse=True)
def setup_test_config(test_db_path, test_gpx_dir, monkeypatch):
    """Override config paths for tests using monkeypatch for thread-safety

    Using monkeypatch instead of direct mutation ensures thread-safety when
    tests run in parallel (pytest-xdist). monkeypatch handles cleanup
    automatically and prevents race conditions from concurrent config changes.
    """
    monkeypatch.setattr(config, "DB_PATH", test_db_path)
    monkeypatch.setattr(config, "GPX_DIR", test_gpx_dir)
