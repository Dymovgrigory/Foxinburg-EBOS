from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "student"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenWithUserResponse(TokenResponse):
    user: dict
