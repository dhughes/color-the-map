from datetime import datetime
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import (
    String,
    DateTime,
    func,
    Index,
    Integer,
    ForeignKey,
    Float,
    Boolean,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
import hashlib


class Base(DeclarativeBase):
    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    __table_args__ = (Index("idx_refresh_token_user", "user_id"),)


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    activity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    activity_type_inferred: Mapped[str | None] = mapped_column(String, nullable=True)
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
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

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
