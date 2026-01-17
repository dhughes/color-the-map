import pytest
from unittest.mock import Mock, patch, MagicMock
from backend.services.geoip_service import GeoIPService


@pytest.fixture
def geoip_service(tmp_path):
    """Create GeoIPService instance with temp directory."""
    db_path = tmp_path / "GeoLite2-City.mmdb"
    return GeoIPService(
        db_path=db_path,
        download_url="https://download.maxmind.com/test",
        account_id="test_account",
        license_key="test_key",
    )


@pytest.fixture
def mock_city_response():
    """Create mock geoip2 city response."""
    mock_response = Mock()
    mock_response.location.latitude = 37.386
    mock_response.location.longitude = -122.084
    return mock_response


def test_lookup_ip_success(geoip_service, tmp_path, mock_city_response):
    """Test successful IP lookup returns coordinates."""
    # Create database file so it exists
    geoip_service.db_path.write_bytes(b"fake db")

    with patch("geoip2.database.Reader") as mock_reader_class:
        mock_reader = MagicMock()
        mock_reader.__enter__.return_value.city.return_value = mock_city_response
        mock_reader_class.return_value = mock_reader

        result = geoip_service.lookup_ip("8.8.8.8")

        assert result is not None
        assert result["latitude"] == 37.386
        assert result["longitude"] == -122.084


def test_lookup_ip_not_found(geoip_service, tmp_path):
    """Test IP not in database returns None."""
    # Create database file so it exists
    geoip_service.db_path.write_bytes(b"fake db")

    with patch("geoip2.database.Reader") as mock_reader_class:
        mock_reader = MagicMock()
        # Import the actual exception class
        from geoip2.errors import AddressNotFoundError

        mock_reader.__enter__.return_value.city.side_effect = AddressNotFoundError(
            "Address not found"
        )
        mock_reader_class.return_value = mock_reader

        result = geoip_service.lookup_ip("127.0.0.1")

        assert result is None


def test_lookup_ip_missing_database(geoip_service):
    """Test lookup with missing database file returns None."""
    # Don't create the database file
    result = geoip_service.lookup_ip("8.8.8.8")

    assert result is None


def test_lookup_ip_invalid_address(geoip_service, tmp_path):
    """Test lookup with invalid IP address returns None."""
    # Create database file so it exists
    geoip_service.db_path.write_bytes(b"fake db")

    with patch("geoip2.database.Reader") as mock_reader_class:
        mock_reader = MagicMock()
        mock_reader.__enter__.return_value.city.side_effect = Exception("Invalid IP")
        mock_reader_class.return_value = mock_reader

        result = geoip_service.lookup_ip("invalid-ip")

        assert result is None


def test_lookup_ip_missing_coordinates(geoip_service, tmp_path):
    """Test IP lookup when response has no coordinates returns None."""
    # Create database file so it exists
    geoip_service.db_path.write_bytes(b"fake db")

    mock_response = Mock()
    mock_response.location.latitude = None
    mock_response.location.longitude = None

    with patch("geoip2.database.Reader") as mock_reader_class:
        mock_reader = MagicMock()
        mock_reader.__enter__.return_value.city.return_value = mock_response
        mock_reader_class.return_value = mock_reader

        result = geoip_service.lookup_ip("8.8.8.8")

        assert result is None
