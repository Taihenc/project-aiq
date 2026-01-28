from motor.motor_asyncio import AsyncIOMotorDatabase
from src.core.application.port.output.repository import ExecutionRepository
from src.core.domain.model.execution import Execution
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)


class MongoExecutionRepository(MongoBaseRepository[Execution], ExecutionRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "executions", Execution)
