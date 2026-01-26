import secrets
from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, Request, Response
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from .models import User, RefreshToken
from .config import auth_config
from .database import get_async_session


class UserManager(UUIDIDMixin, BaseUserManager[User, str]):  # type: ignore[misc]
    reset_password_token_secret = auth_config.SECRET_KEY
    verification_token_secret = auth_config.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.email} has registered.")

    async def on_after_login(
        self,
        user: User,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
    ):
        print(f"User {user.email} has logged in.")


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


class RefreshTokenManager:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_refresh_token(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = RefreshToken.hash_token(token)

        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + auth_config.REFRESH_TOKEN_LIFETIME,
        )

        self.session.add(refresh_token)
        await self.session.commit()

        return token

    async def verify_refresh_token(self, token: str) -> Optional[str]:
        token_hash = RefreshToken.hash_token(token)

        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self.session.execute(stmt)
        refresh_token = result.scalar_one_or_none()

        if not refresh_token:
            return None

        return refresh_token.user_id

    async def revoke_token(self, token: str):
        token_hash = RefreshToken.hash_token(token)
        stmt = delete(RefreshToken).where(RefreshToken.token_hash == token_hash)
        await self.session.execute(stmt)
        await self.session.commit()

    async def revoke_all_user_tokens(self, user_id: str):
        stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
        await self.session.execute(stmt)
        await self.session.commit()

    async def cleanup_expired_tokens(self):
        stmt = delete(RefreshToken).where(
            RefreshToken.expires_at <= datetime.now(timezone.utc)
        )
        await self.session.execute(stmt)
        await self.session.commit()
