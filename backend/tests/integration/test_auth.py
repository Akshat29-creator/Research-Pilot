import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    payload = {"email": "researcher@example.com", "password": "SecurePassword123!"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "researcher@example.com"
    assert data["user"]["is_active"] is True
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "duplicate@example.com", "password": "SecurePassword123!"}
    # First registration
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    # Second registration with identical email
    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409
    data = resp2.json()
    assert data["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    reg_payload = {"email": "login_test@example.com", "password": "CorrectPassword123!"}
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {"email": "login_test@example.com", "password": "CorrectPassword123!"}
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login_test@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    reg_payload = {"email": "wrong_pw@example.com", "password": "CorrectPassword123!"}
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {"email": "wrong_pw@example.com", "password": "TotallyWrongPassword!"}
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient):
    reg_payload = {"email": "me_test@example.com", "password": "MySecretPassword123!"}
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["access_token"]

    # Request /me with token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == "me_test@example.com"


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "AUTHENTICATION_FAILED"
