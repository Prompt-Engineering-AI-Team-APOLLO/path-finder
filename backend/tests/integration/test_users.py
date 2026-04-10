"""Integration tests for /api/v1/users endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, user_payload: dict):
    response = await client.post("/api/v1/users", json=user_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_payload["email"]
    assert data["username"] == user_payload["username"]
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, user_payload: dict):
    await client.post("/api/v1/users", json=user_payload)
    response = await client.post("/api/v1/users", json=user_payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient, user_payload: dict):
    user_payload["password"] = "weak"
    response = await client.post("/api/v1/users", json=user_payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_and_get_me(client: AsyncClient, user_payload: dict):
    # Register
    await client.post("/api/v1/users", json=user_payload)

    # Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["tokens"]["access_token"]

    # Get /me
    me_resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == user_payload["email"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 403


# ── helpers ───────────────────────────────────────────────────────────────────


async def _auth_header(client: AsyncClient, payload: dict) -> dict:
    """Register + login and return an Authorization header dict."""
    await client.post("/api/v1/users", json=payload)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    token = login.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── update profile ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_me_full_name(client: AsyncClient, user_payload: dict):
    headers = await _auth_header(client, user_payload)

    resp = await client.patch(
        "/api/v1/users/me",
        json={"full_name": "Updated Name"},
        headers=headers,
    )

    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_me_unauthenticated(client: AsyncClient):
    resp = await client.patch("/api/v1/users/me", json={"full_name": "Hacker"})
    assert resp.status_code == 403


# ── change password ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, user_payload: dict):
    headers = await _auth_header(client, user_payload)

    resp = await client.post(
        "/api/v1/users/me/password",
        json={"current_password": user_payload["password"], "new_password": "NewSecure9"},
        headers=headers,
    )

    assert resp.status_code == 200
    assert "message" in resp.json()


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient, user_payload: dict):
    headers = await _auth_header(client, user_payload)

    resp = await client.post(
        "/api/v1/users/me/password",
        json={"current_password": "WrongOldPass1", "new_password": "NewSecure9"},
        headers=headers,
    )

    assert resp.status_code == 400
