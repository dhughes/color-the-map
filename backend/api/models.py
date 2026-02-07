from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from ..models.track import Track
    from ..models.track_geometry_data import TrackGeometryData
    from ..models.map import Map


class TrackResponse(BaseModel):
    id: int
    user_id: str
    map_id: int
    hash: str
    name: str
    filename: str
    creator: Optional[str]
    activity_type: Optional[str]
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

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_domain(cls, track: "Track") -> "TrackResponse":
        """Convert domain Track to API TrackResponse"""
        return cls.model_validate(track, from_attributes=True)


class BatchUploadResponse(BaseModel):
    uploaded: int
    failed: int
    track_ids: List[int]
    errors: List[str]


class GeometryRequest(BaseModel):
    track_ids: List[int]


class TrackGeometry(BaseModel):
    track_id: int
    coordinates: List[List[float]]
    segment_speeds: Optional[List[float]] = None

    @classmethod
    def from_domain(cls, geometry: "TrackGeometryData") -> "TrackGeometry":
        return cls(
            track_id=geometry.track_id,
            coordinates=[list(coord) for coord in geometry.coordinates],
            segment_speeds=geometry.segment_speeds,
        )


class TrackUpdate(BaseModel):
    visible: Optional[bool] = None
    name: Optional[str] = None
    activity_type: Optional[str] = None


class LocationResponse(BaseModel):
    latitude: float
    longitude: float


class DeleteRequest(BaseModel):
    track_ids: List[int]


class DeleteResult(BaseModel):
    deleted: int


class BulkUpdateRequest(BaseModel):
    track_ids: List[int]
    updates: TrackUpdate


class BulkUpdateResult(BaseModel):
    updated: int


class MapResponse(BaseModel):
    id: int
    user_id: str
    name: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_domain(cls, map_obj: "Map") -> "MapResponse":
        return cls.model_validate(map_obj, from_attributes=True)


class MapCreate(BaseModel):
    name: str


class MapUpdate(BaseModel):
    name: Optional[str] = None


class MapDeleteResponse(BaseModel):
    deleted: bool
