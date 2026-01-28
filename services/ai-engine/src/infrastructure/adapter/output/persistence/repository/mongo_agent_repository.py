from src.core.application.port.output.repository import AgentRepository
from src.core.domain.model.agent import Agent
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client


class MongoAgentRepository(MongoBaseRepository[Agent], AgentRepository):
    def __init__(self):
        super().__init__(
            db=mongodb_client.get_database(),
            collection_name="agents",
            domain_class=Agent,
        )
