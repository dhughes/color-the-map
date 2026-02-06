from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    DateTime,
    func,
    Index,
    Integer,
    Float,
    Boolean,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    creator: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    activity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    activity_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    distance_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_speed_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_speed_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_speed_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    elevation_gain_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    elevation_loss_meters: Mapped[float | None] = mapped_column(Float, nullable=True)

    bounds_min_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    bounds_min_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    bounds_max_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    bounds_max_lon: Mapped[float | None] = mapped_column(Float, nullable=True)

    visible: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    coordinates: Mapped[List[List[float]] | None] = mapped_column(JSON, nullable=True)
    segment_speeds: Mapped[List[float] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_tracks_hash", "hash"),
        Index("idx_tracks_date", "activity_date"),
        Index("idx_tracks_type", "activity_type"),
        Index("idx_tracks_user_id", "user_id"),
        Index("idx_tracks_user_hash", "user_id", "hash", unique=True),
    )
