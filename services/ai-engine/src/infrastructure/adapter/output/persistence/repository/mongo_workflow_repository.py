from src.core.application.port.output.repository import WorkflowRepository
from src.core.domain.model.workflow import Workflow
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client


class MongoWorkflowRepository(MongoBaseRepository[Workflow], WorkflowRepository):
    def __init__(self):
        super().__init__(
            db=mongodb_client.get_database(),
            collection_name="workflows",
            domain_class=Workflow,
        )
