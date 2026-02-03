from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    TrackResponse,
    UploadResult,
    GeometryRequest,
    TrackGeometry,
    TrackUpdate,
    LocationResponse,
    DeleteRequest,
    DeleteResult,
)
from ..services.track_service import TrackService
from ..config import config
from ..services.storage_service import StorageService
from ..services.gpx_parser import GPXParser
from ..auth.dependencies import current_active_user
from ..auth.models import User
from ..auth.database import get_async_session

router = APIRouter()

storage = StorageService(config.GPX_DIR)
parser = GPXParser()
track_service = TrackService(storage, parser)


@router.post("/tracks", response_model=UploadResult)
async def upload_tracks(
    files: List[UploadFile] = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    import logging
    from sqlalchemy.exc import IntegrityError
    from fastapi.responses import JSONResponse

    logger = logging.getLogger(__name__)

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
                file.filename, content, str(user.id), session
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
                f"Database integrity error uploading {file.filename} for user {user.id}: {str(e)}",
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
                f"Unexpected error uploading {file.filename} for user {user.id}: {str(e)}",
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


@router.get("/tracks", response_model=List[TrackResponse])
async def list_tracks(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    tracks = await track_service.list_tracks(str(user.id), session)
    return [TrackResponse.from_domain(track) for track in tracks]


@router.post("/tracks/geometry", response_model=List[TrackGeometry])
async def get_track_geometries(
    request: GeometryRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    geometries = await track_service.get_multiple_geometries(
        request.track_ids, str(user.id), session
    )
    return [TrackGeometry.from_domain(geometry) for geometry in geometries]


@router.patch("/tracks/{track_id}", response_model=TrackResponse)
async def update_track(
    track_id: int,
    update: TrackUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    track = await track_service.update_track(
        track_id, update.model_dump(exclude_unset=True), str(user.id), session
    )

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    await session.commit()

    return TrackResponse.from_domain(track)


@router.delete("/tracks", response_model=DeleteResult)
async def delete_tracks(
    request: DeleteRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await track_service.delete_tracks(request.track_ids, str(user.id), session)
    await session.commit()

    for gpx_hash in result.hashes_to_delete:
        storage.delete_gpx(str(user.id), gpx_hash)

    return DeleteResult(deleted=result.deleted)


@router.get("/location", response_model=LocationResponse)
async def get_client_location(request: Request):
    """Get geographic location from client IP address."""
    from ..main import geoip_service
    import logging

    logger = logging.getLogger(__name__)

    if not geoip_service:
        raise HTTPException(status_code=503, detail="GeoIP service not available")

    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    forwarded_for = request.headers.get("X-Forwarded-For")

    client_ip: str | None
    if cf_connecting_ip:
        client_ip = cf_connecting_ip.strip()
        logger.info(
            f"CF-Connecting-IP header: {cf_connecting_ip}, using client IP: {client_ip}"
        )
    elif forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        logger.info(
            f"X-Forwarded-For header: {forwarded_for}, using client IP: {client_ip}"
        )
    else:
        client_ip = request.client.host if request.client else None
        logger.info(f"No proxy headers, using direct IP: {client_ip}")

    if not client_ip or client_ip in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=400, detail="Could not determine client IP")

    location = geoip_service.lookup_ip(client_ip)

    if not location:
        logger.warning(f"No location found for IP: {client_ip}")
        raise HTTPException(status_code=404, detail="Location not found for IP address")

    logger.info(
        f"IP {client_ip} resolved to: {location.get('city', 'Unknown')}, "
        f"{location.get('country', 'Unknown')} "
        f"({location['latitude']}, {location['longitude']})"
    )

    return LocationResponse(
        latitude=float(location["latitude"]),  # type: ignore[arg-type]
        longitude=float(location["longitude"]),  # type: ignore[arg-type]
    )
