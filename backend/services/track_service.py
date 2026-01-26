from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from .gpx_parser import GPXParser
from .storage_service import StorageService
from ..auth.models import Track as TrackModel
from ..models.track import Track
from ..models.upload_result import UploadResult
from ..models.track_geometry import TrackGeometry

ALLOWED_UPDATE_FIELDS = {"visible", "name", "activity_type", "description"}


class TrackService:
    def __init__(self, storage: StorageService, parser: GPXParser):
        self.storage = storage
        self.parser = parser

    def upload_track(
        self, filename: str, content: bytes, user_id: str, session: Session
    ) -> UploadResult:
        gpx_hash = self.storage.calculate_hash(content)

        existing = session.execute(
            select(TrackModel).where(
                TrackModel.hash == gpx_hash, TrackModel.user_id == user_id
            )
        ).scalar_one_or_none()

        if existing:
            return UploadResult(duplicate=True, track=Track.from_sqlalchemy(existing))

        try:
            gpx_data = self.parser.parse(content)
        except Exception as e:
            raise ValueError(f"Invalid GPX file: {e}")

        self.storage.store_gpx(user_id, gpx_hash, content)

        name = Path(filename).stem
        activity_type = "Unknown"

        track_model = TrackModel(
            user_id=user_id,
            hash=gpx_hash,
            name=name,
            filename=filename,
            activity_type=activity_type,
            activity_type_inferred=activity_type,
            activity_date=gpx_data.activity_date,
            distance_meters=gpx_data.distance_meters,
            duration_seconds=gpx_data.duration_seconds,
            avg_speed_ms=gpx_data.avg_speed_ms,
            max_speed_ms=gpx_data.max_speed_ms,
            min_speed_ms=gpx_data.min_speed_ms,
            elevation_gain_meters=gpx_data.elevation_gain_meters,
            elevation_loss_meters=gpx_data.elevation_loss_meters,
            bounds_min_lat=gpx_data.bounds_min_lat,
            bounds_max_lat=gpx_data.bounds_max_lat,
            bounds_min_lon=gpx_data.bounds_min_lon,
            bounds_max_lon=gpx_data.bounds_max_lon,
        )

        session.add(track_model)
        session.flush()

        return UploadResult(duplicate=False, track=Track.from_sqlalchemy(track_model))

    def get_track_metadata(
        self, track_id: int, user_id: str, session: Session
    ) -> Optional[Track]:
        track_model = session.execute(
            select(TrackModel).where(
                TrackModel.id == track_id, TrackModel.user_id == user_id
            )
        ).scalar_one_or_none()

        if not track_model:
            return None

        return Track.from_sqlalchemy(track_model)

    def list_tracks(self, user_id: str, session: Session) -> List[Track]:
        track_models = session.execute(
            select(TrackModel)
            .where(TrackModel.user_id == user_id)
            .order_by(TrackModel.activity_date.desc())
        ).scalars()

        return [Track.from_sqlalchemy(model) for model in track_models]

    def get_track_geometry(
        self, track_id: int, user_id: str, session: Session
    ) -> Optional[TrackGeometry]:
        track = self.get_track_metadata(track_id, user_id, session)
        if not track:
            return None

        gpx_content = self.storage.load_gpx(user_id, track.hash)
        if not gpx_content:
            return None

        gpx_data = self.parser.parse(gpx_content)

        return TrackGeometry(track_id=track_id, coordinates=gpx_data.coordinates)

    def get_multiple_geometries(
        self, track_ids: List[int], user_id: str, session: Session
    ) -> List[TrackGeometry]:
        geometries = []
        for track_id in track_ids:
            geometry = self.get_track_geometry(track_id, user_id, session)
            if geometry:
                geometries.append(geometry)
        return geometries

    def update_track(
        self, track_id: int, updates: Dict[str, Any], user_id: str, session: Session
    ) -> Optional[Track]:
        allowed_updates = {
            key: value for key, value in updates.items() if key in ALLOWED_UPDATE_FIELDS
        }

        track_model = session.execute(
            select(TrackModel).where(
                TrackModel.id == track_id, TrackModel.user_id == user_id
            )
        ).scalar_one_or_none()

        if not track_model:
            return None

        for key, value in allowed_updates.items():
            setattr(track_model, key, value)

        session.flush()

        return Track.from_sqlalchemy(track_model)

    def delete_tracks(
        self, track_ids: List[int], user_id: str, session: Session
    ) -> Dict[str, Any]:
        deleted = 0
        failed = 0
        errors = []
        files_to_delete = []

        for track_id in track_ids:
            try:
                track_model = session.execute(
                    select(TrackModel).where(
                        TrackModel.id == track_id, TrackModel.user_id == user_id
                    )
                ).scalar_one_or_none()

                if not track_model:
                    failed += 1
                    errors.append(f"Track {track_id}: Not found")
                    continue

                gpx_hash = track_model.hash
                session.delete(track_model)
                session.flush()

                files_to_delete.append((user_id, gpx_hash))
                deleted += 1

            except Exception as e:
                failed += 1
                errors.append(f"Track {track_id}: {str(e)}")

        return {
            "deleted": deleted,
            "failed": failed,
            "errors": errors,
            "files_to_delete": files_to_delete,
        }
