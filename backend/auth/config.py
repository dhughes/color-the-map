import os
from datetime import timedelta


class AuthConfig:
    SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
    ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
    REFRESH_TOKEN_LIFETIME = timedelta(days=30)
    CASE_INSENSITIVE = True


auth_config = AuthConfig()
