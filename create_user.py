import asyncio
import uuid
import sys
from passlib.context import CryptContext

sys.path.insert(0, ".")

from backend.auth.database import async_session_maker
from backend.auth.models import User
from backend.services.map_service import MapService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_user(email: str, password: str):
    hashed_password = pwd_context.hash(password)

    user = User(
        id=str(uuid.uuid4()),
        email=email.lower(),
        hashed_password=hashed_password,
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )

    async with async_session_maker() as session:
        session.add(user)
        await session.flush()

        map_service = MapService()
        new_map = await map_service.create_map(
            name="My Map",
            user_id=str(user.id),
            session=session,
        )

        await session.commit()
        print(f"✓ Created user: {email}")
        print(f"  User ID: {user.id}")
        print(f"  Map ID: {new_map.id}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_user.py <email> <password>")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]

    asyncio.run(create_user(email, password))
