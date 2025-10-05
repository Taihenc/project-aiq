from typing import Dict, Optional
from app.models.chat import ChatRequest, ChatResponse, ChatBox, ChatSession, ChatTurn
from app.config import settings, get_model_config
from app.services.embedding_service import EmbeddingService
from app.services.crewai_service import CrewAIService
from datetime import datetime
import uuid
import logging
import asyncio
import time

logger = logging.getLogger(__name__)


class ChatService:
    """Chat service for handling chat and AI-related operations"""

    def __init__(self):
        self.chat_session: Dict[str, ChatSession] = {}
        self.embedding_service = EmbeddingService()
        self.crewai_service = CrewAIService()

    async def check_session(self, session_id: str) -> bool:
        """
        Check if session exists
        """
        return session_id in self.chat_session

    async def create_session(self) -> str:
        """
        Create a new session
        """
        session_id = str(uuid.uuid4())
        self.chat_session[session_id] = ChatSession(
            session_id=session_id,
            history=[],
        )
        return session_id

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """
        Process chat request using RAG and CrewAI agents
        """
        start_time = time.time()

        try:
            # Extract path filter from context if available
            path_filter = None
            if request.chat_box.context and "path" in request.chat_box.context:
                path_filter = request.chat_box.context["path"]

            # Perform semantic search
            search_results = await self.embedding_service.search(
                query=request.chat_box.message,
                file_path_filter=path_filter,
                limit=settings.SEARCH_RESULTS_LIMIT,
            )

            # Process with CrewAI agents
            response_message = await self.crewai_service.process_chat_with_agents(
                user_query=request.chat_box.message,
                search_results=search_results,
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Create response chat box
            response_chat_box = ChatBox(
                message=response_message,
                context={
                    "search_results_count": len(search_results),
                    "path_filter": path_filter,
                    "agent_processed": True,
                },
            )

            # Add to chat history
            self.chat_session[request.session_id].history.append(
                ChatTurn(
                    chat_id=str(uuid.uuid4()),
                    request=request.chat_box,
                    response=response_chat_box,
                    timestamp=datetime.now().isoformat(),
                )
            )

            # Generate response
            response = ChatResponse(
                chat_box=response_chat_box,
                model_used=request.model,
                timestamp=datetime.now().isoformat(),
                processing_time_ms=processing_time,
                prompt_tokens=len(request.chat_box.message.split()),
                completion_tokens=len(response_message.split()),
                total_tokens=len(request.chat_box.message.split())
                + len(response_message.split()),
                session_id=request.session_id,
                chat_id=str(uuid.uuid4()),
            )

            logger.info(
                f"Processed chat request for session {request.session_id} - Agent response generated with {len(search_results)} search results"
            )

            return response

        except Exception as e:
            logger.error(f"Error processing chat request: {str(e)}")

            # Fallback to error response
            processing_time = int((time.time() - start_time) * 1000)
            error_message = "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผลคำถาม กรุณาลองใหม่อีกครั้ง"

            response_chat_box = ChatBox(
                message=error_message,
                context={"error": True, "error_message": str(e)},
            )

            self.chat_session[request.session_id].history.append(
                ChatTurn(
                    chat_id=str(uuid.uuid4()),
                    request=request.chat_box,
                    response=response_chat_box,
                    timestamp=datetime.now().isoformat(),
                )
            )

            return ChatResponse(
                chat_box=response_chat_box,
                model_used=request.model,
                timestamp=datetime.now().isoformat(),
                processing_time_ms=processing_time,
                prompt_tokens=len(request.chat_box.message.split()),
                completion_tokens=len(error_message.split()),
                total_tokens=len(request.chat_box.message.split())
                + len(error_message.split()),
                session_id=request.session_id,
                chat_id=str(uuid.uuid4()),
            )

    async def get_chat_history(self, session_id: str) -> ChatSession:
        """
        Get chat history - return a specific chat session
        """
        return self.chat_session[session_id]
