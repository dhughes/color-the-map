import pytest
import pytest_asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.models import User
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(scope="function", autouse=True)
def setup_api_test_environment(test_gpx_dir):
    """Setup API test-specific overrides.

    Database isolation is handled globally via conftest.py DATABASE_URL.
    This fixture only handles service dependencies.
    """
    from backend.services.storage_service import StorageService
    from backend.services.gpx_parser import GPXParser
    from backend.services.track_service import TrackService
    import backend.api.routes as routes_module

    new_storage = StorageService(test_gpx_dir)
    new_parser = GPXParser()
    new_track_service = TrackService(new_storage, new_parser)

    routes_module.storage = new_storage
    routes_module.track_service = new_track_service

    yield


client = TestClient(app)


@pytest_asyncio.fixture
async def auth_token(test_db_session):
    """Create test user in isolated test database and return auth token."""
    user = User(
        id=str(uuid.uuid4()),
        email="testapi@example.com",
        hashed_password=pwd_context.hash("testpass"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )

    test_db_session.add(user)
    await test_db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testapi@example.com", "password": "testpass"},
    )
    return response.json()["access_token"]


@pytest.fixture
def sample_gpx_file():
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        return f.read()


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_upload_track(sample_gpx_file, auth_token):
    response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["uploaded"] == 1
    assert data["failed"] == 0
    assert len(data["track_ids"]) == 1


def test_list_tracks(sample_gpx_file, auth_token):
    client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    response = client.get(
        "/api/v1/tracks", headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    tracks = response.json()
    assert len(tracks) >= 1
    assert "id" in tracks[0]
    assert "name" in tracks[0]
    assert "distance_meters" in tracks[0]


def test_get_track_geometry(sample_gpx_file, auth_token):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.post(
        "/api/v1/tracks/geometry",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    geometries = response.json()
    assert len(geometries) == 1
    assert geometries[0]["track_id"] == track_id
    assert len(geometries[0]["coordinates"]) > 0


def test_update_track(sample_gpx_file, auth_token):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.patch(
        f"/api/v1/tracks/{track_id}",
        json={"visible": False, "name": "Updated Name"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["visible"] is False
    assert data["name"] == "Updated Name"


def test_update_nonexistent_track(auth_token):
    response = client.patch(
        "/api/v1/tracks/9999",
        json={"visible": False},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 404


def test_delete_single_track(sample_gpx_file, auth_token):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.request(
        "DELETE",
        "/api/v1/tracks",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 1

    get_response = client.get(
        "/api/v1/tracks", headers={"Authorization": f"Bearer {auth_token}"}
    )
    tracks = get_response.json()
    assert not any(t["id"] == track_id for t in tracks)


def test_delete_multiple_tracks(auth_token):
    test_dir = Path(__file__).parent
    gpx1_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    gpx2_path = test_dir / ".." / ".." / "sample-gpx-files" / "Walking 2031.gpx"

    with open(gpx1_path, "rb") as f:
        content1 = f.read()
    with open(gpx2_path, "rb") as f:
        content2 = f.read()

    upload_response = client.post(
        "/api/v1/tracks",
        files=[
            ("files", ("test1.gpx", content1, "application/gpx+xml")),
            ("files", ("test2.gpx", content2, "application/gpx+xml")),
        ],
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    track_ids = upload_response.json()["track_ids"]

    response = client.request(
        "DELETE",
        "/api/v1/tracks",
        json={"track_ids": track_ids},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 2


def test_delete_nonexistent_track(auth_token):
    response = client.request(
        "DELETE",
        "/api/v1/tracks",
        json={"track_ids": [9999]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 0


def test_delete_with_mixed_ids(sample_gpx_file, auth_token):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    existing_id = upload_response.json()["track_ids"][0]

    response = client.request(
        "DELETE",
        "/api/v1/tracks",
        json={"track_ids": [9999, existing_id, 8888]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 1
