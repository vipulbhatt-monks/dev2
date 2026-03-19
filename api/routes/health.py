from fastapi import APIRouter
from sqlalchemy import text

from db.session import get_async_engine, get_database_url, get_engine, is_async_database_url


router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/db")
async def db_health_check():
    database_url = get_database_url()
    if is_async_database_url(database_url):
        engine = get_async_engine()
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))
        await engine.dispose()
        return {"ok": True, "driver": "asyncpg"}

    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    engine.dispose()
    return {"ok": True, "driver": "psycopg2"}
