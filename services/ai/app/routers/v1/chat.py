from fastapi import APIRouter, HTTPException, Body
from app.config import settings
from app.models.chat import ChatRequest, ChatResponse, ChatSession
from app.services.chat_service import ChatService

router = APIRouter()
chat_service = ChatService()


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest = Body(
        example={
            "chat_box": {
                "message": "ช่วยหาไฟล์README ของai service ให้หน่อย พร้อมสรุปเนื้อหาสั้นๆ",
                "context": {
                    "path": "project/project-aiq",
                },
            },
            "session_id": "session_67890",
            "provider": settings.DEFAULT_PROVIDER,
            "model": settings.DEFAULT_MODEL,
            "temperature": settings.DEFAULT_TEMPERATURE,
            "top_k": settings.DEFAULT_TOP_K,
            "top_p": settings.DEFAULT_TOP_P,
            "max_tokens": settings.DEFAULT_MAX_TOKENS,
            "frequency_penalty": settings.DEFAULT_FREQUENCY_PENALTY,
            "presence_penalty": settings.DEFAULT_PRESENCE_PENALTY,
            "stream": settings.DEFAULT_STREAM,
            "seed": settings.DEFAULT_SEED,
        }
    )
):
    """
    Chat endpoint - Process chat message and return AI response
    """
    try:
        if request.session_id is None:
            request.session_id = await chat_service.create_session()
        if await chat_service.check_session(request.session_id) is False:
            raise HTTPException(status_code=404, detail="Session not found")
        response = await chat_service.process_chat(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/get-history", response_model=ChatSession)
async def get_chat_history(session_id: str = Body(example="session_67890")):
    """
    Get chat history - Receive session_id and return chat history
    """
    try:
        history = await chat_service.get_chat_history(session_id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


@router.post("/create-session", response_model=str)
async def create_chat_session():
    """
    Create a new chat session
    """
    try:
        session_id = await chat_service.create_session()
        return session_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


@router.get("/check-session", response_model=bool)
async def check_chat_session(session_id: str = Body(example="session_67890")):
    """
    Check if chat session exists
    """
    try:
        check = await chat_service.check_session(session_id)
        return check
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")
