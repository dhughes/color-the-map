import hashlib
from pathlib import Path
from typing import Optional


class StorageService:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def calculate_hash(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def store_gpx(self, user_id: str, gpx_hash: str, content: bytes) -> Path:
        file_path = self.storage_path / f"{user_id}_{gpx_hash}.gpx"
        if not file_path.exists():
            file_path.write_bytes(content)
        return file_path

    def load_gpx(self, user_id: str, gpx_hash: str) -> Optional[bytes]:
        file_path = self.storage_path / f"{user_id}_{gpx_hash}.gpx"
        if not file_path.exists():
            return None
        return file_path.read_bytes()

    def delete_gpx(self, user_id: str, gpx_hash: str) -> bool:
        file_path = self.storage_path / f"{user_id}_{gpx_hash}.gpx"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
