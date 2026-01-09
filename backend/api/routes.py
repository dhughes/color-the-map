from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from .models import (
    TrackResponse,
    UploadResult,
    GeometryRequest,
    TrackGeometry,
    TrackUpdate,
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
