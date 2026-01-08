import pytest
from pathlib import Path
from backend.services.track_service import TrackService
from backend.services.gpx_parser import GPXParser
from backend.services.storage_service import StorageService
from backend.db.database import Database

@pytest.fixture
def track_service(tmp_path):
    db_path = tmp_path / "test.db"
    gpx_dir = tmp_path / "gpx"

    db = Database(db_path)
    storage = StorageService(gpx_dir)
    parser = GPXParser()

    return TrackService(db, storage, parser)

@pytest.fixture
def sample_gpx():
    test_dir = Path(__file__).parent
    gpx_path = test_dir / '..' / '..' / 'sample-gpx-files' / 'Cycling 2025-12-19T211415Z.gpx'
    with open(gpx_path, 'rb') as f:
        return f.read()

def test_upload_track(track_service, sample_gpx):
    result = track_service.upload_track("test.gpx", sample_gpx)

    assert result['duplicate'] is False
    assert result['track']['name'] == "test"
    assert result['track']['distance_meters'] > 0
    assert result['track']['hash']

def test_duplicate_detection(track_service, sample_gpx):
    track_service.upload_track("test.gpx", sample_gpx)

    result = track_service.upload_track("test2.gpx", sample_gpx)

    assert result['duplicate'] is True
    assert result['track']['name'] == "test"

def test_list_tracks(track_service, sample_gpx):
    track_service.upload_track("track1.gpx", sample_gpx)

    tracks = track_service.list_tracks()

    assert len(tracks) == 1
    assert tracks[0]['name'] == "track1"

def test_get_track_geometry(track_service, sample_gpx):
    result = track_service.upload_track("test.gpx", sample_gpx)
    track_id = result['track']['id']

    geometry = track_service.get_track_geometry(track_id)

    assert geometry is not None
    assert geometry['track_id'] == track_id
    assert len(geometry['coordinates']) > 0
    assert isinstance(geometry['coordinates'][0], list)

def test_get_multiple_geometries(track_service):
    test_dir = Path(__file__).parent
    gpx1_path = test_dir / '..' / '..' / 'sample-gpx-files' / 'Cycling 2025-12-19T211415Z.gpx'
    gpx2_path = test_dir / '..' / '..' / 'sample-gpx-files' / 'Walking 2031.gpx'

    with open(gpx1_path, 'rb') as f:
        content1 = f.read()
    with open(gpx2_path, 'rb') as f:
        content2 = f.read()

    result1 = track_service.upload_track("track1.gpx", content1)
    result2 = track_service.upload_track("track2.gpx", content2)

    track_ids = [result1['track']['id'], result2['track']['id']]
    geometries = track_service.get_multiple_geometries(track_ids)

    assert len(geometries) == 2
    assert geometries[0]['track_id'] == result1['track']['id']
    assert geometries[1]['track_id'] == result2['track']['id']
