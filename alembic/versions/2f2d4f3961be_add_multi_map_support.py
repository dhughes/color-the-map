"""add multi map support

Revision ID: 2f2d4f3961be
Revises: ccfdff876a7d
Create Date: 2026-02-07 13:16:28.404919

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2f2d4f3961be"
down_revision: Union[str, None] = "ccfdff876a7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_maps_user_id", "maps", ["user_id"])
    op.create_index("idx_maps_user_default", "maps", ["user_id", "is_default"])

    op.execute(
        """
        INSERT INTO maps (user_id, name, is_default, created_at, updated_at)
        SELECT DISTINCT user_id, 'My Map', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM tracks
    """
    )

    op.execute(
        """
        INSERT INTO maps (user_id, name, is_default, created_at, updated_at)
        SELECT id, 'My Map', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM users
        WHERE id NOT IN (SELECT DISTINCT user_id FROM tracks)
    """
    )

    op.add_column("tracks", sa.Column("map_id", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE tracks
        SET map_id = (
            SELECT id FROM maps
            WHERE maps.user_id = tracks.user_id
            AND maps.is_default = 1
            LIMIT 1
        )
    """
    )

    with op.batch_alter_table("tracks") as batch_op:
        batch_op.alter_column("map_id", nullable=False)
        batch_op.create_foreign_key(
            "fk_tracks_map_id", "maps", ["map_id"], ["id"], ondelete="CASCADE"
        )
        batch_op.drop_index("idx_tracks_user_hash")
        batch_op.create_index("idx_tracks_map_id", ["map_id"])
        batch_op.create_index("idx_tracks_map_hash", ["map_id", "hash"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("tracks") as batch_op:
        batch_op.drop_index("idx_tracks_map_hash")
        batch_op.drop_index("idx_tracks_map_id")
        batch_op.drop_constraint("fk_tracks_map_id", type_="foreignkey")
        batch_op.drop_column("map_id")
        batch_op.create_index("idx_tracks_user_hash", ["user_id", "hash"], unique=True)

    op.drop_index("idx_maps_user_default")
    op.drop_index("idx_maps_user_id")
    op.drop_table("maps")
