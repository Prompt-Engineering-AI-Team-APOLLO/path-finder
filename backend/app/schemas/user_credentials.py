from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH


class CredentialsSignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class CredentialsSignInRequest(BaseModel):
    email: EmailStr
    password: str


class CredentialsAuthResponse(BaseModel):
    message: str
    email: EmailStr
