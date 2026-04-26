"""Unit tests for AgentService pure helper functions.

All functions tested here are module-level helpers with no I/O, no OpenAI
calls, and no DB dependency — so they run without any fixtures.

Functions covered
-----------------
``_needs_tool``       — intent detection: should we force tool_choice="required"?
``_is_safety_refusal`` — refusal detection: did the model emit a guardrail refusal?
``_trim_history``     — history trimming: keeps the most recent turns within the
                        character budget while always preserving the system message.
"""

from app.services.agent_service import (
    _MAX_HISTORY_CHARS,
    _needs_tool,
    _is_safety_refusal,
    _trim_history,
)


# ── _needs_tool ───────────────────────────────────────────────────────────────


def _user_msg(content: str) -> dict:
    return {"role": "user", "content": content}


def _sys_msg(content: str = "system prompt") -> dict:
    return {"role": "system", "content": content}


def _assistant_msg(content: str = "ok") -> dict:
    return {"role": "assistant", "content": content}


class TestNeedsTool:
    def test_iata_code_triggers_tool(self):
        history = [_sys_msg(), _user_msg("I want to fly from JFK to LAX")]
        assert _needs_tool(history) is True

    def test_iata_code_case_insensitive(self):
        history = [_sys_msg(), _user_msg("I want to fly from jfk to lax")]
        assert _needs_tool(history) is True

    def test_flight_keyword_triggers_tool(self):
        history = [_sys_msg(), _user_msg("Show me all available flights")]
        assert _needs_tool(history) is True

    def test_book_keyword_triggers_tool(self):
        history = [_sys_msg(), _user_msg("I'd like to book a ticket")]
        assert _needs_tool(history) is True

    def test_cancel_keyword_triggers_tool(self):
        history = [_sys_msg(), _user_msg("I need to cancel my reservation")]
        assert _needs_tool(history) is True

    def test_booking_reference_prefix_triggers_tool(self):
        history = [_sys_msg(), _user_msg("Please retrieve booking PF-ABC123")]
        assert _needs_tool(history) is True

    def test_general_question_does_not_trigger_tool(self):
        history = [_sys_msg(), _user_msg("What is the weather like in Paris?")]
        assert _needs_tool(history) is False

    def test_greeting_does_not_trigger_tool(self):
        history = [_sys_msg(), _user_msg("Hello, how are you?")]
        assert _needs_tool(history) is False

    def test_uses_last_user_message_only(self):
        # Earlier message has flight keywords; last message is general
        history = [
            _sys_msg(),
            _user_msg("I want to book a flight to LAX"),
            _assistant_msg("Sure, when would you like to fly?"),
            _user_msg("Never mind, tell me a joke"),
        ]
        assert _needs_tool(history) is False

    def test_empty_history_returns_false(self):
        assert _needs_tool([]) is False

    def test_no_user_message_returns_false(self):
        history = [_sys_msg(), _assistant_msg("Hello!")]
        assert _needs_tool(history) is False

    def test_economy_cabin_keyword_triggers_tool(self):
        history = [_sys_msg(), _user_msg("I prefer economy class")]
        assert _needs_tool(history) is True

    def test_passenger_keyword_triggers_tool(self):
        history = [_sys_msg(), _user_msg("There will be 2 passengers")]
        assert _needs_tool(history) is True

    def test_modify_booking_triggers_tool(self):
        history = [_sys_msg(), _user_msg("I need to modify my booking")]
        assert _needs_tool(history) is True


# ── _is_safety_refusal ────────────────────────────────────────────────────────


class TestIsSafetyRefusal:
    def test_unable_to_book_is_refusal(self):
        assert _is_safety_refusal("I'm unable to book flights for you.")

    def test_cannot_book_is_refusal(self):
        assert _is_safety_refusal("I cannot book reservations through this system.")

    def test_contact_airline_is_refusal(self):
        assert _is_safety_refusal(
            "You should contact the airline directly to resolve this."
        )

    def test_airline_website_is_refusal(self):
        assert _is_safety_refusal("Please visit the airline's website to book.")

    def test_visit_official_website_pattern_is_refusal(self):
        assert _is_safety_refusal(
            "I recommend you visit Southwest's official website for booking."
        )

    def test_visit_united_official_website_is_refusal(self):
        assert _is_safety_refusal("Please visit United's official website.")

    def test_cannot_process_booking_is_refusal(self):
        assert _is_safety_refusal("I cannot process booking requests at this time.")

    def test_i_do_not_have_access_to_booking_is_refusal(self):
        assert _is_safety_refusal("I do not have access to booking systems.")

    def test_case_insensitive(self):
        assert _is_safety_refusal("I CANNOT BOOK flights for security reasons.")

    def test_normal_booking_confirmation_is_not_refusal(self):
        # Legitimate: model DID book, now confirming
        assert not _is_safety_refusal(
            "Your flight from JFK to LAX has been confirmed! "
            "Booking reference: PF-ABC123. Total: $299.00."
        )

    def test_cannot_find_flights_is_not_refusal(self):
        # "unable to find" is explicitly NOT a refusal phrase — real search result
        assert not _is_safety_refusal(
            "I'm unable to find any flights matching your criteria. "
            "Please try different dates or a different route."
        )

    def test_search_result_summary_is_not_refusal(self):
        assert not _is_safety_refusal(
            "Here are the available flights from JFK to LAX on June 15th: "
            "Delta DL 401 departing 08:00, arriving 11:30. Economy $299."
        )

    def test_cancellation_success_is_not_refusal(self):
        assert not _is_safety_refusal(
            "Your booking PF-XYZ789 has been successfully cancelled. "
            "A refund will be processed within 5–7 business days."
        )

    def test_empty_string_is_not_refusal(self):
        assert not _is_safety_refusal("")

    def test_where_you_booked_is_refusal(self):
        assert _is_safety_refusal(
            "Please contact the platform where you booked your ticket."
        )


# ── _trim_history ─────────────────────────────────────────────────────────────


class TestTrimHistory:
    def _build_history(self, n_turns: int, chars_per_turn: int = 100) -> list[dict]:
        """Build a history with a system message followed by n_turns user+assistant pairs."""
        history = [_sys_msg("system prompt")]
        for i in range(n_turns):
            history.append(_user_msg("u" * chars_per_turn))
            history.append(_assistant_msg("a" * chars_per_turn))
        return history

    def test_short_history_returned_unchanged(self):
        history = self._build_history(n_turns=2, chars_per_turn=50)
        result = _trim_history(history)
        assert result == history

    def test_system_message_always_preserved(self):
        # Build a history that will definitely need trimming
        history = self._build_history(n_turns=200, chars_per_turn=500)
        result = _trim_history(history)
        assert result[0]["role"] == "system"
        assert result[0]["content"] == "system prompt"

    def test_trimmed_history_within_char_limit(self):
        history = self._build_history(n_turns=200, chars_per_turn=500)
        result = _trim_history(history)
        total = sum(len(str(m.get("content") or "")) for m in result)
        assert total <= _MAX_HISTORY_CHARS

    def test_most_recent_messages_retained(self):
        """After trimming, the LAST messages in the original history must survive."""
        history = self._build_history(n_turns=200, chars_per_turn=500)
        last_user = history[-2]  # second-to-last is user
        last_asst = history[-1]  # last is assistant
        result = _trim_history(history)
        assert last_user in result
        assert last_asst in result

    def test_oldest_messages_dropped_first(self):
        """Trimming must drop from the front, not the back."""
        history = [_sys_msg()]
        # Add a distinctive "old" message followed by many large messages
        old_marker = {"role": "user", "content": "THIS_IS_THE_OLD_MESSAGE"}
        history.append(old_marker)
        for _ in range(200):
            history.append(_user_msg("x" * 500))
        result = _trim_history(history)
        assert old_marker not in result

    def test_trim_returns_list_not_mutating_original(self):
        history = self._build_history(n_turns=200, chars_per_turn=500)
        original_len = len(history)
        _trim_history(history)
        # The function should not mutate the original list
        assert len(history) == original_len

    def test_single_system_message_unchanged(self):
        history = [_sys_msg("only system")]
        result = _trim_history(history)
        assert result == history

    def test_history_exactly_at_limit_not_trimmed(self):
        """A history whose total char count equals the limit should not be trimmed."""
        # Build a history whose content sums to exactly _MAX_HISTORY_CHARS
        content = "x" * (_MAX_HISTORY_CHARS - len("system prompt"))
        history = [_sys_msg("system prompt"), _user_msg(content)]
        result = _trim_history(history)
        assert len(result) == 2
