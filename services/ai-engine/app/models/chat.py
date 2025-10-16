from enum import Enum

from pydantic import BaseModel


class Role(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    # tool = "tool"  # OpenAI: enable when supporting tool role


class ChatMessage(BaseModel):
    role: Role
    content: str


# ----------------------------------------------
# OpenAI-compatible message extensions (commented)
# ----------------------------------------------
# from typing import Optional, List
#
# class ToolCallFunction(BaseModel):
#     name: str
#     arguments: str  # JSON string
#
# class ToolCall(BaseModel):
#     id: str
#     type: str  # "function"
#     function: ToolCallFunction
#
# class ContentPart(BaseModel):
#     type: str  # "text" | future multimodal parts
#     text: str
#
# class ChatMessage(BaseModel):
#     role: Role
#     content: str | List[ContentPart]
#     name: Optional[str] = None
#     tool_call_id: Optional[str] = None  # for role=="tool"
#     tool_calls: Optional[List[ToolCall]] = None  # for assistant tool calls
