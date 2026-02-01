"""remove activity_type_inferred field

Revision ID: f65ecac1a552
Revises: 82385426c458
Create Date: 2026-02-01 17:45:23.112182

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f65ecac1a552"
down_revision: Union[str, None] = "82385426c458"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("tracks", "activity_type_inferred")


def downgrade() -> None:
    op.add_column(
        "tracks", sa.Column("activity_type_inferred", sa.String(), nullable=True)
    )
    op.execute("UPDATE tracks SET activity_type_inferred = activity_type")
