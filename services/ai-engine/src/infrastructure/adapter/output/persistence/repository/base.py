from typing import Type, TypeVar, List, Optional, Generic
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from src.core.domain.model.base import Entity
from src.core.application.port.output.repository import Repository

T = TypeVar("T", bound=Entity)


class MongoBaseRepository(Repository[T]):
    def __init__(
        self, db: AsyncIOMotorDatabase, collection_name: str, domain_class: Type[T]
    ):
        self.collection = db[collection_name]
        self.domain_class = domain_class

    async def get(self, id: str) -> Optional[T]:
        doc = await self.collection.find_one({"_id": id})
        if doc:
            return self.domain_class(**doc)
        return None

    async def list(self) -> List[T]:
        cursor = self.collection.find()
        items = []
        async for doc in cursor:
            items.append(self.domain_class(**doc))
        return items

    async def create(self, entity: T) -> T:
        data = entity.model_dump(by_alias=True)
        data["_id"] = entity.id  # Use Entity ID as Mongo ID
        await self.collection.insert_one(data)
        return entity

    async def update(self, entity: T) -> T:
        data = entity.model_dump(by_alias=True)
        await self.collection.replace_one({"_id": entity.id}, data)
        return entity

    async def delete(self, id: str) -> bool:
        result = await self.collection.delete_one({"_id": id})
        return result.deleted_count > 0
