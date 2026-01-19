from motor.motor_asyncio import AsyncIOMotorDatabase
from src.core.application.port.output.repository import ToolRepository
from src.core.domain.model.tool import Tool
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)


class MongoToolRepository(MongoBaseRepository[Tool], ToolRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "tools", Tool)
