from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.bonus import router as bonus_router
from app.api.boss import router as boss_router
from app.api.economy import router as economy_router
from app.api.progression import router as progression_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.database import engine
from app.api import territory




@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Life RPG API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is unavailable") from error
    return {"status": "ok", "database": "ok"}


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_: Request, __: SQLAlchemyError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": "Database is temporarily unavailable"})

app.include_router(territory.router, prefix="/api/territory", tags=["territory"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(bonus_router, prefix="/api/bonus-quests", tags=["bonus-quests"])
app.include_router(boss_router, prefix="/api/boss-challenges", tags=["boss-challenges"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(progression_router, prefix="/api/progression", tags=["progression"])
app.include_router(economy_router, prefix="/api/economy", tags=["economy"])
