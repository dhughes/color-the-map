import pytest
from pathlib import Path
from backend.services.gpx_parser import GPXParser


@pytest.fixture
def parser():
    return GPXParser()


@pytest.fixture
def sample_gpx_content():
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        return f.read()


def test_parse_basic_gpx(parser, sample_gpx_content):
    result = parser.parse(sample_gpx_content)

    assert result.distance_meters > 0
    assert len(result.coordinates) > 0
    assert result.bounds_min_lat is not None
    assert result.bounds_max_lat is not None
    assert result.activity_date is not None


def test_coordinates_format(parser, sample_gpx_content):
    result = parser.parse(sample_gpx_content)

    coords = result.coordinates
    assert isinstance(coords, list)
    assert len(coords) > 0

    first_coord = coords[0]
    assert isinstance(first_coord, tuple)
    assert len(first_coord) == 2
    assert isinstance(first_coord[0], float)
    assert isinstance(first_coord[1], float)


def test_distance_calculation(parser, sample_gpx_content):
    result = parser.parse(sample_gpx_content)

    distance = result.distance_meters
    assert distance > 0
    assert distance < 1000000


def test_elevation_statistics(parser, sample_gpx_content):
    result = parser.parse(sample_gpx_content)

    assert result.elevation_gain_meters >= 0
    assert result.elevation_loss_meters >= 0


def test_bounds_calculation(parser, sample_gpx_content):
    result = parser.parse(sample_gpx_content)

    assert result.bounds_min_lat < result.bounds_max_lat
    assert result.bounds_min_lon < result.bounds_max_lon
    assert -90 <= result.bounds_min_lat <= 90
    assert -180 <= result.bounds_min_lon <= 180


def test_invalid_gpx(parser):
    with pytest.raises(Exception):
        parser.parse(b"<invalid>not a gpx file</invalid>")


def test_empty_gpx(parser):
    gpx_content = (
        b'<?xml version="1.0"?><gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>'
    )
    with pytest.raises(ValueError, match="No track points"):
        parser.parse(gpx_content)


def test_parses_creator_from_gpx_export(parser):
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        content = f.read()

    result = parser.parse(content)
    assert result.creator == "GPX Export"


def test_parses_creator_from_apple_health(parser):
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "route_2024-09-21_9.04am.gpx"
    )
    with open(gpx_path, "rb") as f:
        content = f.read()

    result = parser.parse(content)
    assert result.creator == "Apple Health Export"


def test_creator_is_none_when_missing(parser):
    test_dir = Path(__file__).parent
    gpx_path = test_dir / "fixtures" / "test-no-creator.gpx"
    with open(gpx_path, "rb") as f:
        content = f.read()

    result = parser.parse(content)
    assert result.creator is None


def test_infer_activity_type_walking():
    assert GPXParser.infer_activity_type("Walking 2031.gpx") == "Walking"
    assert GPXParser.infer_activity_type("123-walking.gpx") == "Walking"
    assert GPXParser.infer_activity_type("WALK-test.gpx") == "Walking"
    assert GPXParser.infer_activity_type("walk 2026-01-22T220706Z.gpx") == "Walking"


def test_infer_activity_type_running():
    assert GPXParser.infer_activity_type("Running 2025.gpx") == "Running"
    assert GPXParser.infer_activity_type("morning-run.gpx") == "Running"
    assert GPXParser.infer_activity_type("RUN 2025-12-19.gpx") == "Running"


def test_infer_activity_type_cycling():
    assert GPXParser.infer_activity_type("Cycling 2025-12-19T211415Z.gpx") == "Cycling"
    assert GPXParser.infer_activity_type("biking 2025-07-26.gpx") == "Cycling"
    assert GPXParser.infer_activity_type("bike ride.gpx") == "Cycling"
    assert GPXParser.infer_activity_type("mtb-trail.gpx") == "Cycling"
    assert (
        GPXParser.infer_activity_type("Optimistic mountain bike ride.gpx") == "Cycling"
    )
    assert GPXParser.infer_activity_type("mountain biking fun.gpx") == "Cycling"


def test_infer_activity_type_swimming():
    assert GPXParser.infer_activity_type("Swimming 2025.gpx") == "Swimming"
    assert GPXParser.infer_activity_type("swim practice.gpx") == "Swimming"


def test_infer_activity_type_downhill_skiing():
    assert (
        GPXParser.infer_activity_type("Downhill Skiing 2025-01-23T001434Z.gpx")
        == "Downhill Skiing"
    )
    assert GPXParser.infer_activity_type("skiing trip.gpx") == "Downhill Skiing"
    assert GPXParser.infer_activity_type("DOWNHILL 2025.gpx") == "Downhill Skiing"


def test_infer_activity_type_multisport():
    assert (
        GPXParser.infer_activity_type("Multisport 2025-09-27T131031Z.gpx")
        == "Multisport"
    )
    assert GPXParser.infer_activity_type("triathlon 2025.gpx") == "Multisport"


def test_infer_activity_type_other():
    assert GPXParser.infer_activity_type("Other 2025-06-07T131027Z.gpx") == "Other"
    assert GPXParser.infer_activity_type("other activity.gpx") == "Other"


def test_infer_activity_type_unknown():
    assert GPXParser.infer_activity_type("route_2025-03-01_5.31pm.gpx") == "Unknown"
    assert (
        GPXParser.infer_activity_type("gps_track_2025-09-20_14-08-43.gpx") == "Unknown"
    )
    assert GPXParser.infer_activity_type("What the hell. Why not?.gpx") == "Unknown"
    assert GPXParser.infer_activity_type("random-file.gpx") == "Unknown"


def test_infer_activity_type_case_insensitive():
    assert GPXParser.infer_activity_type("CYCLING 2025.gpx") == "Cycling"
    assert GPXParser.infer_activity_type("WaLkInG 2025.gpx") == "Walking"
    assert GPXParser.infer_activity_type("RUNNING 2025.gpx") == "Running"


def test_infer_activity_type_position_independent():
    assert GPXParser.infer_activity_type("2025-walking-trail.gpx") == "Walking"
    assert GPXParser.infer_activity_type("123-456-run-test.gpx") == "Running"
    assert GPXParser.infer_activity_type("my-bike-ride-2025.gpx") == "Cycling"
