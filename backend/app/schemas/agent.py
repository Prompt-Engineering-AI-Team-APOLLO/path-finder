"""Pydantic schemas for the agent chat endpoint."""

from typing import Literal

from pydantic import BaseModel


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AgentChatRequest(BaseModel):
    messages: list[AgentMessage]
    context: dict | None = None
