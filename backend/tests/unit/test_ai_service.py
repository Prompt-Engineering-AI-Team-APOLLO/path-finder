"""Unit tests for AIService helper functions and cost estimation.

All functions under test are pure helpers with no external I/O.
OpenAI client calls are not tested here — those paths are covered by
the retry/error-handling integration tests.

Functions covered
-----------------
``_is_retryable``     — which errors should trigger exponential back-off?
``_user_message_for`` — safe, human-readable error strings for each error type
``estimate_cost_usd`` — per-request USD cost from token counts + pricing table
"""

import pytest
from unittest.mock import MagicMock

from app.core.constants import AI_TOKEN_COSTS, estimate_cost_usd
from app.services.ai_service import _is_retryable, _user_message_for


# ── helpers ───────────────────────────────────────────────────────────────────


def _api_status_error(status_code: int, message: str = "") -> "openai.APIStatusError":
    """Build a lightweight APIStatusError without a real HTTP response."""
    from openai import APIStatusError
    mock_response = MagicMock()
    mock_response.status_code = status_code
    return APIStatusError(message=message, response=mock_response, body=None)


# ── _is_retryable ─────────────────────────────────────────────────────────────


class TestIsRetryable:
    def test_rate_limit_error_is_retryable(self):
        from openai import RateLimitError
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        exc = RateLimitError(message="rate limited", response=mock_resp, body=None)
        assert _is_retryable(exc) is True

    def test_api_connection_error_is_retryable(self):
        from openai import APIConnectionError
        exc = APIConnectionError(request=MagicMock())
        assert _is_retryable(exc) is True

    def test_api_status_429_is_retryable(self):
        exc = _api_status_error(429, "Too Many Requests")
        assert _is_retryable(exc) is True

    def test_api_status_503_is_retryable(self):
        exc = _api_status_error(503, "Service Unavailable")
        assert _is_retryable(exc) is True

    def test_api_status_401_is_not_retryable(self):
        exc = _api_status_error(401, "Unauthorized")
        assert _is_retryable(exc) is False

    def test_api_status_400_is_not_retryable(self):
        exc = _api_status_error(400, "Bad Request")
        assert _is_retryable(exc) is False

    def test_api_status_413_is_not_retryable(self):
        exc = _api_status_error(413, "Request Entity Too Large")
        assert _is_retryable(exc) is False

    def test_generic_value_error_is_not_retryable(self):
        assert _is_retryable(ValueError("something went wrong")) is False

    def test_generic_runtime_error_is_not_retryable(self):
        assert _is_retryable(RuntimeError("unexpected")) is False


# ── _user_message_for ─────────────────────────────────────────────────────────


class TestUserMessageFor:
    def test_rate_limit_message_mentions_demand(self):
        from openai import RateLimitError
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        exc = RateLimitError(message="rate limited", response=mock_resp, body=None)
        msg = _user_message_for(exc)
        assert "rate limit" in msg.lower() or "demand" in msg.lower()

    def test_401_message_mentions_configuration(self):
        exc = _api_status_error(401)
        msg = _user_message_for(exc)
        assert "configured" in msg.lower() or "support" in msg.lower()

    def test_context_length_message_mentions_conversation_too_long(self):
        exc = _api_status_error(413, "context_length_exceeded")
        msg = _user_message_for(exc)
        assert "long" in msg.lower() or "conversation" in msg.lower()

    def test_context_length_via_message_body(self):
        exc = _api_status_error(400, "context_length_exceeded detected")
        msg = _user_message_for(exc)
        assert "long" in msg.lower() or "conversation" in msg.lower()

    def test_502_503_504_mention_unavailable(self):
        for code in (502, 503, 504):
            exc = _api_status_error(code)
            msg = _user_message_for(exc)
            assert "unavailable" in msg.lower() or "try again" in msg.lower(), \
                f"Expected unavailability message for status {code}"

    def test_connection_error_mentions_reach(self):
        from openai import APIConnectionError
        exc = APIConnectionError(request=MagicMock())
        msg = _user_message_for(exc)
        assert "reach" in msg.lower() or "connection" in msg.lower()

    def test_unknown_error_returns_generic_message(self):
        msg = _user_message_for(ValueError("totally unknown error"))
        assert "sorry" in msg.lower() or "went wrong" in msg.lower()

    def test_all_messages_are_non_empty_strings(self):
        from openai import RateLimitError, APIConnectionError
        errors = [
            RateLimitError(message="rl", response=MagicMock(status_code=429), body=None),
            APIConnectionError(request=MagicMock()),
            _api_status_error(401),
            _api_status_error(413),
            _api_status_error(503),
            ValueError("unknown"),
        ]
        for exc in errors:
            msg = _user_message_for(exc)
            assert isinstance(msg, str)
            assert len(msg) > 0


# ── estimate_cost_usd ─────────────────────────────────────────────────────────


class TestEstimateCostUsd:
    # gpt-4o: $2.50/1M prompt, $10.00/1M completion
    def test_gpt4o_prompt_only(self):
        cost = estimate_cost_usd("gpt-4o", prompt_tokens=1_000_000, completion_tokens=0)
        assert abs(cost - 2.50) < 1e-6

    def test_gpt4o_completion_only(self):
        cost = estimate_cost_usd("gpt-4o", prompt_tokens=0, completion_tokens=1_000_000)
        assert abs(cost - 10.00) < 1e-6

    def test_gpt4o_combined(self):
        # 1K prompt + 500 completion = 0.0025 + 0.005 = 0.0075
        cost = estimate_cost_usd("gpt-4o", prompt_tokens=1_000, completion_tokens=500)
        assert abs(cost - 0.0075) < 1e-7

    # gpt-4o-mini: $0.15/1M prompt, $0.60/1M completion
    def test_gpt4o_mini_combined(self):
        # 5K prompt + 1K completion = 0.00075 + 0.0006 = 0.00135
        cost = estimate_cost_usd("gpt-4o-mini", prompt_tokens=5_000, completion_tokens=1_000)
        assert abs(cost - 0.00135) < 1e-7

    def test_gpt4o_mini_cheaper_than_gpt4o(self):
        tokens = 10_000
        assert estimate_cost_usd("gpt-4o-mini", tokens, tokens) < estimate_cost_usd(
            "gpt-4o", tokens, tokens
        )

    # Embedding models have no completion cost
    def test_embedding_small_tokens_only(self):
        # text-embedding-3-small: $0.02/1M tokens
        cost = estimate_cost_usd("text-embedding-3-small", prompt_tokens=100)
        assert abs(cost - 0.000002) < 1e-10

    def test_embedding_completion_arg_ignored(self):
        # Embeddings have 0 completion cost in the table; passing non-zero should
        # still only charge the prompt rate.
        cost_with = estimate_cost_usd("text-embedding-3-small", 1_000_000, 999)
        cost_without = estimate_cost_usd("text-embedding-3-small", 1_000_000, 0)
        assert abs(cost_with - cost_without) < 1e-6

    # Edge cases
    def test_unknown_model_returns_zero(self):
        assert estimate_cost_usd("gpt-99-turbo", 100_000, 50_000) == 0.0

    def test_zero_tokens_returns_zero(self):
        assert estimate_cost_usd("gpt-4o", 0, 0) == 0.0

    def test_return_type_is_float(self):
        assert isinstance(estimate_cost_usd("gpt-4o", 1000, 500), float)

    def test_result_rounded_to_8_decimal_places(self):
        cost = estimate_cost_usd("gpt-4o", 1, 1)
        # Should not have more precision than 8 decimal places
        assert cost == round(cost, 8)

    # Pricing table sanity checks
    def test_all_expected_models_in_cost_table(self):
        expected_models = {
            "gpt-4o",
            "gpt-4o-mini",
            "text-embedding-3-small",
            "text-embedding-3-large",
            "text-embedding-ada-002",
        }
        assert expected_models.issubset(set(AI_TOKEN_COSTS.keys()))

    def test_each_entry_has_prompt_and_completion_keys(self):
        for model, costs in AI_TOKEN_COSTS.items():
            assert "prompt" in costs, f"{model} missing 'prompt' key"
            assert "completion" in costs, f"{model} missing 'completion' key"

    def test_gpt4o_more_expensive_than_mini_per_token(self):
        assert AI_TOKEN_COSTS["gpt-4o"]["prompt"] > AI_TOKEN_COSTS["gpt-4o-mini"]["prompt"]
        assert AI_TOKEN_COSTS["gpt-4o"]["completion"] > AI_TOKEN_COSTS["gpt-4o-mini"]["completion"]
