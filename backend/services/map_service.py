from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.engine import CursorResult
from ..models.map_model import Map as MapModel
from ..models.track_model import Track as TrackModel
from ..models.map import Map

ALLOWED_UPDATE_FIELDS = {"name"}


@dataclass
class MapDeleteResult:
    deleted: bool
    error: Optional[str] = None
    hashes_to_delete: List[str] = field(default_factory=list)


class MapService:
    async def create_map(
        self,
        name: str,
        user_id: str,
        is_default: bool,
        session: AsyncSession,
    ) -> Map:
        if is_default:
            await self._unset_other_defaults(user_id, session)

        map_model = MapModel(
            user_id=user_id,
            name=name,
            is_default=is_default,
        )

        session.add(map_model)
        await session.flush()

        return Map.from_sqlalchemy(map_model)

    async def get_map(
        self, map_id: int, user_id: str, session: AsyncSession
    ) -> Optional[Map]:
        result = await session.execute(
            select(MapModel).where(
                MapModel.id == map_id,
                MapModel.user_id == user_id,
            )
        )
        map_model = result.scalar_one_or_none()

        if not map_model:
            return None

        return Map.from_sqlalchemy(map_model)

    async def list_maps(self, user_id: str, session: AsyncSession) -> List[Map]:
        result = await session.execute(
            select(MapModel)
            .where(MapModel.user_id == user_id)
            .order_by(MapModel.is_default.desc(), MapModel.name)
        )
        map_models = result.scalars()

        return [Map.from_sqlalchemy(model) for model in map_models]

    async def update_map(
        self,
        map_id: int,
        updates: Dict[str, Any],
        user_id: str,
        session: AsyncSession,
    ) -> Optional[Map]:
        allowed_updates = {
            key: value for key, value in updates.items() if key in ALLOWED_UPDATE_FIELDS
        }

        if not allowed_updates:
            return await self.get_map(map_id, user_id, session)

        result = await session.execute(
            select(MapModel).where(
                MapModel.id == map_id,
                MapModel.user_id == user_id,
            )
        )
        map_model = result.scalar_one_or_none()

        if not map_model:
            return None

        for key, value in allowed_updates.items():
            setattr(map_model, key, value)

        await session.flush()
        await session.refresh(map_model)

        return Map.from_sqlalchemy(map_model)

    async def delete_map(
        self, map_id: int, user_id: str, session: AsyncSession
    ) -> MapDeleteResult:
        count_result = await session.execute(
            select(func.count(MapModel.id)).where(MapModel.user_id == user_id)
        )
        map_count = count_result.scalar_one()

        if map_count <= 1:
            return MapDeleteResult(deleted=False, error="Cannot delete the last map")

        hash_result = await session.execute(
            select(TrackModel.hash).where(
                TrackModel.map_id == map_id,
                TrackModel.user_id == user_id,
            )
        )
        candidate_hashes = list(hash_result.scalars().all())

        delete_tracks_stmt = delete(TrackModel).where(
            TrackModel.map_id == map_id,
            TrackModel.user_id == user_id,
        )
        await session.execute(delete_tracks_stmt)

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

        delete_map_stmt = delete(MapModel).where(
            MapModel.id == map_id,
            MapModel.user_id == user_id,
        )
        cursor_result = cast(CursorResult[Any], await session.execute(delete_map_stmt))

        deleted = cursor_result.rowcount > 0
        return MapDeleteResult(
            deleted=deleted, hashes_to_delete=hashes_to_delete if deleted else []
        )

    async def ensure_default_map(self, user_id: str, session: AsyncSession) -> Map:
        result = await session.execute(
            select(MapModel).where(
                MapModel.user_id == user_id,
                MapModel.is_default == True,  # noqa: E712
            )
        )
        default_map = result.scalar_one_or_none()

        if default_map:
            return Map.from_sqlalchemy(default_map)

        return await self.create_map(
            name="My Map",
            user_id=user_id,
            is_default=True,
            session=session,
        )

    async def _unset_other_defaults(self, user_id: str, session: AsyncSession) -> None:
        update_stmt = (
            update(MapModel).where(MapModel.user_id == user_id).values(is_default=False)
        )
        await session.execute(update_stmt)
