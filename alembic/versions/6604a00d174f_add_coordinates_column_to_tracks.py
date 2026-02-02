"""add_coordinates_column_to_tracks

Revision ID: 6604a00d174f
Revises: f65ecac1a552
Create Date: 2026-02-01 21:53:02.584215

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6604a00d174f"
down_revision: Union[str, None] = "f65ecac1a552"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tracks", sa.Column("coordinates", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("tracks", "coordinates")
