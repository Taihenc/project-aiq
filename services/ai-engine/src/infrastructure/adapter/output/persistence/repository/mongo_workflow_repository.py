from motor.motor_asyncio import AsyncIOMotorDatabase
from src.core.application.port.output.repository import WorkflowRepository
from src.core.domain.model.workflow import Workflow
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)


class MongoWorkflowRepository(MongoBaseRepository[Workflow], WorkflowRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "workflows", Workflow)
