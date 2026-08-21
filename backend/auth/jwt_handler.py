from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from core.config import settings


def _create_token(subject: str | Any, expires_delta: timedelta, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": str(subject), "exp": expire, "type": token_type}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        subject,
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes),
        token_type="access",
    )


def create_refresh_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        subject,
        expires_delta or timedelta(days=settings.refresh_token_expire_days),
        token_type="refresh",
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
