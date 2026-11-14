from datetime import timedelta

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing_and_verification():
    raw_password = "SuperSecretPassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_create_and_decode_valid():
    payload_data = {"sub": "user-uuid-123", "email": "test@researchpilot.ai"}
    token = create_access_token(payload_data)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["email"] == "test@researchpilot.ai"
    assert "exp" in decoded


def test_jwt_expired_token():
    payload_data = {"sub": "user-uuid-123"}
    # Token expired 1 hour ago
    token = create_access_token(payload_data, expires_delta=timedelta(hours=-1))

    decoded = decode_access_token(token)
    assert decoded is None


def test_jwt_tampered_token():
    token = create_access_token({"sub": "user-uuid-123"})
    tampered_token = token[:-5] + "aaaaa"

    decoded = decode_access_token(tampered_token)
    assert decoded is None
