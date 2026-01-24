from typing import List, Optional

from src.core.application.port.output.repository import ModelRepository
from src.core.domain.model.llm import Model
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)


class MongoModelRepository(MongoBaseRepository[Model], ModelRepository):
    def __init__(self):
        super().__init__(
            db=mongodb_client.get_database(),
            collection_name="models",
            domain_class=Model,
        )

    async def list(self, provider: Optional[str] = None) -> List[Model]:
        filter_query = {}
        if provider:
            filter_query["provider"] = provider

        cursor = self.collection.find(filter_query)
        items = []
        async for doc in cursor:
            items.append(self.domain_class(**doc))
        return items
