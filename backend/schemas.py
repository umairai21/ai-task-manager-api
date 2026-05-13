from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: str 
    username: str

class UserCreate(UserBase):
    # Enforce rules: password must be between 8 and 50 characters!
    password: str = Field(..., min_length=8, max_length=20)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True