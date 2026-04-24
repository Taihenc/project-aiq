from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, FilterSelector,
    Filter, FieldCondition, MatchValue, MatchText, MatchAny, SearchRequest as QdrantSearchRequest,
    Range
)
from typing import List, Dict, Any, Optional
import uuid
import logging

logger = logging.getLogger(__name__)
from app.config import settings
from app.services.embedding.embedding_service import embedding_service
from app.models.models import (
    Filter as ModelFilter,
    FilterOptionsResponse,
    Page,
    Chunk,
)


class QdrantService:
    def __init__(self):
        self.client = None
        self.collection_name = settings.collection_name

    def connect(self):
        if self.client is None:
            if settings.use_local_qdrant:
                # Connect to local Docker Qdrant instance
                self.client = QdrantClient(url="http://localhost:6333")
                logger.info("Connected to local Qdrant at http://localhost:6333/dashboard")
            else:
                self.client = QdrantClient(
                    url=settings.qdrant_url,
                    api_key=settings.qdrant_api_key
                )
                logger.info("Connected to Qdrant at %s", settings.qdrant_url)
            self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        collection_exists = any(
            col.name == self.collection_name for col in collections)

        if not collection_exists:
            logger.info("Creating collection: %s", self.collection_name)
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=embedding_service.get_embedding_dimension(),
                    distance=Distance.COSINE
                )
            )
            logger.info("Collection %s created", self.collection_name)

    def _ensure_duplicate(self, key: str, value: str) -> bool:
        self._ensure_collection()

        try:
            results, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key=key,
                            match=MatchValue(value=value)
                        )
                    ]
                ),
                limit=1
            )

            return len(results) > 0

        except Exception:
            logger.exception("Error checking for duplicate %s '%s'", key, value)
            return False

    def _metadata_filter(self, key: str, value: str) -> Filter:
        return Filter(
            must=[
                FieldCondition(
                    key=key,
                    match=MatchValue(value=value)
                )
            ]
        )

    def _get_document_identity(self, metadata: Dict[str, Any]) -> Optional[tuple[str, str]]:
        for key in ("file_id", "source_id", "file_path"):
            value = metadata.get(key)
            if value:
                return key, str(value)
        return None

    def _delete_by_metadata(self, metadata_filter: Filter) -> None:
        self._ensure_collection()

        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=metadata_filter
            )

        except Exception as e:
            raise RuntimeError("Failed to delete by metadata") from e

    def upload_documents(self, documents: List[Dict[str, Any]], duplicate: bool = False) -> List[str]:
        self._ensure_collection()

        if len(documents) == 0:
            return []

        identity = self._get_document_identity(documents[0].get("metadata", {}))
        if not duplicate and identity and self._ensure_duplicate(identity[0], identity[1]):
            self._delete_by_metadata(self._metadata_filter(identity[0], identity[1]))

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
        query_filter: Optional[ModelFilter] = None
    ) -> List[Dict[str, Any]]:
        self._ensure_collection()

        query_embedding = embedding_service.encode_single(query)
        qdrant_filter = self.format_filter(query_filter)

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
        self._ensure_collection()
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
            logger.exception("Error retrieving document '%s'", doc_id)
            return None

    def get_documents(self, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        self._ensure_collection()
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
        self._ensure_collection()
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
        self._ensure_collection()
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[doc_id]
            )
            return True
        except Exception:
            logger.exception("Error deleting document '%s'", doc_id)
            return False

    def delete_documents_by_file(self, file_name: str) -> None:
        """Delete all Qdrant points whose 'file' metadata field matches the given file name."""
        self._delete_by_metadata(self._metadata_filter("file", file_name))

    def delete_documents_by_file_id(self, file_id: str) -> None:
        self._delete_by_metadata(self._metadata_filter("file_id", file_id))

    def delete_documents_by_source_id(self, source_id: str) -> None:
        self._delete_by_metadata(self._metadata_filter("source_id", source_id))

    def count_documents_by_file(self, file_name: str) -> int:
        """
        Return the number of Qdrant points whose 'file' metadata field matches
        file_name.  Used by the reconciliation watchdog to verify whether a file
        was actually indexed without having to fetch all vectors.
        """
        self._ensure_collection()
        try:
            result = self.client.count(
                collection_name=self.collection_name,
                count_filter=self._metadata_filter("file", file_name),
                exact=True,
            )
            return result.count
        except Exception:
            logger.exception("Error counting documents for file '%s'", file_name)
            return 0

    def count_documents_by_file_id(self, file_id: str) -> int:
        self._ensure_collection()
        try:
            result = self.client.count(
                collection_name=self.collection_name,
                count_filter=self._metadata_filter("file_id", file_id),
                exact=True,
            )
            return result.count
        except Exception:
            logger.exception("Error counting documents for file_id '%s'", file_id)
            return 0

    def count_documents_by_source_id(self, source_id: str) -> int:
        self._ensure_collection()
        try:
            result = self.client.count(
                collection_name=self.collection_name,
                count_filter=self._metadata_filter("source_id", source_id),
                exact=True,
            )
            return result.count
        except Exception:
            logger.exception("Error counting documents for source_id '%s'", source_id)
            return 0

    def get_filter_options(self) -> FilterOptionsResponse:
        """
        Scroll every point in the collection and extract the distinct values for
        every filterable metadata dimension (department, team, project, tags, file_type).
        Returned lists are sorted case-insensitively for predictable UI ordering.
        """
        self._ensure_collection()

        departments: set = set()
        teams: set = set()
        projects: set = set()
        tags: set = set()
        file_types: set = set()

        next_offset = None
        while True:
            points, next_offset = self.client.scroll(
                collection_name=self.collection_name,
                offset=next_offset,
                limit=1000,
                with_payload=True,
                with_vectors=False,
            )
            for point in points:
                p = point.payload or {}
                if p.get("department"): departments.add(p["department"])
                if p.get("team"): teams.add(p["team"])
                if p.get("project"): projects.add(p["project"])
                if p.get("file_type"): file_types.add(p["file_type"])
                for tag in (p.get("tags") or []):
                    if tag: tags.add(tag)
            if next_offset is None:
                break

        return FilterOptionsResponse(
            department=sorted(departments, key=str.lower),
            team=sorted(teams, key=str.lower),
            project=sorted(projects, key=str.lower),
            tags=sorted(tags, key=str.lower),
            file_type=sorted(file_types, key=str.lower),
        )

    def get_collection_info(self) -> Dict[str, Any]:
        self._ensure_collection()
        info = self.client.get_collection(collection_name=self.collection_name)
        return {
            "name": self.collection_name,
            "points_count": info.points_count,
            "vectors_count": info.vectors_count,
            "status": info.status
        }

    def format_filter(self, filters: ModelFilter) -> Filter:
        if filters is None:
            return Filter()

        field_conditions = []
        must_not_conditions = []

        # Exact Matches (MatchValue)
        exact_match_fields = {
            "file_name": filters.file_name,
            "file_type": filters.file_type,
            "department": filters.department,
            "team": filters.team,
            "project": filters.project,
        }

        for key, value in exact_match_fields.items():
            if value:  # Ensures we don't add empty strings or None
                field_conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=value))
                )

        # Full-text Match (MatchText)
        if filters.file_path:
            field_conditions.append(
                FieldCondition(key="file_path", match=MatchText(text=filters.file_path))
            )

        # List Matches (MatchAny)
        if filters.pages:
            field_conditions.append(
                FieldCondition(key="pages", match=MatchAny(any=filters.pages))
            )

        if filters.tags:
            field_conditions.append(
                FieldCondition(key="tags", match=MatchAny(any=filters.tags))
            )

        if filters.exclude_file_ids:
            must_not_conditions.append(
                FieldCondition(key="file_id", match=MatchAny(any=filters.exclude_file_ids))
            )

        if filters.exclude:
            must_not_conditions.append(
                FieldCondition(key="file_path", match=MatchAny(any=filters.exclude))
            )

        format_filter = Filter(
            must=field_conditions,
            must_not=must_not_conditions
        )

        return format_filter

    def get_chunks_by_page_range(self, start_page: int, end_page: int, file_path: str):
        """
        Retrieves all chunks that match the given filters within the specified page range.
        """
        self._ensure_collection()

        q_filter = Filter(
            must=[
                FieldCondition(key="file_path", match=MatchValue(value=file_path)),
            ]
        )

        all_points = []
        next_offset = None

        while True:
            points, next_offset = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=q_filter,
                # limit=100,
                offset=next_offset,
                with_payload=True,
                with_vectors=False  # Vectors are not needed for text reconstruction
            )
            all_points.extend(points)

            if next_offset is None:
                break

        all_points.sort(key=lambda p: p.payload.get("order", 0))
        pages_chunk = []


        for i in range(start_page, end_page + 1):
            chunks = []

            for point in all_points:
                if i in point.payload.get("pages", []):
                    chunks.append(Chunk(
                        chunk_number=point.payload.get("order", 0),
                        text=point.payload.get("text", ""),
                    ))

            if chunks:
                pages_chunk.append(Page(
                    page_number=i,
                    chunks=chunks
                ))

        return pages_chunk, len(pages_chunk)

    def get_neighbor_chunks(self, chunk_id: str, backward: int, forward: int) -> List[Dict[str, Any]]:
        """
        Retrieves neighbor chunks for a given chunk_id based on 'order' and 'file_path'.
        """
        self._ensure_collection()

        target_doc = self.get_document(chunk_id)
        if not target_doc:
            raise ValueError(f"Target chunk {chunk_id} not found")

        target_metadata = target_doc["metadata"]
        file_path = target_metadata.get("file_path")

        try:
            target_order = int(target_metadata.get("order", -1))
        except (ValueError, TypeError):
            # Fallback if order is somehow not an integer
            raise ValueError(f"Invalid 'order' value in chunk {chunk_id}")

        if not file_path or target_order == -1:
            raise ValueError(f"Chunk {chunk_id} missing required 'file_path' or 'order' metadata")

        min_order = target_order - backward
        max_order = target_order + forward

        q_filter = Filter(
            must=[
                FieldCondition(key="file_path", match=MatchValue(value=file_path)),
                FieldCondition(key="order", range=Range(gte=min_order, lte=max_order))
            ]
        )

        limit = (backward + forward + 1) + 5

        results, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=q_filter,
            limit=limit,
            with_payload=True,
            with_vectors=False
        )

        neighbors = []
        for point in results:
             neighbors.append({
                "id": point.id,
                "text": point.payload.get("text", ""),
                "metadata": {k: v for k, v in point.payload.items() if k != "text"},
             })

        neighbors.sort(key=lambda x: int(x["metadata"].get("order", 0)))

        return neighbors

    def get_chunk_by_order(self, file_path: str, order: int) -> Dict[str, Any]:
        self._ensure_collection()

        q_filter = Filter(
            must=[
                FieldCondition(key="file_path", match=MatchValue(value=file_path)),
                FieldCondition(key="order", match=MatchValue(value=order))
            ]
        )

        points, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=q_filter,
            limit=1,
            with_payload=True,
            with_vectors=False
        )

        if not points:
            raise ValueError(f"Chunk with file_path {file_path} and order {order} not found")

        point = points[0]
        return {
            "id": point.id,
            "text": point.payload.get("text", ""),
            "metadata": {k: v for k, v in point.payload.items() if k != "text"},
        }


    def get_file(self, file_path:str):
        self._ensure_collection()

        q_filter = Filter(
            must=[
                FieldCondition(key="file_path", match=MatchValue(value=file_path))
            ]
        )

        points, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=q_filter,
            # limit=1,
            with_payload=True,
            with_vectors=False
        )

        points.sort(key=lambda x: int(x.payload.get("order", 0)))

        if points:
            return points
        else:
            raise ValueError(f"Chunk with file_path {file_path} not found")

    def get_max_page_number(self, file_path:str):
        self._ensure_collection()
        points = self.get_file(file_path)

        if points:
            # Find the absolute maximum page number across all chunks
            max_page = -1
            for point in points:
                pages = point.payload.get("pages", [])
                if pages:
                    max_page = max(max_page, max(pages))
            return max_page
        else:
            raise ValueError(f"Chunk with file_path {file_path} not found")

    def get_max_chunk_number(self, file_path: str):
        self._ensure_collection()
        points = self.get_file(file_path)

        if points:
            # Find the absolute maximum order across all chunks
            max_order = -1
            for point in points:
                order = point.payload.get("order", -1)
                max_order = max(max_order, order)
            return max_order
        else:
            raise ValueError(f"Chunk with file_path {file_path} not found")

# Global instance
qdrant_service = QdrantService()
# qdrant_service.connect()
