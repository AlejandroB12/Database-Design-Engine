from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from auth.hash_handler import verify_password
from auth.jwt_handler import create_access_token, create_refresh_token
from core.config import settings
from models.client_models import Client
from repositories.login_repository import LoginRepository
from schemas.login_schema import LoginRequest, TokenResponse


class LoginService:
    def __init__(self, repository: LoginRepository):
        self.repository = repository

    async def login(self, credentials: LoginRequest) -> TokenResponse:
        client = await self._authenticate(credentials)
        access_token = create_access_token(client.id_client)
        refresh_token = create_refresh_token(client.id_client)

        await self.repository.save_refresh_token(
            client_id=client.id_client,
            refresh_token=refresh_token,
            expires_in=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def _authenticate(self, credentials: LoginRequest) -> Client:
        client = await self.repository.get_by_email(credentials.email)
        if client is None or not verify_password(credentials.password, client.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return client
