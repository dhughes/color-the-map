"""Baseline - existing database schema

Revision ID: 67ee1956bc6a
Revises:
Create Date: 2026-01-31 17:54:39.854784

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "67ee1956bc6a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration - database already exists with this schema
    pass


def downgrade() -> None:
    # Baseline migration - cannot downgrade from initial state
    pass
