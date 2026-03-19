
import os

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_engine():
    database_url = _require_env("DATABASE_URL")
    if is_async_database_url(database_url):
        raise RuntimeError("DATABASE_URL uses asyncpg; use get_async_engine() instead of get_engine().")
    return create_engine(database_url, pool_pre_ping=True)


def get_async_engine():
    database_url = _require_env("DATABASE_URL")
    return create_async_engine(database_url, pool_pre_ping=True)


def is_async_database_url(database_url: str) -> bool:
    return "+asyncpg" in database_url


def get_database_url() -> str:
    return _require_env("DATABASE_URL")


