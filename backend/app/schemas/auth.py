from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("display_name")
    @classmethod
    def display_name_must_contain_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Display name cannot be blank")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    xp: int
    level: int
    discipline: int
    health: int
    intelligence: int
    strength: int
    emotional_intelligence: int
    coins: int
    streak_count: int


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=200)