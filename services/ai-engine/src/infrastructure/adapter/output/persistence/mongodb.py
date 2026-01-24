from motor.motor_asyncio import AsyncIOMotorClient
from src.infrastructure.config.settings import settings
from loguru import logger


class MongoDBClient:
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db_name = settings.mongo_db_name

    def connect(self):
        """
        Create the Motor client.
        Note: Motor is lazy, so actual connection happens on first operation.
        """
        try:
            self.client = AsyncIOMotorClient(settings.mongo_uri)
            logger.info(f"MongoDB Client initialized for DB: {self.db_name}")
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB Client: {e}")
            raise e

    def get_database(self):
        if not self.client:
            self.connect()
        return self.client[self.db_name]

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def health_check(self) -> bool:
        try:
            if not self.client:
                self.connect()
            # The ismaster command is cheap and does not require auth.
            await self.client.admin.command("ismaster")
            return True
        except Exception as e:
            logger.error(f"MongoDB Health Check Failed: {e}")
            return False


mongodb_client = MongoDBClient()
