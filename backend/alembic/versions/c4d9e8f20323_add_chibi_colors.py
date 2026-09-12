"""add chibi color customization fields

Revision ID: c4d9e8f20323
Revises: b3c8d7e0f112
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d9e8f20323"
down_revision = "b3c8d7e0f112"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("character_hair_color", sa.String(length=24), nullable=False, server_default="brown"))
    op.add_column("users", sa.Column("character_skin_color", sa.String(length=24), nullable=False, server_default="warm"))
    op.add_column("users", sa.Column("character_outfit_color", sa.String(length=24), nullable=False, server_default="blue"))
    op.execute("UPDATE users SET character_gender = 'male' WHERE character_gender = 'mage'")
    op.execute("UPDATE users SET character_gender = 'female' WHERE character_gender = 'rogue'")


def downgrade() -> None:
    op.drop_column("users", "character_outfit_color")
    op.drop_column("users", "character_skin_color")
    op.drop_column("users", "character_hair_color")