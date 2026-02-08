import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from backend.auth.manager import RefreshTokenManager
from backend.auth.models import RefreshToken
from .conftest import create_test_user

TEST_USER_IDS = ["user-123", "user-456", "user-789", "user-valid", "user-expired"]


@pytest_asyncio.fixture(autouse=True)
async def setup_users(test_db_session):
    for uid in TEST_USER_IDS:
        await create_test_user(test_db_session, uid)
    await test_db_session.commit()


@pytest_asyncio.fixture
async def refresh_manager(test_db_session):
    """Create RefreshTokenManager with test database session."""
    return RefreshTokenManager(test_db_session)


@pytest.mark.asyncio
async def test_create_refresh_token_uses_flush_not_commit(test_db_session):
    """Verify that create_refresh_token uses flush() to allow caller to control commits."""
    manager = RefreshTokenManager(test_db_session)

    with patch.object(test_db_session, "flush", new_callable=AsyncMock) as mock_flush:
        with patch.object(
            test_db_session, "commit", new_callable=AsyncMock
        ) as mock_commit:
            await manager.create_refresh_token("user-123")

            mock_flush.assert_called_once()
            mock_commit.assert_not_called()


@pytest.mark.asyncio
async def test_revoke_token_uses_flush_not_commit(test_db_session):
    """Verify that revoke_token uses flush() to allow caller to control commits."""
    manager = RefreshTokenManager(test_db_session)

    with patch.object(test_db_session, "flush", new_callable=AsyncMock) as mock_flush:
        with patch.object(
            test_db_session, "commit", new_callable=AsyncMock
        ) as mock_commit:
            await manager.revoke_token("some-token")

            mock_flush.assert_called_once()
            mock_commit.assert_not_called()


@pytest.mark.asyncio
async def test_revoke_all_user_tokens_uses_flush_not_commit(test_db_session):
    """Verify that revoke_all_user_tokens uses flush() to allow caller to control commits."""
    manager = RefreshTokenManager(test_db_session)

    with patch.object(test_db_session, "flush", new_callable=AsyncMock) as mock_flush:
        with patch.object(
            test_db_session, "commit", new_callable=AsyncMock
        ) as mock_commit:
            await manager.revoke_all_user_tokens("user-123")

            mock_flush.assert_called_once()
            mock_commit.assert_not_called()


@pytest.mark.asyncio
async def test_cleanup_expired_tokens_uses_flush_not_commit(test_db_session):
    """Verify that cleanup_expired_tokens uses flush() to allow caller to control commits."""
    manager = RefreshTokenManager(test_db_session)

    with patch.object(test_db_session, "flush", new_callable=AsyncMock) as mock_flush:
        with patch.object(
            test_db_session, "commit", new_callable=AsyncMock
        ) as mock_commit:
            await manager.cleanup_expired_tokens()

            mock_flush.assert_called_once()
            mock_commit.assert_not_called()


@pytest.mark.asyncio
async def test_create_refresh_token_returns_token(refresh_manager, test_db_session):
    """Verify that create_refresh_token returns a valid token string."""
    token = await refresh_manager.create_refresh_token("user-123")
    await test_db_session.commit()

    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 20


@pytest.mark.asyncio
async def test_verify_refresh_token_returns_user_id(refresh_manager, test_db_session):
    """Verify that verify_refresh_token returns the user_id for a valid token."""
    user_id = "user-456"
    token = await refresh_manager.create_refresh_token(user_id)
    await test_db_session.commit()

    verified_user_id = await refresh_manager.verify_refresh_token(token)

    assert verified_user_id == user_id


@pytest.mark.asyncio
async def test_verify_refresh_token_returns_none_for_invalid_token(refresh_manager):
    """Verify that verify_refresh_token returns None for an invalid token."""
    result = await refresh_manager.verify_refresh_token("invalid-token")

    assert result is None


@pytest.mark.asyncio
async def test_verify_refresh_token_returns_none_for_expired_token(
    refresh_manager, test_db_session
):
    """Verify that verify_refresh_token returns None for an expired token."""
    user_id = "user-789"
    token = await refresh_manager.create_refresh_token(user_id)
    await test_db_session.commit()

    from sqlalchemy import update

    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id)
        .values(expires_at=datetime.now(timezone.utc) - timedelta(hours=1))
    )
    await test_db_session.execute(stmt)
    await test_db_session.commit()

    result = await refresh_manager.verify_refresh_token(token)

    assert result is None


@pytest.mark.asyncio
async def test_revoke_token_invalidates_token(refresh_manager, test_db_session):
    """Verify that revoke_token invalidates the token."""
    token = await refresh_manager.create_refresh_token("user-123")
    await test_db_session.commit()

    verified = await refresh_manager.verify_refresh_token(token)
    assert verified == "user-123"

    await refresh_manager.revoke_token(token)
    await test_db_session.commit()

    verified_after_revoke = await refresh_manager.verify_refresh_token(token)
    assert verified_after_revoke is None


@pytest.mark.asyncio
async def test_revoke_all_user_tokens_invalidates_all_tokens(
    refresh_manager, test_db_session
):
    """Verify that revoke_all_user_tokens invalidates all tokens for a user."""
    user_id = "user-123"
    token1 = await refresh_manager.create_refresh_token(user_id)
    token2 = await refresh_manager.create_refresh_token(user_id)
    await test_db_session.commit()

    assert await refresh_manager.verify_refresh_token(token1) == user_id
    assert await refresh_manager.verify_refresh_token(token2) == user_id

    await refresh_manager.revoke_all_user_tokens(user_id)
    await test_db_session.commit()

    assert await refresh_manager.verify_refresh_token(token1) is None
    assert await refresh_manager.verify_refresh_token(token2) is None


@pytest.mark.asyncio
async def test_cleanup_expired_tokens_removes_only_expired(
    refresh_manager, test_db_session
):
    """Verify that cleanup_expired_tokens removes only expired tokens."""
    from sqlalchemy import update

    valid_token = await refresh_manager.create_refresh_token("user-valid")
    expired_token = await refresh_manager.create_refresh_token("user-expired")
    await test_db_session.commit()

    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == "user-expired")
        .values(expires_at=datetime.now(timezone.utc) - timedelta(hours=1))
    )
    await test_db_session.execute(stmt)
    await test_db_session.commit()

    await refresh_manager.cleanup_expired_tokens()
    await test_db_session.commit()

    assert await refresh_manager.verify_refresh_token(valid_token) == "user-valid"
    assert await refresh_manager.verify_refresh_token(expired_token) is None
