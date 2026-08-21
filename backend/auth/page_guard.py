import jwt
from fastapi import HTTPException, Request, status

from auth.jwt_handler import decode_token


def require_session(request: Request) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_303_SEE_OTHER,
        headers={"Location": "/login"},
    )
    token = request.cookies.get("access_token")
    if not token:
        raise unauthorized
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise jwt.PyJWTError
    except jwt.PyJWTError:
        raise unauthorized
    return payload
