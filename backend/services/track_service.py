from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, List, Tuple, cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.engine import CursorResult
from .gpx_parser import GPXParser
from .storage_service import StorageService
from ..models.track_model import Track as TrackModel
from ..models.track import Track
from ..models.track_upload_result import TrackUploadResult
from ..models.track_geometry_data import TrackGeometryData

ALLOWED_UPDATE_FIELDS = {"visible", "name", "activity_type"}


@dataclass
class DeleteResult:
    deleted: int
    hashes_to_delete: List[str]


class TrackService:
    def __init__(self, storage: StorageService, parser: GPXParser):
        self.storage = storage
        self.parser = parser

    async def upload_track(
        self,
        filename: str,
        content: bytes,
        map_id: int,
        user_id: str,
        session: AsyncSession,
    ) -> TrackUploadResult:
        gpx_hash = self.storage.calculate_hash(content)

        result = await session.execute(
            select(TrackModel).where(
                TrackModel.hash == gpx_hash, TrackModel.map_id == map_id
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            return TrackUploadResult(
                duplicate=True, track=Track.from_sqlalchemy(existing)
            )

        try:
            gpx_data = self.parser.parse(content)
        except Exception as e:
            raise ValueError(f"Invalid GPX file: {e}")

        self.storage.store_gpx(user_id, gpx_hash, content)

        name = Path(filename).stem
        activity_type = GPXParser.infer_activity_type(filename)

        reduced_coordinates: List[List[float]] = [
            list(coord) for coord in gpx_data.coordinates[::2]
        ]

        reduced_speeds: List[float] | None = None
        if gpx_data.segment_speeds:
            speeds = gpx_data.segment_speeds
            reduced_speeds = [
                (speeds[i] + speeds[i + 1]) / 2 for i in range(0, len(speeds) - 1, 2)
            ][: len(reduced_coordinates) - 1]

        track_model = TrackModel(
            user_id=user_id,
            map_id=map_id,
            hash=gpx_hash,
            name=name,
            filename=filename,
            creator=gpx_data.creator,
            activity_type=activity_type,
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
            coordinates=reduced_coordinates,
            segment_speeds=reduced_speeds,
        )

        session.add(track_model)
        await session.flush()

        return TrackUploadResult(
            duplicate=False, track=Track.from_sqlalchemy(track_model)
        )

    async def get_track_metadata(
        self, track_id: int, map_id: int, user_id: str, session: AsyncSession
    ) -> Optional[Track]:
        result = await session.execute(
            select(TrackModel).where(
                TrackModel.id == track_id,
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        track_model = result.scalar_one_or_none()

        if not track_model:
            return None

        return Track.from_sqlalchemy(track_model)

    async def list_tracks(
        self, map_id: int, user_id: str, session: AsyncSession
    ) -> List[Track]:
        result = await session.execute(
            select(TrackModel)
            .where(TrackModel.map_id == map_id, TrackModel.user_id == user_id)
            .order_by(TrackModel.activity_date.desc())
        )
        track_models = result.scalars()

        return [Track.from_sqlalchemy(model) for model in track_models]

    async def get_track_geometry(
        self, track_id: int, map_id: int, user_id: str, session: AsyncSession
    ) -> Optional[TrackGeometryData]:
        result = await session.execute(
            select(TrackModel).where(
                TrackModel.id == track_id,
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        track = result.scalar_one_or_none()

        if not track or not track.coordinates:
            return None

        coordinates: List[Tuple[float, float]] = [
            cast(Tuple[float, float], tuple(coord)) for coord in track.coordinates
        ]
        return TrackGeometryData(
            track_id=track_id,
            coordinates=coordinates,
            segment_speeds=track.segment_speeds,
        )

    async def get_multiple_geometries(
        self, track_ids: List[int], map_id: int, user_id: str, session: AsyncSession
    ) -> List[TrackGeometryData]:
        if not track_ids:
            return []

        result = await session.execute(
            select(TrackModel).where(
                TrackModel.id.in_(track_ids),
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        track_models = result.scalars()

        geometries = []
        for track_model in track_models:
            if track_model.coordinates:
                coordinates: List[Tuple[float, float]] = [
                    cast(Tuple[float, float], tuple(coord))
                    for coord in track_model.coordinates
                ]
                geometries.append(
                    TrackGeometryData(
                        track_id=track_model.id,
                        coordinates=coordinates,
                        segment_speeds=track_model.segment_speeds,
                    )
                )

        return geometries

    async def update_track(
        self,
        track_id: int,
        updates: Dict[str, Any],
        map_id: int,
        user_id: str,
        session: AsyncSession,
    ) -> Optional[Track]:
        allowed_updates = {
            key: value for key, value in updates.items() if key in ALLOWED_UPDATE_FIELDS
        }

        result = await session.execute(
            select(TrackModel).where(
                TrackModel.id == track_id,
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        track_model = result.scalar_one_or_none()

        if not track_model:
            return None

        for key, value in allowed_updates.items():
            setattr(track_model, key, value)

        await session.flush()
        await session.refresh(track_model)

        return Track.from_sqlalchemy(track_model)

    async def delete_tracks(
        self, track_ids: List[int], map_id: int, user_id: str, session: AsyncSession
    ) -> DeleteResult:
        if not track_ids:
            return DeleteResult(deleted=0, hashes_to_delete=[])

        result = await session.execute(
            select(TrackModel.hash).where(
                TrackModel.id.in_(track_ids),
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        candidate_hashes = list(result.scalars().all())

        delete_stmt = delete(TrackModel).where(
            TrackModel.id.in_(track_ids),
            TrackModel.map_id == map_id,
            TrackModel.user_id == user_id,
        )
        cursor_result = cast(CursorResult[Any], await session.execute(delete_stmt))

        hashes_to_delete: List[str] = []
        if candidate_hashes:
            still_used = await session.execute(
                select(TrackModel.hash)
                .where(
                    TrackModel.user_id == user_id,
                    TrackModel.hash.in_(candidate_hashes),
                )
                .distinct()
            )
            still_used_hashes = set(still_used.scalars().all())
            hashes_to_delete = [
                h for h in candidate_hashes if h not in still_used_hashes
            ]

        return DeleteResult(
            deleted=cursor_result.rowcount, hashes_to_delete=hashes_to_delete
        )

    async def update_tracks(
        self,
        track_ids: List[int],
        updates: Dict[str, Any],
        map_id: int,
        user_id: str,
        session: AsyncSession,
    ) -> int:
        if not track_ids:
            return 0

        allowed_updates = {
            key: value for key, value in updates.items() if key in ALLOWED_UPDATE_FIELDS
        }

        if not allowed_updates:
            return 0

        update_stmt = (
            update(TrackModel)
            .where(
                TrackModel.id.in_(track_ids),
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
            .values(**allowed_updates)
        )
        cursor_result = cast(CursorResult[Any], await session.execute(update_stmt))

        return cursor_result.rowcount
