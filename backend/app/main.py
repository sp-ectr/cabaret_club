from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.db import engine
from app.core.redis import pool
from app.api.game import router as game_router
from app.api.hostess import router as hostess_router
from app.api.shift import router as shift_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Graceful shutdown: закрываем пулы соединений
    await engine.dispose()
    await pool.disconnect()

app = FastAPI(
    title="Cabaret Tycoon API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Кастомный обработчик ошибок строго по формату docs/API.md
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail)}}
    )

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(game_router)
app.include_router(hostess_router)
app.include_router(shift_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "cabaret-backend"}