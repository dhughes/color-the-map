import pytest
import tarfile
import io
from unittest.mock import AsyncMock, Mock, patch
import httpx
from backend.services.geoip_service import GeoIPService


@pytest.fixture
def geoip_service(tmp_path):
    """Create GeoIPService instance with temp directory."""
    return GeoIPService(
        db_path=tmp_path / "GeoLite2-City.mmdb",
        download_url="https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz",
        account_id="test_account_id",
        license_key="test_license_key",
    )


@pytest.fixture
def fake_tar_gz_content():
    """Create fake tar.gz content with .mmdb file inside."""
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
        mmdb_content = b"fake mmdb database content for testing"
        mmdb_info = tarfile.TarInfo(name="GeoLite2-City_20260116/GeoLite2-City.mmdb")
        mmdb_info.size = len(mmdb_content)
        tar.addfile(mmdb_info, io.BytesIO(mmdb_content))

    return tar_buffer.getvalue()


@pytest.mark.asyncio
async def test_download_database_success(geoip_service, fake_tar_gz_content):
    """Test successful download and extraction of database."""
    mock_response = Mock()
    mock_response.content = fake_tar_gz_content
    mock_response.raise_for_status = Mock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client.return_value = mock_context

        result = await geoip_service.download_database()

        assert result is True
        assert geoip_service.db_path.exists()
        assert b"fake mmdb database content" in geoip_service.db_path.read_bytes()


@pytest.mark.asyncio
async def test_download_database_retry_on_failure(geoip_service, fake_tar_gz_content):
    """Test retry logic when download fails initially."""
    mock_success_response = Mock()
    mock_success_response.content = fake_tar_gz_content
    mock_success_response.raise_for_status = Mock()

    attempts = []

    async def mock_get(*args, **kwargs):
        attempts.append(1)
        if len(attempts) < 3:
            raise httpx.HTTPError("Connection failed")
        return mock_success_response

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = mock_get
        mock_client.return_value = mock_context

        with patch("asyncio.sleep") as mock_sleep:
            result = await geoip_service.download_database()

            assert result is True
            assert len(attempts) == 3
            assert mock_sleep.call_count == 2
            assert geoip_service.db_path.exists()


@pytest.mark.asyncio
async def test_download_database_fails_after_max_retries(geoip_service):
    """Test that download returns False after exhausting retries."""

    async def mock_get(*args, **kwargs):
        raise httpx.HTTPError("Persistent connection failure")

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = mock_get
        mock_client.return_value = mock_context

        with patch("asyncio.sleep"):
            result = await geoip_service.download_database()

            assert result is False
            assert not geoip_service.db_path.exists()


@pytest.mark.asyncio
async def test_initialize_downloads_when_missing(geoip_service, fake_tar_gz_content):
    """Test initialize() downloads database when file is missing."""
    mock_response = Mock()
    mock_response.content = fake_tar_gz_content
    mock_response.raise_for_status = Mock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client.return_value = mock_context

        await geoip_service.initialize()

        assert geoip_service.db_path.exists()
        assert geoip_service.scheduler is not None
        assert geoip_service.scheduler.running

        geoip_service.scheduler.shutdown()


@pytest.mark.asyncio
async def test_initialize_skips_download_when_exists(geoip_service):
    """Test initialize() skips download when database already exists."""
    geoip_service.db_path.parent.mkdir(parents=True, exist_ok=True)
    geoip_service.db_path.write_bytes(b"existing database")

    with patch.object(
        geoip_service, "download_database", new=AsyncMock()
    ) as mock_download:
        await geoip_service.initialize()

        mock_download.assert_not_called()
        assert geoip_service.db_path.read_bytes() == b"existing database"
        assert geoip_service.scheduler is not None

        geoip_service.scheduler.shutdown()
