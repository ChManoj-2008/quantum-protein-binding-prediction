import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "qbindai_auth.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            role TEXT DEFAULT 'researcher',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 2. Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            user_agent TEXT,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Verification codes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            code_type TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()

    # Seed demo researcher user if not present
    cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@qbindai.com",))
    if not cursor.fetchone():
        demo_salt = secrets.token_hex(16)
        demo_hash = hashlib.pbkdf2_hmac("sha256", "QuantumAI@2026".encode("utf-8"), demo_salt.encode("utf-8"), 100000).hex()
        now_iso = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO users (email, full_name, password_hash, salt, is_verified, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "demo@qbindai.com",
            "Dr. Manoj Kumar",
            demo_hash,
            demo_salt,
            1,
            "Lead Computational Biologist",
            now_iso,
            now_iso
        ))
        conn.commit()

    conn.close()

# Initialize DB on module import
init_db()

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return hashed, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    computed_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(computed_hash, stored_hash)

def generate_session_token() -> str:
    return secrets.token_urlsafe(48)

def generate_numeric_code(length: int = 6) -> str:
    return str(secrets.randbelow(900000) + 100000)

class AuthService:
    @staticmethod
    def register_user(full_name: str, email: str, password: str) -> Dict[str, Any]:
        email = email.strip().lower()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            raise ValueError("An account with this email address already exists.")

        pwd_hash, salt = hash_password(password)
        now = datetime.utcnow()
        now_iso = now.isoformat()

        cursor.execute("""
            INSERT INTO users (email, full_name, password_hash, salt, is_verified, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, 'researcher', ?, ?)
        """, (email, full_name.strip(), pwd_hash, salt, now_iso, now_iso))
        user_id = cursor.lastrowid

        # Generate email verification code (valid 15 minutes)
        code = generate_numeric_code(6)
        expires_at = (now + timedelta(minutes=15)).isoformat()
        cursor.execute("""
            INSERT INTO verification_codes (user_id, code, code_type, expires_at, used, created_at)
            VALUES (?, ?, 'email_verification', ?, 0, ?)
        """, (user_id, code, expires_at, now_iso))

        conn.commit()

        cursor.execute("SELECT id, email, full_name, is_verified, role, created_at FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        user_dict = dict(user_row)
        user_dict["is_verified"] = bool(user_dict["is_verified"])
        conn.close()

        return {
            "user": user_dict,
            "verification_code": code
        }

    @staticmethod
    def verify_email(email: str, code: str) -> Dict[str, Any]:
        email = email.strip().lower()
        code = code.strip()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            raise ValueError("No account found with this email.")

        user_id = user_row["id"]
        now_iso = datetime.utcnow().isoformat()

        cursor.execute("""
            SELECT id, expires_at, used FROM verification_codes
            WHERE user_id = ? AND code = ? AND code_type = 'email_verification'
            ORDER BY id DESC LIMIT 1
        """, (user_id, code))
        code_row = cursor.fetchone()

        if not code_row:
            conn.close()
            raise ValueError("Invalid verification code. Please check and try again.")

        if code_row["used"]:
            conn.close()
            raise ValueError("This verification code has already been used.")

        if code_row["expires_at"] < now_iso:
            conn.close()
            raise ValueError("Verification code has expired. Please request a new one.")

        # Mark code as used and user as verified
        cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (code_row["id"],))
        cursor.execute("UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?", (now_iso, user_id))

        # Create active session for the verified user
        token = generate_session_token()
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        cursor.execute("""
            INSERT INTO sessions (user_id, session_token, user_agent, created_at, expires_at, is_active)
            VALUES (?, ?, 'WebClient', ?, ?, 1)
        """, (user_id, token, now_iso, expires_at))

        conn.commit()

        cursor.execute("SELECT id, email, full_name, is_verified, role, created_at FROM users WHERE id = ?", (user_id,))
        updated_user = dict(cursor.fetchone())
        updated_user["is_verified"] = bool(updated_user["is_verified"])
        conn.close()

        return {
            "session_token": token,
            "user": updated_user
        }

    @staticmethod
    def resend_verification(email: str) -> Dict[str, Any]:
        email = email.strip().lower()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            raise ValueError("No account found with this email.")

        if user_row["is_verified"]:
            conn.close()
            raise ValueError("This account has already been verified.")

        user_id = user_row["id"]
        now = datetime.utcnow()
        now_iso = now.isoformat()

        # Invalidate existing codes
        cursor.execute("UPDATE verification_codes SET used = 1 WHERE user_id = ? AND code_type = 'email_verification'", (user_id,))

        code = generate_numeric_code(6)
        expires_at = (now + timedelta(minutes=15)).isoformat()
        cursor.execute("""
            INSERT INTO verification_codes (user_id, code, code_type, expires_at, used, created_at)
            VALUES (?, ?, 'email_verification', ?, 0, ?)
        """, (user_id, code, expires_at, now_iso))

        conn.commit()
        conn.close()

        return {"verification_code": code}

    @staticmethod
    def login(email: str, password: str, remember_me: bool = False) -> Dict[str, Any]:
        email = email.strip().lower()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, email, full_name, password_hash, salt, is_verified, role, created_at
            FROM users WHERE email = ?
        """, (email,))
        user_row = cursor.fetchone()

        if not user_row:
            conn.close()
            raise ValueError("No account found with this email. You must sign up first before logging in.")

        if not user_row["is_verified"]:
            conn.close()
            raise ValueError("Please verify your email address before logging in.")

        if not verify_password(password, user_row["password_hash"], user_row["salt"]):
            conn.close()
            raise ValueError("Incorrect password. Please try again or reset your password.")

        now = datetime.utcnow()
        now_iso = now.isoformat()
        days_valid = 30 if remember_me else 7
        expires_at = (now + timedelta(days=days_valid)).isoformat()
        token = generate_session_token()

        cursor.execute("""
            INSERT INTO sessions (user_id, session_token, user_agent, created_at, expires_at, is_active)
            VALUES (?, ?, 'WebClient', ?, ?, 1)
        """, (user_row["id"], token, now_iso, expires_at))

        conn.commit()

        user_dict = {
            "id": user_row["id"],
            "email": user_row["email"],
            "full_name": user_row["full_name"],
            "is_verified": bool(user_row["is_verified"]),
            "role": user_row["role"],
            "created_at": user_row["created_at"]
        }
        conn.close()

        return {
            "session_token": token,
            "user": user_dict
        }

    @staticmethod
    def forgot_password(email: str) -> Dict[str, Any]:
        email = email.strip().lower()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()

        if not user_row:
            conn.close()
            # Still return friendly message to protect privacy
            return {
                "message": "If this email is registered, a password reset code has been generated.",
                "reset_code": None
            }

        user_id = user_row["id"]
        now = datetime.utcnow()
        now_iso = now.isoformat()

        # Invalidate old reset codes
        cursor.execute("UPDATE verification_codes SET used = 1 WHERE user_id = ? AND code_type = 'password_reset'", (user_id,))

        code = generate_numeric_code(6)
        expires_at = (now + timedelta(minutes=15)).isoformat()
        cursor.execute("""
            INSERT INTO verification_codes (user_id, code, code_type, expires_at, used, created_at)
            VALUES (?, ?, 'password_reset', ?, 0, ?)
        """, (user_id, code, expires_at, now_iso))

        conn.commit()
        conn.close()

        return {
            "message": "Password reset code generated successfully.",
            "reset_code": code
        }

    @staticmethod
    def reset_password(email: str, code: str, new_password: str) -> Dict[str, Any]:
        email = email.strip().lower()
        code = code.strip()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            raise ValueError("No account found with this email.")

        user_id = user_row["id"]
        now_iso = datetime.utcnow().isoformat()

        cursor.execute("""
            SELECT id, expires_at, used FROM verification_codes
            WHERE user_id = ? AND code = ? AND code_type = 'password_reset'
            ORDER BY id DESC LIMIT 1
        """, (user_id, code))
        code_row = cursor.fetchone()

        if not code_row:
            conn.close()
            raise ValueError("Invalid password reset code.")

        if code_row["used"]:
            conn.close()
            raise ValueError("This reset code has already been used.")

        if code_row["expires_at"] < now_iso:
            conn.close()
            raise ValueError("Reset code has expired. Please request a new one.")

        # Update password
        new_hash, new_salt = hash_password(new_password)
        cursor.execute("""
            UPDATE users SET password_hash = ?, salt = ?, updated_at = ?
            WHERE id = ?
        """, (new_hash, new_salt, now_iso, user_id))

        # Mark code as used
        cursor.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (code_row["id"],))

        # Invalidate all existing sessions for this user (security best practice)
        cursor.execute("UPDATE sessions SET is_active = 0 WHERE user_id = ?", (user_id,))

        conn.commit()
        conn.close()

        return {"message": "Password reset successfully. Please log in with your new password."}

    @staticmethod
    def get_current_user(session_token: str) -> Optional[Dict[str, Any]]:
        if not session_token:
            return None

        conn = get_db_connection()
        cursor = conn.cursor()
        now_iso = datetime.utcnow().isoformat()

        cursor.execute("""
            SELECT s.id as session_id, s.expires_at, s.is_active,
                   u.id, u.email, u.full_name, u.is_verified, u.role, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.is_active = 1
        """, (session_token,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        if row["expires_at"] < now_iso:
            # Session expired
            cursor.execute("UPDATE sessions SET is_active = 0 WHERE id = ?", (row["session_id"],))
            conn.commit()
            conn.close()
            return None

        user_dict = {
            "id": row["id"],
            "email": row["email"],
            "full_name": row["full_name"],
            "is_verified": bool(row["is_verified"]),
            "role": row["role"],
            "created_at": row["created_at"]
        }
        conn.close()
        return user_dict

    @staticmethod
    def logout(session_token: str) -> bool:
        if not session_token:
            return False

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET is_active = 0 WHERE session_token = ?", (session_token,))
        changed = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return changed
