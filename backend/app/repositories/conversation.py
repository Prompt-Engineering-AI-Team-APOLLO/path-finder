"""Repositories for Conversation and Message records.

ConversationRepository  — CRUD + user-scoped queries for Conversation rows.
MessageRepository       — append + paginated read for Message rows within a conversation.

These repositories make the Conversation / Message ORM models (defined in
app/models/conversation.py) usable from service and endpoint layers.

Wiring a new feature that persists chat history
-----------------------------------------------
1. Inject ``ConversationRepository`` via a new ``get_conversation_service`` dep
   in ``app/api/deps.py`` (follow the pattern for ``get_flight_service``).
2. Call ``repo.get_or_create(user_id, conversation_id)`` to resolve an existing
   conversation or start a new one.
3. Call ``msg_repo.append(conversation_id, role, content, tokens, model)`` after
   each LLM turn.

The ``ai.py`` endpoint's ``_log_conversation_turn`` background task is the
intended first caller once this is wired in.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Conversation, session)

    async def get_by_user_id(self, user_id: uuid.UUID) -> list[Conversation]:
        """Return all conversations for a user, newest first."""
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_messages(self, conversation_id: uuid.UUID) -> Conversation | None:
        """Return a conversation with its messages eagerly loaded (single query)."""
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID | None,
        *,
        title: str = "New Conversation",
    ) -> Conversation:
        """Return the requested conversation if it exists and belongs to the user.

        If ``conversation_id`` is None or the conversation is not found, a new
        one is created.  This is the preferred entry point for endpoints that
        accept an optional ``conversation_id`` from the client.
        """
        if conversation_id is not None:
            existing = await self.get_by_id(conversation_id)
            if existing is not None and existing.user_id == user_id:
                return existing

        return await self.create(
            Conversation(user_id=user_id, title=title)
        )


class MessageRepository(BaseRepository[Message]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Message, session)

    async def get_by_conversation(
        self,
        conversation_id: uuid.UUID,
        *,
        limit: int = 100,
    ) -> list[Message]:
        """Return messages for a conversation in chronological order."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def append(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        *,
        tokens_used: int | None = None,
        model: str | None = None,
    ) -> Message:
        """Append one message turn to a conversation and return it."""
        return await self.create(
            Message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                tokens_used=tokens_used,
                model=model,
            )
        )
