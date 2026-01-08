import hashlib
import re
from pathlib import Path
from typing import Optional


class StorageService:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def calculate_hash(self, content: bytes) -> str:
        minified = self._minify_gpx(content)
        return hashlib.sha256(minified).hexdigest()

    def _minify_gpx(self, content: bytes) -> bytes:
        text = content.decode("utf-8")
        text = re.sub(r">\s+<", "><", text)
        text = text.strip()
        return text.encode("utf-8")

    def store_gpx(self, gpx_hash: str, content: bytes) -> Path:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if not file_path.exists():
            file_path.write_bytes(content)
        return file_path

    def load_gpx(self, gpx_hash: str) -> Optional[bytes]:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if not file_path.exists():
            return None
        return file_path.read_bytes()

    def delete_gpx(self, gpx_hash: str) -> bool:
        file_path = self.storage_path / f"{gpx_hash}.gpx"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
