from motor.motor_asyncio import AsyncIOMotorDatabase
from src.core.application.port.output.repository import AgentRepository
from src.core.domain.model.agent import Agent
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)


class MongoAgentRepository(MongoBaseRepository[Agent], AgentRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "agents", Agent)
