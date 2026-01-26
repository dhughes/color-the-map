from typing import Optional
from fastapi import Depends
from fastapi_users import FastAPIUsers
from .models import User
from .manager import get_user_manager
from .backend import auth_backend

fastapi_users = FastAPIUsers[User, str](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)


async def get_current_user_optional(
    user: User | None = Depends(fastapi_users.current_user(optional=True)),
) -> Optional[User]:
    return user
