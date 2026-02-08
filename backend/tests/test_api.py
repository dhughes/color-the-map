import pytest
import pytest_asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.models import User
from backend.services.map_service import MapService
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(scope="function", autouse=True)
def setup_api_test_environment(test_gpx_dir):
    from backend.services.storage_service import StorageService
    from backend.services.gpx_parser import GPXParser
    from backend.services.track_service import TrackService
    from backend.api.map_routes import get_storage, get_track_service

    new_storage = StorageService(test_gpx_dir)
    new_parser = GPXParser()
    new_track_service = TrackService(new_storage, new_parser)

    app.dependency_overrides[get_storage] = lambda: new_storage
    app.dependency_overrides[get_track_service] = lambda: new_track_service

    yield

    app.dependency_overrides.pop(get_storage, None)
    app.dependency_overrides.pop(get_track_service, None)


client = TestClient(app)


@pytest_asyncio.fixture
async def user_with_map(test_db_session):
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email="testapi@example.com",
        hashed_password=pwd_context.hash("testpass"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    test_db_session.add(user)
    await test_db_session.flush()

    map_service = MapService()
    default_map = await map_service.create_map("My Map", user_id, test_db_session)
    await test_db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testapi@example.com", "password": "testpass"},
    )
    token = response.json()["access_token"]

    return {"token": token, "user_id": user_id, "map_id": default_map.id}


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


def test_upload_track(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["uploaded"] == 1
    assert data["failed"] == 0
    assert len(data["track_ids"]) == 1


def test_list_tracks(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )

    response = client.get(
        f"/api/v1/maps/{map_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    tracks = response.json()
    assert len(tracks) >= 1
    assert "id" in tracks[0]
    assert "name" in tracks[0]
    assert "distance_meters" in tracks[0]


def test_get_track_geometry(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.post(
        f"/api/v1/maps/{map_id}/tracks/geometry",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    geometries = response.json()
    assert len(geometries) == 1
    assert geometries[0]["track_id"] == track_id
    assert len(geometries[0]["coordinates"]) > 0


def test_get_track_geometry_includes_segment_speeds(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.post(
        f"/api/v1/maps/{map_id}/tracks/geometry",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    geometries = response.json()
    assert len(geometries) == 1
    assert "segment_speeds" in geometries[0]
    assert geometries[0]["segment_speeds"] is not None
    assert len(geometries[0]["segment_speeds"]) == len(geometries[0]["coordinates"]) - 1


def test_update_track(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/{track_id}",
        json={"visible": False, "name": "Updated Name"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["visible"] is False
    assert data["name"] == "Updated Name"


def test_update_nonexistent_track(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/9999",
        json={"visible": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_delete_single_track(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.request(
        "DELETE",
        f"/api/v1/maps/{map_id}/tracks",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 1

    get_response = client.get(
        f"/api/v1/maps/{map_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )
    tracks = get_response.json()
    assert not any(t["id"] == track_id for t in tracks)


def test_delete_multiple_tracks(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

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
        f"/api/v1/maps/{map_id}/tracks",
        files=[
            ("files", ("test1.gpx", content1, "application/gpx+xml")),
            ("files", ("test2.gpx", content2, "application/gpx+xml")),
        ],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_ids = upload_response.json()["track_ids"]

    response = client.request(
        "DELETE",
        f"/api/v1/maps/{map_id}/tracks",
        json={"track_ids": track_ids},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 2


def test_delete_nonexistent_track(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    response = client.request(
        "DELETE",
        f"/api/v1/maps/{map_id}/tracks",
        json={"track_ids": [9999]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 0


def test_delete_with_mixed_ids(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    existing_id = upload_response.json()["track_ids"][0]

    response = client.request(
        "DELETE",
        f"/api/v1/maps/{map_id}/tracks",
        json={"track_ids": [9999, existing_id, 8888]},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] == 1


def test_bulk_update_tracks(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

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
        f"/api/v1/maps/{map_id}/tracks",
        files=[
            ("files", ("test1.gpx", content1, "application/gpx+xml")),
            ("files", ("test2.gpx", content2, "application/gpx+xml")),
        ],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_ids = upload_response.json()["track_ids"]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/bulk",
        json={"track_ids": track_ids, "updates": {"activity_type": "Running"}},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 2

    list_response = client.get(
        f"/api/v1/maps/{map_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )
    tracks = list_response.json()
    for track in tracks:
        if track["id"] in track_ids:
            assert track["activity_type"] == "Running"


def test_bulk_update_tracks_empty_list(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/bulk",
        json={"track_ids": [], "updates": {"activity_type": "Running"}},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 0


def test_bulk_update_tracks_nonexistent(user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/bulk",
        json={"track_ids": [9999, 8888], "updates": {"activity_type": "Running"}},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 0


def test_bulk_update_tracks_mixed_ids(sample_gpx_file, user_with_map):
    token = user_with_map["token"]
    map_id = user_with_map["map_id"]

    upload_response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    existing_id = upload_response.json()["track_ids"][0]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/bulk",
        json={
            "track_ids": [9999, existing_id, 8888],
            "updates": {"activity_type": "Hiking"},
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 1

    list_response = client.get(
        f"/api/v1/maps/{map_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )
    tracks = list_response.json()
    updated_track = next(t for t in tracks if t["id"] == existing_id)
    assert updated_track["activity_type"] == "Hiking"
