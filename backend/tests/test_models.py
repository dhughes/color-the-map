from datetime import datetime
from backend.models.track import Track


def test_track_from_db_row():
    class MockRow:
        def __getitem__(self, key):
            row_data = {
                "id": 1,
                "hash": "abc123",
                "name": "Test Track",
                "filename": "test.gpx",
                "activity_type": "Cycling",
                "activity_type_inferred": "Cycling",
                "activity_date": datetime(2025, 1, 1, 10, 0, 0),
                "uploaded_at": datetime(2025, 1, 1, 10, 5, 0),
                "distance_meters": 5000.0,
                "duration_seconds": 1800,
                "avg_speed_ms": 2.78,
                "max_speed_ms": 5.0,
                "min_speed_ms": 1.0,
                "elevation_gain_meters": 100.0,
                "elevation_loss_meters": 95.0,
                "bounds_min_lat": 35.9,
                "bounds_min_lon": -79.1,
                "bounds_max_lat": 35.95,
                "bounds_max_lon": -79.05,
                "visible": 1,
                "description": "Test description",
                "created_at": datetime(2025, 1, 1, 10, 5, 0),
                "updated_at": datetime(2025, 1, 1, 10, 5, 0),
            }
            return row_data[key]

    row = MockRow()
    track = Track.from_db_row(row)

    assert track.id == 1
    assert track.name == "Test Track"
    assert track.visible is True
    assert isinstance(track.visible, bool)


def test_track_boolean_conversion():
    class MockRow:
        def __getitem__(self, key):
            row_data = {
                "id": 1,
                "hash": "abc",
                "name": "Test",
                "filename": "test.gpx",
                "activity_type": None,
                "activity_type_inferred": None,
                "activity_date": datetime.now(),
                "uploaded_at": datetime.now(),
                "distance_meters": None,
                "duration_seconds": None,
                "avg_speed_ms": None,
                "max_speed_ms": None,
                "min_speed_ms": None,
                "elevation_gain_meters": None,
                "elevation_loss_meters": None,
                "bounds_min_lat": None,
                "bounds_min_lon": None,
                "bounds_max_lat": None,
                "bounds_max_lon": None,
                "visible": 0,
                "description": None,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }
            return row_data[key]

    track = Track.from_db_row(MockRow())
    assert track.visible is False
    assert isinstance(track.visible, bool)
