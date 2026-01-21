"""
Database Connection Module
Async SQLAlchemy setup with PostgreSQL
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from config import get_settings

settings = get_settings()

# Fix DATABASE_URL for async SQLAlchemy (Render uses postgres://)
def get_database_url():
    """Convert DATABASE_URL to async format for SQLAlchemy."""
    url = settings.DATABASE_URL
    
    # Debug: print the original URL (masked for security)
    if url:
        masked = url[:30] + "..." if len(url) > 30 else url
        print(f"Original DATABASE_URL starts with: {masked}")
    
    # If it already has +asyncpg, it's already correct
    if "+asyncpg" in url:
        return url
    
    # Render provides postgres:// but asyncpg needs postgresql+asyncpg://
    # Only replace the scheme prefix, nothing else
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    
    # Debug: print the converted URL
    if url:
        masked = url[:40] + "..." if len(url) > 40 else url
        print(f"Converted DATABASE_URL starts with: {masked}")
    
    return url

# Create async engine
engine = create_async_engine(
    get_database_url(),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    """Base class for all ORM models"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides database session.
    Use with FastAPI's Depends().
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database session.
    Use in non-request contexts.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections"""
    await engine.dispose()
