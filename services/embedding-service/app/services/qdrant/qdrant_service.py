from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchText, SearchRequest as QdrantSearchRequest
)
from typing import List, Dict, Any, Optional
import uuid
from app.config import settings
from app.services.embedding.embedding_service import embedding_service
from app.models.models import (
    SearchFilter
)


class QdrantService:
    def __init__(self):
        self.client = None
        self.collection_name = settings.collection_name

    def connect(self):
        if self.client is None:
            if settings.use_local_qdrant:
                # Use local Qdrant with web UI instead of pure in-memory
                self.client = QdrantClient(path="./qdrant_data")
                print(
                    "Created local Qdrant with web UI at http://localhost:6333/dashboard")
            else:
                self.client = QdrantClient(
                    url=settings.qdrant_url,
                    api_key=settings.qdrant_api_key
                )
                print(f"Connected to Qdrant at {settings.qdrant_url}")
            self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        collection_exists = any(
            col.name == self.collection_name for col in collections)

        if not collection_exists:
            print(f"Creating collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=embedding_service.get_embedding_dimension(),
                    distance=Distance.COSINE
                )
            )
            print(f"Collection {self.collection_name} created")

    def upload_documents(self, documents: List[Dict[str, Any]]) -> List[str]:
        texts = [doc['text'] for doc in documents]

        embeddings = embedding_service.encode_batch(texts)

        points = []
        doc_ids = []

        for i, doc in enumerate(documents):
            doc_id = str(uuid.uuid4())
            doc_ids.append(doc_id)

            payload = {
                "text": doc['text'],
                **(doc.get('metadata', {}))
            }

            points.append(
                PointStruct(
                    id=doc_id,
                    vector=embeddings[i],
                    payload=payload
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

        return doc_ids

    def search(
        self,
        query: str,
        limit: int = 10,
        score_threshold: Optional[float] = None,
        query_filter: Optional[SearchFilter] = None
    ) -> List[Dict[str, Any]]:

        query_embedding = embedding_service.encode_single(query)

        qdrant_filter = None

        if query_filter:
            conditions = []

            if query_filter.path:
                conditions.append(
                    FieldCondition(
                        key="path",
                        match=MatchText(text=query_filter.path)
                    )
                )

            print('finish format filter')
            if conditions:
                qdrant_filter = Filter(must=conditions)

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=qdrant_filter
        )

        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result.id,
                "text": result.payload.get("text", ""),
                "metadata": {k: v for k, v in result.payload.items() if k != "text"},
                "score": result.score,
            })

        return formatted_results

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        try:
            result = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[doc_id]
            )

            if result:
                point = result[0]
                return {
                    "id": point.id,
                    "text": point.payload.get("text", ""),
                    "metadata": {k: v for k, v in point.payload.items() if k != "text"}
                }
            return None
        except Exception:
            return None

    def get_documents(self, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        results, _ = self.client.scroll(
            collection_name=self.collection_name,
            limit=limit or 100,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )

        documents = []
        for point in results:
            documents.append({
                "id": point.id,
                "text": point.payload.get("text", ""),
                "metadata": {k: v for k, v in point.payload.items() if k != "text"}
            })

        return documents

    def update_document(self, doc_id: str, text: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        existing = self.get_document(doc_id)
        if not existing:
            return False

        new_text = text if text is not None else existing["text"]
        new_metadata = metadata if metadata is not None else existing["metadata"]

        if text is not None:
            embedding = embedding_service.encode_single(new_text)
        else:
            result = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[doc_id],
                with_vectors=True
            )
            embedding = result[0].vector

        payload = {
            "text": new_text,
            **new_metadata
        }

        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                PointStruct(
                    id=doc_id,
                    vector=embedding,
                    payload=payload
                )
            ]
        )

        return True

    def delete_document(self, doc_id: str) -> bool:
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[doc_id]
            )
            return True
        except Exception:
            return False

    def get_collection_info(self) -> Dict[str, Any]:
        info = self.client.get_collection(collection_name=self.collection_name)
        return {
            "name": self.collection_name,
            "points_count": info.points_count,
            "vectors_count": info.vectors_count,
            "status": info.status
        }


# Global instance
qdrant_service = QdrantService()
qdrant_service.connect()
