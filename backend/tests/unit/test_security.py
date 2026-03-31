"""Unit tests for security utilities."""

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_subject,
    get_token_type,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plain(self):
        hashed = hash_password("mypassword")
        assert hashed != "mypassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correct-horse-battery")
        assert verify_password("correct-horse-battery", hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("correct-horse-battery")
        assert verify_password("wrong", hashed) is False

    def test_unique_hashes(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt salts each hash


class TestJWT:
    def test_access_token_roundtrip(self):
        token = create_access_token("user-123")
        subject = get_token_subject(token)
        assert subject == "user-123"

    def test_access_token_type(self):
        token = create_access_token("user-123")
        assert get_token_type(token) == "access"

    def test_refresh_token_type(self):
        token = create_refresh_token("user-123")
        assert get_token_type(token) == "refresh"

    def test_extra_claims_in_token(self):
        token = create_access_token("user-456", extra_claims={"role": "admin"})
        payload = decode_token(token)
        assert payload["role"] == "admin"

    def test_invalid_token_raises(self):
        with pytest.raises(JWTError):
            decode_token("not.a.valid.token")
