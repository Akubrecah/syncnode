import pytest
import time
from fastapi.testclient import TestClient
from syncnode.server import app, RATE_LIMIT_STORE
from syncnode.security.crypto import sign_token, sign_refresh_token, verify_refresh_token, hash_password
from syncnode.database.repository import user_repository


@pytest.fixture
def client():
    # Clear rate limit store before test runs
    RATE_LIMIT_STORE.clear()
    return TestClient(app)


def test_security_headers(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_cors_preflight(client):
    res = client.options(
        "/api/v1/markets",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type"
        }
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert res.headers.get("access-control-allow-credentials") == "true"


def test_token_refresh_lifecycle(client):
    # Create test user
    user_id = "test_refresh_usr"
    email = "refreshtest@syncnode.exchange"
    user_repository.save({
        "id": user_id,
        "email": email,
        "password_hash": hash_password("ValidPassword123!"),
        "admin_roles": [],
        "is_suspended": False,
        "created_at": int(time.time() * 1000)
    })

    # Sign refresh token
    refresh_token = sign_refresh_token({"userId": user_id, "email": email})
    claims = verify_refresh_token(refresh_token)
    assert claims["type"] == "refresh"
    assert claims["userId"] == user_id

    # Call /api/v1/auth/refresh
    res = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert "refreshToken" in data

    # Test invalid refresh token
    bad_res = client.post("/api/v1/auth/refresh", json={"refreshToken": "invalid.jwt.token"})
    assert bad_res.status_code == 401


def test_rate_limiting_on_login(client):
    RATE_LIMIT_STORE.clear()
    email = "ratelimit@syncnode.exchange"
    user_repository.save({
        "id": "rate_usr",
        "email": email,
        "password_hash": hash_password("Secret123!"),
        "admin_roles": [],
        "is_suspended": False,
        "created_at": int(time.time() * 1000)
    })

    # Exhaust limit
    for _ in range(15):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword"})
        assert res.status_code in [401, 400]

    # 16th request must trigger 429 Too Many Requests
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword"})
    assert res.status_code == 429
    data = res.json()
    assert data["code"] == "TOO_MANY_REQUESTS"


def test_auth_me_unauthorized(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

    res_invalid = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer badtoken"})
    assert res_invalid.status_code == 401
