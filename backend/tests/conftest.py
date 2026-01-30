import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.auth.models import Base
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


@pytest.fixture(scope="function")
def test_gpx_dir(tmp_path):
    """Create a temporary GPX directory for each test"""
    gpx_dir = tmp_path / "gpx"
    gpx_dir.mkdir()
    return gpx_dir


@pytest.fixture(scope="function", autouse=True)
def setup_test_config(test_db_path, test_gpx_dir):
    """Override config paths for tests"""
    original_db_path = config.DB_PATH
    original_gpx_dir = config.GPX_DIR

    config.DB_PATH = test_db_path
    config.GPX_DIR = test_gpx_dir

    yield

    config.DB_PATH = original_db_path
    config.GPX_DIR = original_gpx_dir
