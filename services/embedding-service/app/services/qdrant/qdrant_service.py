from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, FilterSelector,
    Filter, FieldCondition, MatchValue, MatchText, MatchAny, SearchRequest as QdrantSearchRequest,
    Range
)
from typing import List, Dict, Any, Optional
import uuid
from app.config import settings
from app.services.embedding.embedding_service import embedding_service
from app.models.models import (
    Filter as ModelFilter
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
                print("Connected to local Qdrant at http://localhost:6333/dashboard")
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

    def _ensure_duplicate(self, path: str) -> bool:
        self._ensure_collection()
        
        try:
            results, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="file_path",
                            match=MatchValue(value=path)
                        )
                    ]
                ),
                limit=1
            )

            return len(results) > 0

        except Exception:
            return False
        
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

        if not duplicate and self._ensure_duplicate(documents[0]["metadata"]["file_path"]):
            metadata_filter = Filter(
                must=[
                    FieldCondition(
                        key="file_path",
                        match=MatchValue(value=documents[0]["metadata"]["file_path"])
                    )
                ]
            )
            self._delete_by_metadata(metadata_filter=metadata_filter)

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

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=qdrant_filter
        ).points

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
            return False

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

        format_filter = Filter(
            must=field_conditions
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
            page_ids = []
            page_text_segments = []
            page_metadata = []

            for point in all_points:
                if i in point.payload.get("pages", []):
                    page_ids.append(point.id)
                    page_text_segments.append(point.payload.get("text", ""))
                    meta = {k: v for k, v in point.payload.items() if k != "text"}
                    page_metadata.append(meta)

            if page_ids:
                pages_chunk.append({
                    "page_number": i,
                    "ids": page_ids,
                    "text": "".join(page_text_segments),
                    "metadata_list": page_metadata,
                    "total_chunks": len(page_ids)
                })

        return pages_chunk, len(pages_chunk)

    def get_neighbor_chunks(self, chunk_id: str, backward: int, forward: int) -> List[Dict[str, Any]]:
        """
        Retrieves neighbor chunks for a given chunk_id based on 'order' and 'file_path'.
        """
        self._ensure_collection()
        
        # 1. Get target chunk to find file_path and order
        target_doc = self.get_document(chunk_id)
        if not target_doc:
            raise ValueError(f"Target chunk {chunk_id} not found")
        
        target_metadata = target_doc["metadata"]
        file_path = target_metadata.get("file_path")
        
        # 'order' might be stored as int or float. Defaults to -1 if missing, which shouldn't happen for valid docs.
        try:
            target_order = int(target_metadata.get("order", -1))
        except (ValueError, TypeError):
            # Fallback if order is somehow not an integer
             raise ValueError(f"Invalid 'order' value in chunk {chunk_id}")

        if not file_path or target_order == -1:
             raise ValueError(f"Chunk {chunk_id} missing required 'file_path' or 'order' metadata")

        # 2. Define Range
        min_order = target_order - backward
        max_order = target_order + forward
        
        # 3. Query
        q_filter = Filter(
            must=[
                FieldCondition(key="file_path", match=MatchValue(value=file_path)),
                FieldCondition(key="order", range=Range(gte=min_order, lte=max_order))
            ]
        )
        
        # We need to fetch enough potential candidates. 
        # The number of chunks is roughly (backward + forward + 1).
        # We fetch a bit more to be safe.
        limit = (backward + forward + 1) + 5
        
        results, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=q_filter,
            limit=limit,
            with_payload=True,
            with_vectors=False
        )
        
        # 4. Format and Sort
        neighbors = []
        for point in results:
             neighbors.append({
                "id": point.id,
                "text": point.payload.get("text", ""),
                "metadata": {k: v for k, v in point.payload.items() if k != "text"},
                "score": 0.0 # Context retrieval doesn't have a similarity score
             })
        
        # Sort by order
        neighbors.sort(key=lambda x: int(x["metadata"].get("order", 0)))
        
        return neighbors

# Global instance
qdrant_service = QdrantService()
# qdrant_service.connect()
