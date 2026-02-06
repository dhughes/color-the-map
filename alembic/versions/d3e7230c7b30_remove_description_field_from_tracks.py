"""remove description field from tracks

Revision ID: d3e7230c7b30
Revises: 6604a00d174f
Create Date: 2026-02-06 06:17:43.438410

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d3e7230c7b30"
down_revision: Union[str, None] = "6604a00d174f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("tracks", "description")


def downgrade() -> None:
    op.add_column("tracks", sa.Column("description", sa.Text(), nullable=True))
