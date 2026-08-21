from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.client_models import Client
from models.token_models import Token


class LoginRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.email == email))
        return result.scalar_one_or_none()

    async def save_refresh_token(self, client_id: int, refresh_token: str, expires_in) -> Token:
        token = Token(
            id_client=client_id,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token
