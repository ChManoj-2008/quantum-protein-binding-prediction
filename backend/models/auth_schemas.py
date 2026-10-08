from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_format(email: str) -> str:
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format")
    return cleaned

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("password")
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class UserLoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

class EmailVerificationRequest(BaseModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

class ResendVerificationRequest(BaseModel):
    email: str

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

class ResetPasswordRequest(BaseModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

    @field_validator("new_password")
    def validate_new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    def reset_passwords_match(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None and "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_verified: bool
    role: str
    created_at: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    session_token: Optional[str] = None
    token: Optional[str] = None
    user: Optional[UserResponse] = None
    verification_code: Optional[str] = None
