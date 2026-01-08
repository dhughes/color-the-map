from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as api_router
from .config import config

config.ensure_dirs()

app = FastAPI(
    title="Color The Map",
    description="GPS Track Visualization API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1", tags=["tracks"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

try:
    app.mount("/", StaticFiles(directory=str(config.STATIC_DIR), html=True), name="static")
except RuntimeError:
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
