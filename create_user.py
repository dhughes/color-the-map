import asyncio
import uuid
import sys
from passlib.context import CryptContext

sys.path.insert(0, ".")

from backend.auth.database import get_session_maker
from backend.auth.models import User

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

    session_maker = get_session_maker()
    async with session_maker() as session:
        session.add(user)
        await session.commit()
        print(f"✓ Created user: {email}")
        print(f"  User ID: {user.id}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_user.py <email> <password>")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]

    asyncio.run(create_user(email, password))
