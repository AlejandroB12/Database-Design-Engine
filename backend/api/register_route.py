from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from repositories.register_repository import RegisterRepository
from schemas.register_schema import RegisterRequest, RegisterResponse
from service.register_service import RegisterService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    service = RegisterService(RegisterRepository(db))
    return await service.register(data)
