from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.client_models import Client


class RegisterRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.email == email))
        return result.scalar_one_or_none()

    async def get_by_user_name(self, user_name: str) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.user_name == user_name))
        return result.scalar_one_or_none()

    async def create(self, client: Client) -> Client:
        self.db.add(client)
        await self.db.commit()
        await self.db.refresh(client)
        return client
