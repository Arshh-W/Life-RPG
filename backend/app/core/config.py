from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://liferpg:liferpg@localhost:5432/liferpg"
    secret_key: str = Field(default="change-this-development-secret-key-please", min_length=32)
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 30
    cors_origins: list[str] = ["http://localhost:5173"]
    ai_gateway_base_url: str | None = Field(default=None, validation_alias=AliasChoices("NEON_AI_GATEWAY_BASE_URL", "AI_GATEWAY_BASE_URL"))
    ai_gateway_token: str | None = Field(default=None, validation_alias=AliasChoices("NEON_AI_GATEWAY_TOKEN", "AI_GATEWAY_TOKEN"))
    ai_gateway_model: str = Field(default="gemini-3-flash", validation_alias=AliasChoices("NEON_AI_GATEWAY_MODEL", "AI_GATEWAY_MODEL"))

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()