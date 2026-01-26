from fastapi_users import schemas
from pydantic import EmailStr, Field


class UserRead(schemas.BaseUser[str]):
    pass


class UserCreate(schemas.BaseUserCreate):
    email: EmailStr
    password: str = Field(min_length=8)


class UserUpdate(schemas.BaseUserUpdate):
    pass
