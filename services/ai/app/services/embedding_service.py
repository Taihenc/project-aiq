"""
Embedding service for semantic search using Qdrant vector database
"""

import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    Filter,
    FieldCondition,
    MatchText,
    Document,
)
from typing import List, Dict, Optional, Tuple
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str = settings.DEFAULT_EMBEDDING_MODEL):
        """Initialize the embedding service with Qdrant client"""
        self.qdrant_client = QdrantClient(":memory:")
        self.model_name = model_name
        self.collection_name = "knowledge_base"
        self._setup_collection()
        self._mock_articles()

    def _setup_collection(self):
        """Setup Qdrant collection"""
        # Create collection
        self.qdrant_client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=self.qdrant_client.get_embedding_size(self.model_name),
                distance=Distance.COSINE,
            ),
        )

    def _mock_articles(self):
        # Mock articles for demonstration
        mock_articles = [
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "content": "Artificial intelligence development and its impact on future labor markets, including employee adaptation in the digital age",
                "path": "/research/technology/ai/workforce_impact.md",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440002",
                "content": "Climate change and methods for reducing greenhouse gas emissions in the industrial sector",
                "path": "/research/environment/climate/industrial_emissions.pdf",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440003",
                "content": "ETF investment trends and long-term portfolio building strategies",
                "path": "/documents/finance/investment/etf_strategies.docx",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440004",
                "content": "AI SERIVCE is nothing.you need to write it.",
                "path": "project/project-aiq/services/ai/README.md",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440005",
                "content": "Mental health care in the social media era and stress management from the online world",
                "path": "/research/health/mental/social_media_impact.md",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440006",
                "content": "Electric vehicle innovations and charging station infrastructure development in Thailand",
                "path": "/research/technology/transport/ev_infrastructure.pdf",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440007",
                "content": "Online education and hybrid learning after the COVID-19 pandemic",
                "path": "/documents/education/online/hybrid_learning.txt",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440008",
                "content": "Smart city development and IoT technology for urban resource management",
                "path": "/research/technology/smart_city/iot_management.md",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440009",
                "content": "Gaming industry in Thailand and opportunities in international Esports markets",
                "path": "/documents/business/gaming/esports_market.pdf",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440010",
                "content": "Sustainable agriculture and technology adoption for increasing agricultural productivity",
                "path": "/research/agriculture/sustainable/tech_farming.docx",
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440011",
                "content": "Ecotourism and nature conservation in tourist destinations across the country",
                "path": "/documents/tourism/eco/nature_conservation.md",
            },
        ]

        # Create embeddings for mock articles
        documents = [
            Document(text=article["content"], model=self.model_name)
            for article in mock_articles
        ]

        # Upload documents
        self.qdrant_client.upload_collection(
            collection_name=self.collection_name,
            vectors=documents,
            ids=[article["id"] for article in mock_articles],
            payload=[article for article in mock_articles],
        )

        logger.info(
            f"Initialized embedding service with {len(mock_articles)} documents"
        )

    async def search(
        self,
        query: str,
        file_path_filter: Optional[str] = "/",
        limit: int = settings.SEARCH_RESULTS_LIMIT,
    ) -> List[Dict]:
        """
        Search for similar documents using semantic search
        """
        try:
            # Create query filter if file path is provided
            query_filter = None
            if file_path_filter:
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="path", match=MatchText(text=file_path_filter)
                        )
                    ]
                )

            # Perform search
            response = self.qdrant_client.query_points(
                collection_name=self.collection_name,
                query=Document(text=query, model=self.model_name),
                limit=limit,
                query_filter=query_filter,
            )

            # Format results
            results = []
            for point in response.points:
                results.append(
                    {
                        "document_id": point.payload["id"],
                        "content": point.payload["content"],
                        "path": point.payload["path"],
                        "score": float(point.score),
                    }
                )

            logger.info(f"Found {len(results)} results for query: {query}")
            return results

        except Exception as e:
            logger.error(f"Error in embedding search: {str(e)}")
            return []

    async def upload_document(self):
        """
        Upload a new document to the collection
        """
        pass
