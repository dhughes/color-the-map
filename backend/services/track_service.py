from pathlib import Path
from typing import Optional, List, Dict, Any
from .gpx_parser import GPXParser
from .storage_service import StorageService
from ..db.database import Database
from ..models.track import Track
from ..models.upload_result import UploadResult
from ..models.track_geometry import TrackGeometry

ALLOWED_UPDATE_FIELDS = {"visible", "name", "activity_type", "description"}


class TrackService:
    def __init__(self, db: Database, storage: StorageService, parser: GPXParser):
        self.db = db
        self.storage = storage
        self.parser = parser

    def upload_track(self, filename: str, content: bytes) -> UploadResult:
        gpx_hash = self.storage.calculate_hash(content)

        with self.db.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM tracks WHERE hash = ?", (gpx_hash,))
            existing = cursor.fetchone()

        if existing:
            return UploadResult(duplicate=True, track=Track.from_db_row(existing))

        try:
            gpx_data = self.parser.parse(content)
        except Exception as e:
            raise ValueError(f"Invalid GPX file: {e}")

        self.storage.store_gpx(gpx_hash, content)

        name = Path(filename).stem
        activity_type = "Unknown"
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO tracks (
                    hash, name, filename, activity_type, activity_type_inferred,
                    activity_date, distance_meters, duration_seconds,
                    avg_speed_ms, max_speed_ms, min_speed_ms,
                    elevation_gain_meters, elevation_loss_meters,
                    bounds_min_lat, bounds_max_lat,
                    bounds_min_lon, bounds_max_lon
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    gpx_hash,
                    name,
                    filename,
                    activity_type,
                    activity_type,
                    gpx_data.activity_date,
                    gpx_data.distance_meters,
                    gpx_data.duration_seconds,
                    gpx_data.avg_speed_ms,
                    gpx_data.max_speed_ms,
                    gpx_data.min_speed_ms,
                    gpx_data.elevation_gain_meters,
                    gpx_data.elevation_loss_meters,
                    gpx_data.bounds_min_lat,
                    gpx_data.bounds_max_lat,
                    gpx_data.bounds_min_lon,
                    gpx_data.bounds_max_lon,
                ),
            )

            track_id = cursor.lastrowid

            conn.execute(
                """
                INSERT INTO track_spatial (id, min_lat, max_lat, min_lon, max_lon)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    track_id,
                    gpx_data.bounds_min_lat,
                    gpx_data.bounds_max_lat,
                    gpx_data.bounds_min_lon,
                    gpx_data.bounds_max_lon,
                ),
            )

            cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
            track = Track.from_db_row(cursor.fetchone())

        return UploadResult(duplicate=False, track=track)

    def get_track_metadata(self, track_id: int) -> Optional[Track]:
        with self.db.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
            track = cursor.fetchone()

        if not track:
            return None

        return Track.from_db_row(track)

    def list_tracks(self) -> List[Track]:
        with self.db.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM tracks
                ORDER BY activity_date DESC
            """)
            tracks = [Track.from_db_row(row) for row in cursor.fetchall()]

        return tracks

    def get_track_geometry(self, track_id: int) -> Optional[TrackGeometry]:
        track = self.get_track_metadata(track_id)
        if not track:
            return None

        gpx_content = self.storage.load_gpx(track.hash)
        if not gpx_content:
            return None

        gpx_data = self.parser.parse(gpx_content)

        return TrackGeometry(track_id=track_id, coordinates=gpx_data.coordinates)

    def get_multiple_geometries(self, track_ids: List[int]) -> List[TrackGeometry]:
        geometries = []
        for track_id in track_ids:
            geometry = self.get_track_geometry(track_id)
            if geometry:
                geometries.append(geometry)
        return geometries

    def update_track(self, track_id: int, updates: Dict[str, Any]) -> Optional[Track]:
        allowed_updates = {
            key: value for key, value in updates.items() if key in ALLOWED_UPDATE_FIELDS
        }

        if not allowed_updates:
            return self.get_track_metadata(track_id)

        with self.db.get_connection() as conn:
            set_clause = ", ".join(f"{field} = ?" for field in allowed_updates.keys())
            params = list(allowed_updates.values()) + [track_id]
            query = f"UPDATE tracks SET {set_clause} WHERE id = ?"
            conn.execute(query, tuple(params))

            cursor = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
            track = cursor.fetchone()

        if not track:
            return None

        return Track.from_db_row(track)

    def delete_tracks(self, track_ids: List[int]) -> Dict[str, Any]:
        deleted = 0
        failed = 0
        errors = []

        for track_id in track_ids:
            try:
                track = self.get_track_metadata(track_id)
                if not track:
                    failed += 1
                    errors.append(f"Track {track_id}: Not found")
                    continue

                with self.db.get_connection() as conn:
                    conn.execute("DELETE FROM track_spatial WHERE id = ?", (track_id,))
                    cursor = conn.execute(
                        "DELETE FROM tracks WHERE id = ?", (track_id,)
                    )

                    if cursor.rowcount == 0:
                        failed += 1
                        errors.append(f"Track {track_id}: Database deletion failed")
                        continue

                self.storage.delete_gpx(track.hash)

                deleted += 1

            except Exception as e:
                failed += 1
                errors.append(f"Track {track_id}: {str(e)}")

        return {"deleted": deleted, "failed": failed, "errors": errors}
