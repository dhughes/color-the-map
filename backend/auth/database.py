from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from ..config import config

# Production database engine and session maker
engine = create_async_engine(
    f"sqlite+aiosqlite:///{config.DB_PATH}",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def get_async_session():
    """Provide async database session with automatic rollback on exception.

    If the request handler raises an exception, any uncommitted changes
    are rolled back to prevent partial/inconsistent database state.

    Tests can override this dependency using app.dependency_overrides.
    """
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
