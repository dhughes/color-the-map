import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from .models import (
    MapResponse,
    MapCreate,
    MapUpdate,
    MapDeleteResponse,
    TrackResponse,
    BatchUploadResponse,
    GeometryRequest,
    TrackGeometry,
    TrackUpdate,
    DeleteRequest,
    DeleteResult,
    BulkUpdateRequest,
    BulkUpdateResult,
)
from ..services.map_service import MapService
from ..services.track_service import TrackService
from ..config import config
from ..services.storage_service import StorageService
from ..services.gpx_parser import GPXParser
from ..auth.dependencies import current_active_user
from ..auth.models import User
from ..auth.database import get_async_session

logger = logging.getLogger(__name__)

router = APIRouter()
map_service = MapService()

storage = StorageService(config.GPX_DIR)
parser = GPXParser()
track_service = TrackService(storage, parser)


@router.post("/maps", response_model=MapResponse, status_code=status.HTTP_201_CREATED)
async def create_map(
    map_data: MapCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    new_map = await map_service.create_map(
        name=map_data.name,
        user_id=str(user.id),
        session=session,
    )
    await session.commit()

    return MapResponse.from_domain(new_map)


@router.get("/maps", response_model=List[MapResponse])
async def list_maps(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    maps = await map_service.list_maps(str(user.id), session)
    return [MapResponse.from_domain(m) for m in maps]


@router.patch("/maps/{map_id}", response_model=MapResponse)
async def update_map(
    map_id: int,
    update: MapUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    updated_map = await map_service.update_map(
        map_id,
        update.model_dump(exclude_unset=True),
        str(user.id),
        session,
    )

    if not updated_map:
        raise HTTPException(status_code=404, detail="Map not found")

    await session.commit()

    return MapResponse.from_domain(updated_map)


@router.delete("/maps/{map_id}", response_model=MapDeleteResponse)
async def delete_map(
    map_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    result = await map_service.delete_map(map_id, user_id, session)

    if not result.deleted:
        if result.error:
            raise HTTPException(status_code=400, detail=result.error)
        raise HTTPException(status_code=404, detail="Map not found")

    await session.commit()

    for gpx_hash in result.hashes_to_delete:
        storage.delete_gpx(user_id, gpx_hash)

    return MapDeleteResponse(deleted=True)


@router.post("/maps/{map_id}/tracks", response_model=BatchUploadResponse)
async def upload_tracks(
    map_id: int,
    files: List[UploadFile] = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    uploaded = 0
    failed = 0
    track_ids = []
    errors = []

    for file in files:
        try:
            if not file.filename or not file.filename.endswith(".gpx"):
                failed += 1
                errors.append(f"{file.filename or 'unknown'}: Not a GPX file")
                continue

            content = await file.read()

            if len(content) > config.MAX_FILE_SIZE:
                failed += 1
                errors.append(f"{file.filename}: File too large")
                continue

            result = await track_service.upload_track(
                file.filename, content, map_id, user_id, session
            )

            if result.duplicate:
                track_ids.append(result.track.id)
            else:
                uploaded += 1
                track_ids.append(result.track.id)

            await session.commit()

        except IntegrityError as e:
            await session.rollback()
            failed += 1
            logger.error(
                f"Database integrity error uploading {file.filename} "
                f"for user {user.id}: {str(e)}",
                exc_info=True,
            )
            errors.append(f"{file.filename}: Unable to process file")
        except ValueError as e:
            await session.rollback()
            failed += 1
            logger.warning(f"Validation error uploading {file.filename}: {str(e)}")
            errors.append(f"{file.filename}: Invalid GPX file")
        except Exception as e:
            await session.rollback()
            failed += 1
            logger.error(
                f"Unexpected error uploading {file.filename} "
                f"for user {user.id}: {str(e)}",
                exc_info=True,
            )
            errors.append(f"{file.filename}: Unable to process file")

    response_data = {
        "uploaded": uploaded,
        "failed": failed,
        "track_ids": track_ids,
        "errors": errors,
    }

    if uploaded > 0:
        return JSONResponse(content=response_data, status_code=status.HTTP_201_CREATED)
    elif failed > 0:
        return JSONResponse(
            content=response_data, status_code=status.HTTP_400_BAD_REQUEST
        )
    else:
        return JSONResponse(content=response_data, status_code=status.HTTP_200_OK)


@router.get("/maps/{map_id}/tracks", response_model=List[TrackResponse])
async def list_tracks(
    map_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    tracks = await track_service.list_tracks(map_id, user_id, session)
    return [TrackResponse.from_domain(track) for track in tracks]


@router.post("/maps/{map_id}/tracks/geometry", response_model=List[TrackGeometry])
async def get_track_geometries(
    map_id: int,
    request: GeometryRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    geometries = await track_service.get_multiple_geometries(
        request.track_ids, map_id, user_id, session
    )
    return [TrackGeometry.from_domain(geometry) for geometry in geometries]


@router.patch("/maps/{map_id}/tracks/bulk", response_model=BulkUpdateResult)
async def bulk_update_tracks(
    map_id: int,
    request: BulkUpdateRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    updated = await track_service.update_tracks(
        request.track_ids,
        request.updates.model_dump(exclude_unset=True),
        map_id,
        user_id,
        session,
    )
    await session.commit()

    return BulkUpdateResult(updated=updated)


@router.patch("/maps/{map_id}/tracks/{track_id}", response_model=TrackResponse)
async def update_track(
    map_id: int,
    track_id: int,
    update: TrackUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    track = await track_service.update_track(
        track_id,
        update.model_dump(exclude_unset=True),
        map_id,
        user_id,
        session,
    )

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    await session.commit()

    return TrackResponse.from_domain(track)


@router.delete("/maps/{map_id}/tracks", response_model=DeleteResult)
async def delete_tracks(
    map_id: int,
    request: DeleteRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(user.id)
    map_obj = await map_service.get_map(map_id, user_id, session)
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    result = await track_service.delete_tracks(
        request.track_ids, map_id, user_id, session
    )
    await session.commit()

    for gpx_hash in result.hashes_to_delete:
        storage.delete_gpx(user_id, gpx_hash)

    return DeleteResult(deleted=result.deleted)
