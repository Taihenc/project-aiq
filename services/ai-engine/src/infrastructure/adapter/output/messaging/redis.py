import redis.asyncio as redis
from src.infrastructure.config.settings import settings
from loguru import logger


class RedisClient:
    def __init__(self):
        self.client: redis.Redis = None

    def connect(self):
        """
        Create the Redis client using connection pool.
        """
        try:
            self.client = redis.from_url(
                settings.redis_url, encoding="utf-8", decode_responses=True
            )
            logger.info("Redis Client initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Redis Client: {e}")
            raise e

    async def get_client(self) -> redis.Redis:
        if not self.client:
            self.connect()
        return self.client

    async def close(self):
        if self.client:
            await self.client.aclose()
            logger.info("Redis connection closed.")

    async def health_check(self) -> bool:
        try:
            if not self.client:
                self.connect()
            return await self.client.ping()
        except Exception as e:
            logger.error(f"Redis Health Check Failed: {e}")
            return False


redis_client = RedisClient()
