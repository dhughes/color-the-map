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
