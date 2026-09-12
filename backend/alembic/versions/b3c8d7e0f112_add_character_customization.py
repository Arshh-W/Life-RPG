"""add character customization fields

Revision ID: b3c8d7e0f112
Revises: a2b7c6d9e001
"""

from alembic import op
import sqlalchemy as sa


revision = "b3c8d7e0f112"
down_revision = "a2b7c6d9e001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("character_gender", sa.String(length=16), nullable=False, server_default="mage"))
    op.add_column("users", sa.Column("character_hair", sa.String(length=24), nullable=False, server_default="short"))
    op.add_column("users", sa.Column("character_mouth", sa.String(length=24), nullable=False, server_default="smile"))
    op.execute("UPDATE boss_challenges SET expires_at = NOW() + INTERVAL '5 minutes' WHERE status = 'active'")


def downgrade() -> None:
    op.drop_column("users", "character_mouth")
    op.drop_column("users", "character_hair")
    op.drop_column("users", "character_gender")