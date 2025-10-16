from typing import List, Optional, Literal

from app.config import settings
from pydantic import BaseModel

from app.models.chat import ChatMessage, Role


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = settings.DEFAULT_STREAM
    temperature: Optional[float] = settings.DEFAULT_TEMPERATURE
    max_tokens: Optional[int] = settings.DEFAULT_MAX_TOKENS

    # --- OpenAI extras (commented for later enable) ---
    # frequency_penalty: Optional[float] = None
    # presence_penalty: Optional[float] = None
    # logit_bias: Optional[dict[str, float]] = None
    # logprobs: Optional[bool] = None
    # top_logprobs: Optional[int] = None
    # top_p: Optional[float] = None
    # n: Optional[int] = None
    # stop: Optional[str | list[str]] = None
    # seed: Optional[int] = None
    # user: Optional[str] = None
    #
    # class FunctionObject(BaseModel):
    #     name: str
    #     description: Optional[str] = None
    #     parameters: Optional[dict] = None  # JSON Schema
    #
    # class ToolDefinition(BaseModel):
    #     type: Literal["function"]
    #     function: FunctionObject
    #
    # tools: Optional[list[ToolDefinition]] = None
    # tool_choice: Optional[str | dict] = None  # "auto" | "none" | {type:function, function:{name}}
    # function_call: Optional[str | dict] = None  # legacy support
    #
    # class ResponseFormat(BaseModel):
    #     type: Literal["text", "json_object"]
    #
    # response_format: Optional[ResponseFormat] = None
    # stream_options: Optional[dict] = None


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[Literal["stop", "length"]] = None
    # logprobs: Optional["ChatCompletionLogprobs"] = None  # forward ref when enabled


class ChatCompletion(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    # usage: Optional["Usage"] = None
    # system_fingerprint: Optional[str] = None

    # class Usage(BaseModel):
    #     prompt_tokens: int
    #     completion_tokens: int
    #     total_tokens: int


# Streaming (minimal structure)
class ChoiceDelta(BaseModel):
    role: Optional[Role] = None
    content: Optional[str] = None
    # tool_calls: Optional[list["DeltaToolCall"]] = None


class ChunkChoice(BaseModel):
    index: int
    delta: ChoiceDelta
    finish_reason: Optional[Literal["stop", "length"]] = None
    # logprobs: Optional["ChatCompletionLogprobs"] = None


class ChatCompletionChunk(BaseModel):
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: List[ChunkChoice]


# ----------------------------------------------
# OpenAI logprobs (commented)
# ----------------------------------------------
# class TopLogprob(BaseModel):
#     token: str
#     logprob: float
#     bytes: Optional[list[int]] = None
#
# class TokenLogprob(BaseModel):
#     token: str
#     logprob: float
#     bytes: Optional[list[int]] = None
#     top_logprobs: Optional[list[TopLogprob]] = None
#
# class ChatCompletionLogprobs(BaseModel):
#     content: list[TokenLogprob]

# ----------------------------------------------
# OpenAI streaming tool_calls delta (commented)
# ----------------------------------------------
# class DeltaToolCallFunction(BaseModel):
#     name: Optional[str] = None
#     arguments: Optional[str] = None
#
# class DeltaToolCall(BaseModel):
#     index: int
#     id: Optional[str] = None
#     type: Literal["function"]
#     function: Optional[DeltaToolCallFunction] = None
