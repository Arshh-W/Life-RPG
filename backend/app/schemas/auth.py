from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    
    character_gender: str = Field(default="male", max_length=16)
    character_hair: str = Field(default="short", max_length=24)
    character_mouth: str = Field(default="smile", max_length=24)
    character_hair_color: str = Field(default="brown", max_length=24)
    character_skin_color: str = Field(default="warm", max_length=24)
    character_outfit_color: str = Field(default="blue", max_length=24)
    password: str = Field(min_length=8, max_length=128)

    # --- NEW ARCANE ONBOARDING FIELDS ---
    profession: Optional[str] = Field(default=None, max_length=100)
    grand_goal: Optional[str] = Field(default=None, max_length=255)

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
    interests: str
    
    # --- NEW ARCANE ONBOARDING FIELDS ---
    profession: Optional[str]
    grand_goal: Optional[str]
    
    character_gender: str
    character_hair: str
    character_mouth: str
    character_hair_color: str
    character_skin_color: str
    character_outfit_color: str
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


class CharacterUpdate(BaseModel):
    character_gender: str = Field(min_length=1, max_length=16)
    character_hair: str = Field(min_length=1, max_length=24)
    character_mouth: str = Field(min_length=1, max_length=24)
    character_hair_color: str = Field(min_length=1, max_length=24)
    character_skin_color: str = Field(min_length=1, max_length=24)
    character_outfit_color: str = Field(min_length=1, max_length=24)