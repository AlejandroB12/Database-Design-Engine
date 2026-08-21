from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=16)
    last_name: str = Field(min_length=1, max_length=16)
    email: EmailStr = Field(max_length=60)
    password: str = Field(min_length=8, max_length=72)
    user_name: str | None = Field(default=None, min_length=3, max_length=20)


class RegisterResponse(BaseModel):
    id_client: int
    first_name: str
    last_name: str
    user_name: str
    email: str
