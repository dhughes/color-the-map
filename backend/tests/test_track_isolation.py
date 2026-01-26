import pytest
import pytest_asyncio
from pathlib import Path
from httpx import ASGITransport, AsyncClient
from backend.main import app
from backend.auth.database import async_session_maker
from backend.auth.models import User, RefreshToken
from passlib.context import CryptContext
from sqlalchemy import delete
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest_asyncio.fixture(autouse=True)
async def clean_auth_db(tmp_path):
    from backend.config import config
    from backend.db.database import Database

    test_db_path = tmp_path / "test.db"
    test_gpx_dir = tmp_path / "gpx"

    original_db_path = config.DB_PATH
    original_gpx_dir = config.GPX_DIR

    config.DB_PATH = test_db_path
    config.GPX_DIR = test_gpx_dir

    new_db = Database(test_db_path)
    from backend.services.storage_service import StorageService
    from backend.services.gpx_parser import GPXParser
    from backend.services.track_service import TrackService

    new_storage = StorageService(test_gpx_dir)
    new_parser = GPXParser()
    new_track_service = TrackService(new_db, new_storage, new_parser)

    import backend.api.routes as routes_module

    routes_module.db = new_db
    routes_module.storage = new_storage
    routes_module.track_service = new_track_service

    async with async_session_maker() as session:
        await session.execute(delete(RefreshToken))
        await session.execute(delete(User))
        await session.commit()

    yield

    config.DB_PATH = original_db_path
    config.GPX_DIR = original_gpx_dir


@pytest_asyncio.fixture
async def user1():
    user = User(
        id=str(uuid.uuid4()),
        email="user1@example.com",
        hashed_password=pwd_context.hash("password1"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )

    async with async_session_maker() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return user


@pytest_asyncio.fixture
async def user2():
    user = User(
        id=str(uuid.uuid4()),
        email="user2@example.com",
        hashed_password=pwd_context.hash("password2"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )

    async with async_session_maker() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return user


@pytest.fixture
def sample_gpx_file():
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        return f.read()


@pytest.mark.asyncio
async def test_users_see_only_their_own_tracks(user1, user2, sample_gpx_file):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login1 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user1@example.com", "password": "password1"},
        )
        token1 = login1.json()["access_token"]

        login2 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user2@example.com", "password": "password2"},
        )
        token2 = login2.json()["access_token"]

        upload1 = await client.post(
            "/api/v1/tracks",
            files=[
                ("files", ("user1_track.gpx", sample_gpx_file, "application/gpx+xml"))
            ],
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert upload1.status_code == 201

        tracks1 = await client.get(
            "/api/v1/tracks", headers={"Authorization": f"Bearer {token1}"}
        )
        assert tracks1.status_code == 200
        assert len(tracks1.json()) == 1

        tracks2 = await client.get(
            "/api/v1/tracks", headers={"Authorization": f"Bearer {token2}"}
        )
        assert tracks2.status_code == 200
        assert len(tracks2.json()) == 0


@pytest.mark.asyncio
async def test_user_cannot_update_other_users_track(user1, user2, sample_gpx_file):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login1 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user1@example.com", "password": "password1"},
        )
        token1 = login1.json()["access_token"]

        login2 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user2@example.com", "password": "password2"},
        )
        token2 = login2.json()["access_token"]

        upload = await client.post(
            "/api/v1/tracks",
            files=[("files", ("track.gpx", sample_gpx_file, "application/gpx+xml"))],
            headers={"Authorization": f"Bearer {token1}"},
        )
        track_id = upload.json()["track_ids"][0]

        update_response = await client.patch(
            f"/api/v1/tracks/{track_id}",
            json={"name": "Hacked Name"},
            headers={"Authorization": f"Bearer {token2}"},
        )

        assert update_response.status_code == 404


@pytest.mark.asyncio
async def test_user_cannot_delete_other_users_track(user1, user2, sample_gpx_file):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login1 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user1@example.com", "password": "password1"},
        )
        token1 = login1.json()["access_token"]

        login2 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user2@example.com", "password": "password2"},
        )
        token2 = login2.json()["access_token"]

        upload = await client.post(
            "/api/v1/tracks",
            files=[("files", ("track.gpx", sample_gpx_file, "application/gpx+xml"))],
            headers={"Authorization": f"Bearer {token1}"},
        )
        track_id = upload.json()["track_ids"][0]

        delete_response = await client.request(
            "DELETE",
            "/api/v1/tracks",
            json={"track_ids": [track_id]},
            headers={"Authorization": f"Bearer {token2}"},
        )

        assert delete_response.status_code == 200
        result = delete_response.json()
        assert result["deleted"] == 0
        assert result["failed"] == 1

        tracks = await client.get(
            "/api/v1/tracks", headers={"Authorization": f"Bearer {token1}"}
        )
        assert len(tracks.json()) == 1


@pytest.mark.asyncio
async def test_user_cannot_get_other_users_geometry(user1, user2, sample_gpx_file):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login1 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user1@example.com", "password": "password1"},
        )
        token1 = login1.json()["access_token"]

        login2 = await client.post(
            "/api/v1/auth/login",
            data={"username": "user2@example.com", "password": "password2"},
        )
        token2 = login2.json()["access_token"]

        upload = await client.post(
            "/api/v1/tracks",
            files=[("files", ("track.gpx", sample_gpx_file, "application/gpx+xml"))],
            headers={"Authorization": f"Bearer {token1}"},
        )
        track_id = upload.json()["track_ids"][0]

        geometry_response = await client.post(
            "/api/v1/tracks/geometry",
            json={"track_ids": [track_id]},
            headers={"Authorization": f"Bearer {token2}"},
        )

        assert geometry_response.status_code == 200
        assert len(geometry_response.json()) == 0
