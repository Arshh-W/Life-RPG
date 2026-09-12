"""init

Revision ID: c99a538c0e59
Revises: 
Create Date: 2026-09-12 13:46:41.568401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c99a538c0e59'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    uuid = postgresql.UUID(as_uuid=True)
    op.create_table(
        "users",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("discipline", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("health", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("intelligence", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("strength", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("emotional_intelligence", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("coins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("streak_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "user_sessions",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("ix_user_sessions_refresh_token_hash", "user_sessions", ["refresh_token_hash"], unique=True)
    op.create_table(
        "shop_items",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=240), nullable=False),
        sa.Column("cost", sa.Integer(), nullable=False),
        sa.Column("rarity", sa.String(length=24), nullable=False, server_default="common"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_shop_items_slug", "shop_items", ["slug"], unique=True)
    op.create_table(
        "tasks",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("is_mandatory", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_status", sa.String(length=24), nullable=False, server_default="not_required"),
        sa.Column("verification_hash", sa.String(length=64), nullable=True),
        sa.Column("verification_submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"])
    op.create_table(
        "boss_challenges",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("hp_total", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("hp_remaining", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("coin_reward", sa.Integer(), nullable=False),
        sa.Column("hp_penalty", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
        sa.Column("penalty_applied", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_boss_challenges_user_id", "boss_challenges", ["user_id"])
    op.create_table(
        "activity_logs",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", uuid, sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("xp_delta", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_table(
        "inventory_items",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", uuid, sa.ForeignKey("shop_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("purchased_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "item_id", name="uq_inventory_user_item"),
    )
    op.create_index("ix_inventory_items_user_id", "inventory_items", ["user_id"])
    op.create_index("ix_inventory_items_item_id", "inventory_items", ["item_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_inventory_items_item_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_user_id", table_name="inventory_items")
    op.drop_table("inventory_items")
    op.drop_index("ix_activity_logs_user_id", table_name="activity_logs")
    op.drop_table("activity_logs")
    op.drop_index("ix_boss_challenges_user_id", table_name="boss_challenges")
    op.drop_table("boss_challenges")
    op.drop_index("ix_tasks_user_id", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_user_sessions_refresh_token_hash", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_shop_items_slug", table_name="shop_items")
    op.drop_table("shop_items")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
