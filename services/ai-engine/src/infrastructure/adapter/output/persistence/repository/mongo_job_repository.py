from src.core.application.port.output.repository import JobRepository
from src.core.domain.model.job import Job
from src.infrastructure.adapter.output.persistence.repository.base import (
    MongoBaseRepository,
)
from src.infrastructure.adapter.output.persistence.mongodb import mongodb_client


class MongoJobRepository(MongoBaseRepository[Job], JobRepository):
    def __init__(self):
        super().__init__(
            db=mongodb_client.get_database(), collection_name="jobs", domain_class=Job
        )
