import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, session_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "sid": session_id, "exp": expires_at}, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> tuple[str, str] | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        session_id = payload.get("sid")
        return (subject, session_id) if isinstance(subject, str) and isinstance(session_id, str) else None
    except JWTError:
        return None