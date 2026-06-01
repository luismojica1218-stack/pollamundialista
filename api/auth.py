import os
import time
import hmac
import hashlib
import binascii

# Semilla secreta para firmas de token (usamos CRON_SECRET o un fallback)
SECRET_KEY = os.environ.get("CRON_SECRET", "default_secret_key_polla_mundialista_2026").encode()

def hash_pin(pin: str) -> str:
    """Hash a PIN using PBKDF2 with a unique salt."""
    salt = os.urandom(16)
    db_hash = hashlib.pbkdf2_hmac('sha256', pin.encode(), salt, 100000)
    return f"{binascii.hexlify(salt).decode()}:{binascii.hexlify(db_hash).decode()}"

def verify_pin(pin: str, hashed: str) -> bool:
    """Verify a PIN against its PBKDF2 hash."""
    try:
        salt_hex, hash_hex = hashed.split(":")
        salt = binascii.unhexlify(salt_hex)
        db_hash = binascii.unhexlify(hash_hex)
        new_hash = hashlib.pbkdf2_hmac('sha256', pin.encode(), salt, 100000)
        return hmac.compare_digest(db_hash, new_hash)
    except Exception:
        return False

def create_session_token(profile_id: str, group_code: str, es_admin: bool) -> str:
    """Create a signed HMAC session token valid for 30 days."""
    # Expiración: 30 días en segundos
    exp = int(time.time()) + (30 * 24 * 60 * 60)
    payload = f"{profile_id}|{group_code}|{1 if es_admin else 0}|{exp}"
    signature = hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"

def verify_session_token(token: str) -> dict | None:
    """Verify a session token and return its payload if valid."""
    try:
        if not token or "." not in token:
            return None
        payload, signature = token.rsplit(".", 1)
        
        # Verificar firma
        expected_sig = hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        # Parsear payload
        profile_id, group_code, es_admin_str, exp_str = payload.split("|")
        exp = int(exp_str)
        
        # Verificar expiración
        if time.time() > exp:
            return None
            
        return {
            "id": profile_id,
            "grupo_codigo": group_code,
            "es_admin": es_admin_str == "1"
        }
    except Exception:
        return None
