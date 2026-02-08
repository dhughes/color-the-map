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
async def auth_token(test_db_session):
    user = User(
        id=str(uuid.uuid4()),
        email="testmaps@example.com",
        hashed_password=pwd_context.hash("testpass"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    test_db_session.add(user)
    await test_db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testmaps@example.com", "password": "testpass"},
    )
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def user_with_default_map(test_db_session):
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email="mapuser@example.com",
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
        data={"username": "mapuser@example.com", "password": "testpass"},
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


def test_create_map(auth_token):
    response = client.post(
        "/api/v1/maps",
        json={"name": "New Map"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Map"
    assert "id" in data


def test_list_maps(user_with_default_map):
    token = user_with_default_map["token"]

    response = client.get(
        "/api/v1/maps",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    maps = response.json()
    assert len(maps) == 1
    assert maps[0]["name"] == "My Map"


def test_rename_map(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"name": "Renamed Map"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed Map"


def test_delete_map(user_with_default_map):
    token = user_with_default_map["token"]

    create_response = client.post(
        "/api/v1/maps",
        json={"name": "Second Map"},
        headers={"Authorization": f"Bearer {token}"},
    )
    second_map_id = create_response.json()["id"]

    response = client.delete(
        f"/api/v1/maps/{second_map_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["deleted"] is True


def test_cannot_delete_last_map(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.delete(
        f"/api/v1/maps/{map_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "Cannot delete the last map" in response.json()["detail"]


def test_upload_track_to_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["uploaded"] == 1
    assert len(data["track_ids"]) == 1


def test_list_tracks_for_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

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
    assert len(tracks) == 1
    assert tracks[0]["map_id"] == map_id


def test_tracks_scoped_to_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map1_id = user_with_default_map["map_id"]

    create_response = client.post(
        "/api/v1/maps",
        json={"name": "Second Map"},
        headers={"Authorization": f"Bearer {token}"},
    )
    map2_id = create_response.json()["id"]

    client.post(
        f"/api/v1/maps/{map1_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )

    response1 = client.get(
        f"/api/v1/maps/{map1_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )
    response2 = client.get(
        f"/api/v1/maps/{map2_id}/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert len(response1.json()) == 1
    assert len(response2.json()) == 0


def test_same_gpx_on_two_maps(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map1_id = user_with_default_map["map_id"]

    create_response = client.post(
        "/api/v1/maps",
        json={"name": "Second Map"},
        headers={"Authorization": f"Bearer {token}"},
    )
    map2_id = create_response.json()["id"]

    resp1 = client.post(
        f"/api/v1/maps/{map1_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    resp2 = client.post(
        f"/api/v1/maps/{map2_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp1.status_code == 201
    assert resp2.status_code == 201
    assert resp1.json()["uploaded"] == 1
    assert resp2.json()["uploaded"] == 1


def test_update_track_on_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    upload_resp = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_resp.json()["track_ids"][0]

    response = client.patch(
        f"/api/v1/maps/{map_id}/tracks/{track_id}",
        json={"visible": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["visible"] is False


def test_delete_tracks_on_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    upload_resp = client.post(
        f"/api/v1/maps/{map_id}/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    track_id = upload_resp.json()["track_ids"][0]

    response = client.request(
        "DELETE",
        f"/api/v1/maps/{map_id}/tracks",
        json={"track_ids": [track_id]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["deleted"] == 1


def test_track_operations_require_valid_map(user_with_default_map, sample_gpx_file):
    token = user_with_default_map["token"]

    response = client.get(
        "/api/v1/maps/99999/tracks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_create_map_rejects_empty_name(auth_token):
    response = client.post(
        "/api/v1/maps",
        json={"name": ""},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 422


def test_create_map_rejects_whitespace_only_name(auth_token):
    response = client.post(
        "/api/v1/maps",
        json={"name": "   "},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 422


def test_create_map_strips_whitespace(auth_token):
    response = client.post(
        "/api/v1/maps",
        json={"name": "  My Map  "},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "My Map"


def test_create_map_rejects_too_long_name(auth_token):
    response = client.post(
        "/api/v1/maps",
        json={"name": "x" * 101},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 422


def test_rename_map_rejects_empty_name(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"name": ""},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_rename_map_rejects_whitespace_only_name(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"name": "   "},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_rename_map_strips_whitespace(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"name": "  Renamed  "},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


def test_rename_map_rejects_too_long_name(user_with_default_map):
    token = user_with_default_map["token"]
    map_id = user_with_default_map["map_id"]

    response = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"name": "x" * 101},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_unauthenticated_map_access():
    response = client.get("/api/v1/maps")
    assert response.status_code == 401
