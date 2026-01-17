import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.fixture
def mock_geoip_success():
    """Mock GeoIPService with successful lookup."""
    mock_service = Mock()
    mock_service.lookup_ip.return_value = {
        "latitude": 42.7325,
        "longitude": -84.4801,
    }
    return mock_service


@pytest.fixture
def mock_geoip_not_found():
    """Mock GeoIPService with IP not found."""
    mock_service = Mock()
    mock_service.lookup_ip.return_value = None
    return mock_service


def test_get_location_success(mock_geoip_success):
    """Test successful IP lookup returns coordinates."""
    with patch("backend.main.geoip_service", mock_geoip_success):
        response = client.get("/api/v1/location")

        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 42.7325
        assert data["longitude"] == -84.4801


def test_get_location_not_found(mock_geoip_not_found):
    """Test IP not in database returns 404."""
    with patch("backend.main.geoip_service", mock_geoip_not_found):
        response = client.get("/api/v1/location")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


def test_get_location_service_unavailable():
    """Test returns 503 when GeoIP service is not available."""
    with patch("backend.main.geoip_service", None):
        response = client.get("/api/v1/location")

        assert response.status_code == 503
        assert "not available" in response.json()["detail"].lower()


def test_get_location_extracts_client_ip(mock_geoip_success):
    """Test endpoint extracts client IP and calls lookup_ip."""
    with patch("backend.main.geoip_service", mock_geoip_success):
        response = client.get("/api/v1/location")

        assert response.status_code == 200
        mock_geoip_success.lookup_ip.assert_called_once()
        called_ip = mock_geoip_success.lookup_ip.call_args[0][0]
        assert called_ip is not None
