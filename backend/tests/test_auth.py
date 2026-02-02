import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from backend.main import app
from backend.auth.models import User
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest_asyncio.fixture
async def test_user():
    """Create test user in main test database."""
    from backend.auth.database import get_session_maker

    user = User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        hashed_password=pwd_context.hash("testpass123"),
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )

    session_maker = get_session_maker()
    async with session_maker() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return user


@pytest.mark.asyncio
async def test_login_returns_tokens(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "testpass123"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900


@pytest.mark.asyncio
async def test_login_case_insensitive(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "TEST@EXAMPLE.COM", "password": "testpass123"},
        )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_login_invalid_credentials(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "wrongpassword"},
        )

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "notfound@example.com", "password": "testpass123"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_works(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "testpass123"},
        )
        refresh_token = login_response.json()["refresh_token"]

        refresh_response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )

    assert refresh_response.status_code == 200
    new_tokens = refresh_response.json()
    assert "access_token" in new_tokens
    assert new_tokens["refresh_token"] != refresh_token


@pytest.mark.asyncio
async def test_refresh_token_rotation(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "testpass123"},
        )
        old_refresh_token = login_response.json()["refresh_token"]

        await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh_token}
        )

        second_refresh = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh_token}
        )

    assert second_refresh.status_code == 401


@pytest.mark.asyncio
async def test_refresh_invalid_token():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "invalid_token"}
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_token(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "testpass123"},
        )
        access_token = login_response.json()["access_token"]
        refresh_token = login_response.json()["refresh_token"]

        logout_response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert logout_response.status_code == 200

        refresh_response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )

    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_requires_auth():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/tracks")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_returns_user_info(test_user):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@example.com", "password": "testpass123"},
        )
        access_token = login_response.json()["access_token"]

        me_response = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
        )

    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["email"] == "test@example.com"
    assert "id" in user_data
