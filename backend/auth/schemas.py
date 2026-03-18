"""
Esquemas Pydantic para autenticación.
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Request de login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response con JWT y datos del usuario."""

    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    negocio_id: str | None = None
