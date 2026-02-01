from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    GPX_DIR = DATA_DIR / "gpx"
    DB_PATH = DATA_DIR / "tracks.db"
    STATIC_DIR = BASE_DIR / "backend" / "static"

    HOST = "0.0.0.0"
    PORT = 8005

    MAX_FILE_SIZE = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {".gpx"}

    DEFAULT_CENTER = (-79.0558, 35.9132)
    DEFAULT_ZOOM = 13
    TRACK_COLOR = "#FF00FF"

    SIMPLIFICATION_EPSILON = 0.00025

    GEOIP_DB_PATH = DATA_DIR / "GeoLite2-City.mmdb"
    MAXMIND_ACCOUNT_ID = os.getenv("MAXMIND_ACCOUNT_ID", "")
    MAXMIND_LICENSE_KEY = os.getenv("MAXMIND_LICENSE_KEY", "")
    MAXMIND_DOWNLOAD_URL = "https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz"

    @classmethod
    def ensure_dirs(cls):
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.GPX_DIR.mkdir(exist_ok=True)


config = Config()

# Intentional ruff format violation for CI testing
def badly_formatted_function(   ):
    x=1+2
    y      =     3    +   4
    return   x+y
