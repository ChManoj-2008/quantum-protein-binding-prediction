from fastapi import APIRouter, HTTPException, Header, Depends, status
from typing import Optional
from backend.models.auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    EmailVerificationRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    UserResponse
)
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def extract_bearer_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization

@router.post("/register", response_model=AuthResponse)
def register(req: UserRegisterRequest):
    try:
        result = AuthService.register_user(
            full_name=req.full_name,
            email=req.email,
            password=req.password
        )
        return AuthResponse(
            success=True,
            message="Account registered successfully. A 6-digit verification code has been generated.",
            user=UserResponse(**result["user"]),
            verification_code=result["verification_code"]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed. Please try again.")

@router.post("/verify-email", response_model=AuthResponse)
def verify_email(req: EmailVerificationRequest):
    try:
        result = AuthService.verify_email(email=req.email, code=req.code)
        return AuthResponse(
            success=True,
            message="Email verified successfully. You are now logged in.",
            session_token=result["session_token"],
            token=result["session_token"],
            user=UserResponse(**result["user"])
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Verification failed.")

@router.post("/resend-verification")
def resend_verification(req: ResendVerificationRequest):
    try:
        result = AuthService.resend_verification(email=req.email)
        return {
            "success": True,
            "message": "New 6-digit verification code sent.",
            "verification_code": result["verification_code"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not resend code.")

@router.post("/login", response_model=AuthResponse)
def login(req: UserLoginRequest):
    try:
        result = AuthService.login(
            email=req.email,
            password=req.password,
            remember_me=req.remember_me
        )
        return AuthResponse(
            success=True,
            message="Login successful.",
            session_token=result["session_token"],
            token=result["session_token"],
            user=UserResponse(**result["user"])
        )
    except ValueError as e:
        err_msg = str(e)
        if "sign up first" in err_msg.lower() or "no account found" in err_msg.lower():
            status_code = status.HTTP_404_NOT_FOUND
        elif "verify" in err_msg.lower():
            status_code = status.HTTP_403_FORBIDDEN
        else:
            status_code = status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=status_code, detail=err_msg)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed.")

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    try:
        result = AuthService.forgot_password(email=req.email)
        return {
            "success": True,
            "message": result["message"],
            "reset_code": result["reset_code"]
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password reset request failed.")

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    try:
        result = AuthService.reset_password(
            email=req.email,
            code=req.code,
            new_password=req.new_password
        )
        return {
            "success": True,
            "message": result["message"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password reset failed.")

@router.get("/me")
def get_current_user_profile(token: Optional[str] = Depends(extract_bearer_token)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization session token required")
    user = AuthService.get_current_user(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
    return {
        "success": True,
        "user": user
    }

@router.post("/logout")
def logout(token: Optional[str] = Depends(extract_bearer_token)):
    if token:
        AuthService.logout(token)
    return {
        "success": True,
        "message": "Session terminated successfully"
    }
