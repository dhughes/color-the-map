"""Baseline - existing database schema

Revision ID: 67ee1956bc6a
Revises:
Create Date: 2026-01-31 17:54:39.854784

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "67ee1956bc6a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Create refresh_tokens table
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("idx_refresh_token_user", "refresh_tokens", ["user_id"])
    op.create_index(
        op.f("ix_refresh_tokens_token_hash"),
        "refresh_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_refresh_tokens_expires_at"), "refresh_tokens", ["expires_at"]
    )

    # Create tracks table (without creator field - that comes in next migration)
    op.create_table(
        "tracks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("hash", sa.String(64), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("activity_type", sa.String(), nullable=True),
        sa.Column("activity_type_inferred", sa.String(), nullable=True),
        sa.Column("activity_date", sa.DateTime(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("avg_speed_ms", sa.Float(), nullable=True),
        sa.Column("max_speed_ms", sa.Float(), nullable=True),
        sa.Column("min_speed_ms", sa.Float(), nullable=True),
        sa.Column("elevation_gain_meters", sa.Float(), nullable=True),
        sa.Column("elevation_loss_meters", sa.Float(), nullable=True),
        sa.Column("bounds_min_lat", sa.Float(), nullable=True),
        sa.Column("bounds_min_lon", sa.Float(), nullable=True),
        sa.Column("bounds_max_lat", sa.Float(), nullable=True),
        sa.Column("bounds_max_lon", sa.Float(), nullable=True),
        sa.Column("visible", sa.Boolean(), default=True, server_default="1"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("idx_tracks_hash", "tracks", ["hash"])
    op.create_index("idx_tracks_date", "tracks", ["activity_date"])
    op.create_index("idx_tracks_type", "tracks", ["activity_type"])
    op.create_index("idx_tracks_user_id", "tracks", ["user_id"])
    op.create_index("idx_tracks_user_hash", "tracks", ["user_id", "hash"], unique=True)


def downgrade() -> None:
    op.drop_table("tracks")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
