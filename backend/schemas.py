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


# Base schema for standard task properties
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "Medium" # Defaulting to Medium

# Schema for incoming data when creating a task
class TaskCreate(TaskBase):
    pass # It just inherits everything from TaskBase for now

# Schema for outgoing task data (includes database-generated fields)
class TaskResponse(TaskBase):
    id: int
    is_completed: bool
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True