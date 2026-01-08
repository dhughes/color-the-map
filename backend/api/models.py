from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TrackResponse(BaseModel):
    id: int
    hash: str
    name: str
    filename: str
    activity_type: Optional[str]
    activity_type_inferred: Optional[str]
    activity_date: datetime
    uploaded_at: datetime

    distance_meters: Optional[float]
    duration_seconds: Optional[int]
    avg_speed_ms: Optional[float]
    max_speed_ms: Optional[float]
    min_speed_ms: Optional[float]
    elevation_gain_meters: Optional[float]
    elevation_loss_meters: Optional[float]

    bounds_min_lat: Optional[float]
    bounds_max_lat: Optional[float]
    bounds_min_lon: Optional[float]
    bounds_max_lon: Optional[float]

    visible: bool
    description: Optional[str]

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class UploadResult(BaseModel):
    uploaded: int
    failed: int
    track_ids: List[int]
    errors: List[str]

class GeometryRequest(BaseModel):
    track_ids: List[int]

class TrackGeometry(BaseModel):
    track_id: int
    coordinates: List[List[float]]
