"""add user interests for personalized bonus quests

Revision ID: a2b7c6d9e001
Revises: c99a538c0e59
Create Date: 2026-09-12 20:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a2b7c6d9e001"
down_revision = "c99a538c0e59"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("interests", sa.String(length=500), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("users", "interests")