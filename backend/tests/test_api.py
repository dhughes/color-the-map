import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import config
from backend.db.database import Database


@pytest.fixture(scope="function", autouse=True)
def clean_test_db(tmp_path):
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

    yield

    config.DB_PATH = original_db_path
    config.GPX_DIR = original_gpx_dir


client = TestClient(app)


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


def test_upload_track(sample_gpx_file):
    response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
    )

    assert response.status_code == 201
    data = response.json()
    assert data["uploaded"] == 1
    assert data["failed"] == 0
    assert len(data["track_ids"]) == 1


def test_list_tracks(sample_gpx_file):
    client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
    )

    response = client.get("/api/v1/tracks")

    assert response.status_code == 200
    tracks = response.json()
    assert len(tracks) >= 1
    assert "id" in tracks[0]
    assert "name" in tracks[0]
    assert "distance_meters" in tracks[0]


def test_get_track_geometry(sample_gpx_file):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.post("/api/v1/tracks/geometry", json={"track_ids": [track_id]})

    assert response.status_code == 200
    geometries = response.json()
    assert len(geometries) == 1
    assert geometries[0]["track_id"] == track_id
    assert len(geometries[0]["coordinates"]) > 0


def test_update_track(sample_gpx_file):
    upload_response = client.post(
        "/api/v1/tracks",
        files=[("files", ("test.gpx", sample_gpx_file, "application/gpx+xml"))],
    )
    track_id = upload_response.json()["track_ids"][0]

    response = client.patch(
        f"/api/v1/tracks/{track_id}", json={"visible": False, "name": "Updated Name"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["visible"] is False
    assert data["name"] == "Updated Name"


def test_update_nonexistent_track():
    response = client.patch("/api/v1/tracks/9999", json={"visible": False})
    assert response.status_code == 404
