from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Track:
    id: int
    user_id: str
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
    bounds_min_lon: Optional[float]
    bounds_max_lat: Optional[float]
    bounds_max_lon: Optional[float]

    visible: bool

    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_sqlalchemy(cls, model) -> "Track":
        """Create Track from SQLAlchemy model"""
        return cls(
            id=model.id,
            user_id=model.user_id,
            hash=model.hash,
            name=model.name,
            filename=model.filename,
            creator=model.creator,
            activity_type=model.activity_type,
            activity_date=model.activity_date,
            uploaded_at=model.uploaded_at,
            distance_meters=model.distance_meters,
            duration_seconds=model.duration_seconds,
            avg_speed_ms=model.avg_speed_ms,
            max_speed_ms=model.max_speed_ms,
            min_speed_ms=model.min_speed_ms,
            elevation_gain_meters=model.elevation_gain_meters,
            elevation_loss_meters=model.elevation_loss_meters,
            bounds_min_lat=model.bounds_min_lat,
            bounds_min_lon=model.bounds_min_lon,
            bounds_max_lat=model.bounds_max_lat,
            bounds_max_lon=model.bounds_max_lon,
            visible=model.visible,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
