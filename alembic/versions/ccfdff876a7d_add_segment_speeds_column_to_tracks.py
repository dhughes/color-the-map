"""add_segment_speeds_column_to_tracks

Revision ID: ccfdff876a7d
Revises: d3e7230c7b30
Create Date: 2026-02-06 08:12:12.417697

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ccfdff876a7d"
down_revision: Union[str, None] = "d3e7230c7b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tracks", sa.Column("segment_speeds", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("tracks", "segment_speeds")
