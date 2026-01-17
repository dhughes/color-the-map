from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request
from typing import List
from .models import (
    TrackResponse,
    UploadResult,
    GeometryRequest,
    TrackGeometry,
    TrackUpdate,
    LocationResponse,
)
from ..services.track_service import TrackService
from ..config import config
from ..db.database import Database
from ..services.storage_service import StorageService
from ..services.gpx_parser import GPXParser

router = APIRouter()

db = Database(config.DB_PATH)
storage = StorageService(config.GPX_DIR)
parser = GPXParser()
track_service = TrackService(db, storage, parser)


@router.post(
    "/tracks", response_model=UploadResult, status_code=status.HTTP_201_CREATED
)
async def upload_tracks(files: List[UploadFile] = File(...)):
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

            result = track_service.upload_track(file.filename, content)

            if result.duplicate:
                track_ids.append(result.track.id)
            else:
                uploaded += 1
                track_ids.append(result.track.id)

        except Exception as e:
            failed += 1
            errors.append(f"{file.filename}: {str(e)}")

    return UploadResult(
        uploaded=uploaded, failed=failed, track_ids=track_ids, errors=errors
    )


@router.get("/tracks", response_model=List[TrackResponse])
async def list_tracks():
    tracks = track_service.list_tracks()
    return [TrackResponse.from_domain(track) for track in tracks]


@router.post("/tracks/geometry", response_model=List[TrackGeometry])
async def get_track_geometries(request: GeometryRequest):
    geometries = track_service.get_multiple_geometries(request.track_ids)
    return [TrackGeometry.from_domain(geometry) for geometry in geometries]


@router.patch("/tracks/{track_id}", response_model=TrackResponse)
async def update_track(track_id: int, update: TrackUpdate):
    track = track_service.update_track(track_id, update.model_dump(exclude_unset=True))

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    return TrackResponse.from_domain(track)


@router.get("/location", response_model=LocationResponse)
async def get_client_location(request: Request):
    """Get geographic location from client IP address."""
    from ..main import geoip_service

    if not geoip_service:
        raise HTTPException(status_code=503, detail="GeoIP service not available")

    # Extract real client IP from X-Forwarded-For header (set by Caddy reverse proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (client IP, before any proxies)
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        # Fallback to direct connection IP
        client_ip = request.client.host if request.client else None

    if not client_ip or client_ip in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=400, detail="Could not determine client IP")

    location = geoip_service.lookup_ip(client_ip)

    if not location:
        raise HTTPException(status_code=404, detail="Location not found for IP address")

    return LocationResponse(**location)
