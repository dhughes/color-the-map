from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as api_router
from .auth.routes import router as auth_router
from .auth.database import engine
from .database import Base
from .config import config
from .services.geoip_service import GeoIPService
import logging

# Import models to register them with Base
from .auth.models import User, RefreshToken  # noqa: F401
from .models.track_model import Track  # noqa: F401

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

config.ensure_dirs()

geoip_service = None


# Intentional mypy error for CI testing
def broken_type_function() -> int:
    return "this is a string, not an int"  # type error!


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    global geoip_service

    # Startup
    # Create SQLAlchemy tables (all models)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if config.MAXMIND_ACCOUNT_ID and config.MAXMIND_LICENSE_KEY:
        geoip_service = GeoIPService(
            config.GEOIP_DB_PATH,
            config.MAXMIND_DOWNLOAD_URL,
            config.MAXMIND_ACCOUNT_ID,
            config.MAXMIND_LICENSE_KEY,
        )
        await geoip_service.initialize()
    else:
        logging.warning(
            "MAXMIND_ACCOUNT_ID or MAXMIND_LICENSE_KEY not set, GeoIP service disabled"
        )

    yield

    # Shutdown
    if geoip_service:
        geoip_service.shutdown()


app = FastAPI(
    title="Color The Map",
    description="GPS Track Visualization API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(api_router, prefix="/api/v1", tags=["tracks"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


try:
    app.mount(
        "/", StaticFiles(directory=str(config.STATIC_DIR), html=True), name="static"
    )
except RuntimeError:
    pass

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.HOST, port=config.PORT)
