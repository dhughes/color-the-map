import asyncio
import logging
import tarfile
from pathlib import Path
from typing import Optional
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class GeoIPService:
    MAX_RETRIES = 3
    RETRY_DELAYS = [1, 2, 4]

    def __init__(
        self, db_path: Path, download_url: str, account_id: str, license_key: str
    ) -> None:
        self.db_path = db_path
        self.download_url = download_url
        self.account_id = account_id
        self.license_key = license_key
        self.scheduler: Optional[BackgroundScheduler] = None

    async def initialize(self) -> None:
        """Initialize GeoIP service: download if missing, schedule updates."""
        if not self.db_path.exists():
            logger.info(f"GeoIP database not found at {self.db_path}, downloading...")
            await self.download_database()
        else:
            logger.info(f"GeoIP database exists at {self.db_path}")

        self._schedule_updates()

    async def download_database(self) -> bool:
        """Download and extract GeoLite2-City database with retries."""
        for attempt in range(self.MAX_RETRIES):
            try:
                logger.info(
                    f"Downloading GeoIP database (attempt {attempt + 1}/{self.MAX_RETRIES})..."
                )

                async with httpx.AsyncClient(timeout=300.0) as client:
                    response = await client.get(
                        self.download_url,
                        auth=(self.account_id, self.license_key),
                        follow_redirects=True,
                    )
                    response.raise_for_status()

                    tar_path = self.db_path.parent / "GeoLite2-City.tar.gz"
                    try:
                        tar_path.write_bytes(response.content)
                        self._extract_mmdb(tar_path)
                    finally:
                        if tar_path.exists():
                            tar_path.unlink()

                logger.info(f"GeoIP database downloaded successfully to {self.db_path}")
                return True

            except Exception as e:
                logger.error(f"Download attempt {attempt + 1} failed: {e}")

                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)

        logger.error("Failed to download GeoIP database after all retries")
        return False

    def _extract_mmdb(self, tar_gz_path: Path) -> None:
        """Extract .mmdb file from tar.gz archive."""
        with tarfile.open(tar_gz_path, "r:gz") as tar:
            mmdb_member = None
            for member in tar.getmembers():
                if member.name.endswith(".mmdb"):
                    mmdb_member = member
                    break

            if not mmdb_member:
                raise ValueError("No .mmdb file found in archive")

            mmdb_file = tar.extractfile(mmdb_member)
            if not mmdb_file:
                raise ValueError("Failed to extract .mmdb file")

            try:
                self.db_path.parent.mkdir(parents=True, exist_ok=True)
                temp_path = self.db_path.with_suffix(".mmdb.tmp")
                temp_path.write_bytes(mmdb_file.read())
                temp_path.replace(self.db_path)
            finally:
                mmdb_file.close()

    def _schedule_updates(self) -> None:
        """Schedule weekly updates using APScheduler."""
        if not self.account_id or not self.license_key:
            logger.warning("MaxMind credentials not set, skipping scheduler")
            return

        self.scheduler = BackgroundScheduler()
        self.scheduler.add_job(
            lambda: asyncio.run(self.download_database()),
            trigger=CronTrigger(day_of_week="mon", hour=0, minute=0),
            id="geoip_weekly_update",
            name="GeoIP Database Weekly Update",
        )
        self.scheduler.start()
        logger.info("GeoIP update scheduler started (runs Mondays at midnight)")

    def lookup_ip(self, ip_address: str) -> dict[str, float | str | None] | None:
        """
        Look up geographic coordinates for an IP address.

        Args:
            ip_address: IP address to look up

        Returns:
            Dict with 'latitude', 'longitude', 'city', 'country' keys, or None if not found
        """
        import geoip2.database
        import geoip2.errors

        if not self.db_path.exists():
            logger.warning(f"GeoIP database not found at {self.db_path}")
            return None

        try:
            with geoip2.database.Reader(str(self.db_path)) as reader:
                response = reader.city(ip_address)

                if not response.location.latitude or not response.location.longitude:
                    logger.warning(f"No coordinates found for IP {ip_address}")
                    return None

                return {
                    "latitude": response.location.latitude,
                    "longitude": response.location.longitude,
                    "city": response.city.name,
                    "country": response.country.name,
                }
        except geoip2.errors.AddressNotFoundError:
            logger.info(f"IP address not found in database: {ip_address}")
            return None
        except Exception as e:
            logger.error(f"Error looking up IP {ip_address}: {e}")
            return None

    def shutdown(self) -> None:
        """Shutdown the scheduler cleanly."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("GeoIP update scheduler shut down")
