import re

from fastapi import HTTPException, status

from auth.hash_handler import hash_password
from models.client_models import Client
from repositories.register_repository import RegisterRepository
from schemas.register_schema import RegisterRequest, RegisterResponse


class RegisterService:
    def __init__(self, repository: RegisterRepository):
        self.repository = repository

    async def register(self, data: RegisterRequest) -> RegisterResponse:
        email = data.email.lower()

        if await self.repository.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado",
            )

        user_name = self._resolve_user_name(data)
        if await self.repository.get_by_user_name(user_name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está en uso",
            )

        client = Client(
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            user_name=user_name,
            email=email,
            password=hash_password(data.password),
        )
        client = await self.repository.create(client)

        return RegisterResponse(
            id_client=client.id_client,
            first_name=client.first_name,
            last_name=client.last_name,
            user_name=client.user_name,
            email=client.email,
        )

    @staticmethod
    def _resolve_user_name(data: RegisterRequest) -> str:
        candidate = data.user_name or data.email.split("@")[0]
        candidate = re.sub(r"[^a-zA-Z0-9_]", "", candidate)[:20]
        if len(candidate) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No se pudo generar un nombre de usuario válido",
            )
        return candidate
