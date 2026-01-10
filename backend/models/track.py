from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Track:
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
    bounds_min_lon: Optional[float]
    bounds_max_lat: Optional[float]
    bounds_max_lon: Optional[float]

    visible: bool
    description: Optional[str]

    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_db_row(cls, row) -> "Track":
        """Create Track from sqlite3.Row, parsing datetime strings"""

        def parse_datetime(value) -> datetime:
            if isinstance(value, str):
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            return value

        return cls(
            id=row["id"],
            hash=row["hash"],
            name=row["name"],
            filename=row["filename"],
            activity_type=row["activity_type"],
            activity_type_inferred=row["activity_type_inferred"],
            activity_date=parse_datetime(row["activity_date"]),
            uploaded_at=parse_datetime(row["uploaded_at"]),
            distance_meters=row["distance_meters"],
            duration_seconds=row["duration_seconds"],
            avg_speed_ms=row["avg_speed_ms"],
            max_speed_ms=row["max_speed_ms"],
            min_speed_ms=row["min_speed_ms"],
            elevation_gain_meters=row["elevation_gain_meters"],
            elevation_loss_meters=row["elevation_loss_meters"],
            bounds_min_lat=row["bounds_min_lat"],
            bounds_min_lon=row["bounds_min_lon"],
            bounds_max_lat=row["bounds_max_lat"],
            bounds_max_lon=row["bounds_max_lon"],
            visible=bool(row["visible"]),
            description=row["description"],
            created_at=parse_datetime(row["created_at"]),
            updated_at=parse_datetime(row["updated_at"]),
        )
