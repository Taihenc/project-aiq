from typing import Dict
from app.models.chat import ChatRequest, ChatResponse, ChatBox, ChatSession, ChatTurn
from app.config import settings, get_model_config
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
        Process chat request - mock implementation
        """
        # Simulate processing time
        start_time = time.time()
        await asyncio.sleep(0.25)  # Simulate AI processing delay
        processing_time = int((time.time() - start_time) * 1000)

        # Generate mock response message
        mock_responses = "ขออภัยครับ ผมยังไม่สามารถตอบคำถามนี้ได้ในขณะนี้"

        response_message = mock_responses

        # Create response chat box
        response_chat_box = ChatBox(
            message=response_message,
            context={"mock": True},
        )
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
            f"Processed chat request for session {request.session_id} - Mock response generated"
        )

        return response

    async def get_chat_history(self, session_id: str) -> ChatSession:
        """
        Get chat history - return a specific chat session
        """
        return self.chat_session[session_id]
