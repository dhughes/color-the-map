"""Add creator field to tracks table

Revision ID: 82385426c458
Revises: 67ee1956bc6a
Create Date: 2026-01-31 17:57:51.248476

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "82385426c458"
down_revision: Union[str, None] = "67ee1956bc6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add creator column to tracks table
    op.add_column("tracks", sa.Column("creator", sa.String(), nullable=True))


def downgrade() -> None:
    # Remove creator column from tracks table
    op.drop_column("tracks", "creator")
