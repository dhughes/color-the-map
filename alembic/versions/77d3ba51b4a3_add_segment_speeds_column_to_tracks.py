"""add segment_speeds column to tracks

Revision ID: 77d3ba51b4a3
Revises: 6604a00d174f
Create Date: 2026-02-04 21:43:45.747945

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "77d3ba51b4a3"
down_revision: Union[str, None] = "6604a00d174f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tracks", sa.Column("segment_speeds", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("tracks", "segment_speeds")
