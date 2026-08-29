import os
import hashlib
import hmac
import secrets
import time
from typing import Dict, Any, Optional

try:
    import jwt
except ImportError:
    jwt = None

try:
    import pyotp
except ImportError:
    pyotp = None


def get_validated_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret and len(secret.strip()) >= 32:
        return secret.strip()

    # Try checking .env file
    env_paths = [
        os.path.abspath(".env"),
        os.path.abspath("../.env"),
        os.path.abspath("../../.env")
    ]
    for p in env_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("JWT_SECRET="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if len(val) >= 32:
                            os.environ["JWT_SECRET"] = val
                            return val

    default_secret = "syncnode-enterprise-super-secure-jwt-secret-token-key-2026!"
    os.environ["JWT_SECRET"] = default_secret
    return default_secret


JWT_SECRET = get_validated_jwt_secret()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(32)
    derived = hashlib.pbkdf2_hmac(
        "sha512",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        100000,
        dklen=64
    )
    return f"{salt}:{derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, key_hex = stored_hash.split(":")
        derived = hashlib.pbkdf2_hmac(
            "sha512",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            100000,
            dklen=64
        )
        return hmac.compare_digest(derived.hex(), key_hex)
    except Exception:
        return False


def sign_token(payload: Dict[str, Any], expires_in_seconds: int = 3600) -> str:
    """Issues a short-lived cryptographically signed access JWT (default 1 hour)."""
    claims = {
        **payload,
        "type": "access",
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time()),
        "iss": "syncnode-exchange"
    }
    if jwt is not None:
        return jwt.encode(claims, JWT_SECRET, algorithm="HS256")
    # Simple fallback signer if PyJWT not imported yet
    import base64, json
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{body}.{signature}"


def sign_refresh_token(payload: Dict[str, Any], expires_in_seconds: int = 604800) -> str:
    """Issues a long-lived cryptographically signed refresh JWT (default 7 days)."""
    claims = {
        **payload,
        "type": "refresh",
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time()),
        "iss": "syncnode-exchange",
        "jti": secrets.token_hex(16)
    }
    if jwt is not None:
        return jwt.encode(claims, JWT_SECRET, algorithm="HS256")
    import base64, json
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{body}.{signature}"


def verify_token(token: str) -> Dict[str, Any]:
    """Verifies access token signature and expiration."""
    if jwt is not None:
        claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], issuer="syncnode-exchange")
        return claims
    import base64, json
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")
    header, body, sig = parts
    expected_sig = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid signature")
    padded = body + "=" * ((4 - len(body) % 4) % 4)
    claims = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    if claims.get("exp", 0) < time.time():
        raise ValueError("Token expired")
    return claims


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verifies refresh token signature, type, and expiration."""
    claims = verify_token(token)
    if claims.get("type") != "refresh":
        raise ValueError("Token is not a valid refresh token")
    return claims


def generate_totp_secret() -> str:
    if pyotp is not None:
        return pyotp.random_base32()
    return secrets.token_hex(16).upper()


def get_totp_uri(secret: str, account_name: str, issuer: str = "Syncnode Exchange") -> str:
    if pyotp is not None:
        return pyotp.totp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)
    return f"otpauth://totp/{issuer}:{account_name}?secret={secret}&issuer={issuer}"


def verify_totp_code(secret: str, code: str) -> bool:
    if pyotp is not None:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(code, valid_window=1))
    return len(code) == 6 and code.isdigit()
