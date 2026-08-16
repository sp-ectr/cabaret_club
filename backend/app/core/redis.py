from collections.abc import AsyncGenerator
from redis.asyncio import ConnectionPool, Redis
from app.core.config import settings

pool = ConnectionPool(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

async def get_redis() -> AsyncGenerator[Redis, None]:
    client = Redis(connection_pool=pool)
    try:
        yield client
    finally:
        await client.aclose()