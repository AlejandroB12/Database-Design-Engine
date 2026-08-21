from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from auth.jwt_handler import decode_token
from core.database import get_db
from models.client_models import Client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

db_dependency = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: db_dependency,
) -> Client:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await db.get(Client, int(user_id))
    if user is None:
        raise credentials_exception
    return user
