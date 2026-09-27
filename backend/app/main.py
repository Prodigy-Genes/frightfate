from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.database import engine, Base
from app.services.ai_service import ai_service
from app.routes import game, websocket

import sys

# Ensure UTF-8 output encoding for consoles (prevents cp1252 emoji crash on Windows)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.core.config import get_settings

settings = get_settings()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FrightFate API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for frontend (dynamic from environment)
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
if "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if "*" not in origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(game.router, prefix="/api/game", tags=["game"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

@app.get("/")
async def root():
    return {"message": "FrightFate API is alive! 🎃"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "FrightFate API", "version": "1.0.0"}

@app.on_event("startup")
async def warm_scenario_cache():
    """Pre-generate one opening scenario per theme so game starts are instant.

    Runs in the background; failures are logged by the warm-up itself and
    never block startup.
    """
    await ai_service.warm_scenario_cache()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)