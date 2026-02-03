from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .manager import RefreshTokenManager
from .backend import get_jwt_strategy
from .database import get_async_session
from .models import User
from .dependencies import current_active_user
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(User).where(
        func.lower(User.email) == form_data.username.lower(),
        User.is_active.is_(True),  # type: ignore[attr-defined]
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    jwt_strategy = get_jwt_strategy()
    access_token = await jwt_strategy.write_token(user)

    refresh_manager = RefreshTokenManager(session)
    refresh_token = await refresh_manager.create_refresh_token(str(user.id))
    await session.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(jwt_strategy.lifetime_seconds)
        if jwt_strategy.lifetime_seconds
        else 0,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest,
    session: AsyncSession = Depends(get_async_session),
):
    refresh_manager = RefreshTokenManager(session)
    user_id = await refresh_manager.verify_refresh_token(request.refresh_token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    stmt = select(User).where(User.id == user_id, User.is_active.is_(True))  # type: ignore[arg-type, attr-defined]
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    await refresh_manager.revoke_token(request.refresh_token)

    jwt_strategy = get_jwt_strategy()
    access_token = await jwt_strategy.write_token(user)
    new_refresh_token = await refresh_manager.create_refresh_token(str(user.id))
    await session.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=int(jwt_strategy.lifetime_seconds)
        if jwt_strategy.lifetime_seconds
        else 0,
    )


@router.post("/logout")
async def logout(
    request: RefreshRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    refresh_manager = RefreshTokenManager(session)
    await refresh_manager.revoke_token(request.refresh_token)
    await session.commit()
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(user: User = Depends(current_active_user)):
    return {"id": str(user.id), "email": user.email}
