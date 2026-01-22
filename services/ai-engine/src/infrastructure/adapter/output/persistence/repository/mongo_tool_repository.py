from src.core.application.port.output.repository import ToolRepository
from src.core.domain.model.tool import Tool
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client


class MongoToolRepository(MongoBaseRepository[Tool], ToolRepository):
    def __init__(self):
        super().__init__(
            db=mongodb_client.get_database(), collection_name="tools", domain_class=Tool
        )
