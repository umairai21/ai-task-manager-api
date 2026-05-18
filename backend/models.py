from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    # FIXED: primary_key instead of primary key
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String, default="employee") # e.g., employee, dispatcher, admin
    department = Column(String, nullable=True) # e.g., IT, HR, Facilities

    # Relationship to the Task model (One-to-Many)
    tasks = relationship("Task", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"

    # FIXED: primary_key instead of primary key
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, index=True)
    is_completed = Column(Boolean, default=False)
    priority = Column(String, default="Medium") # e.g., Low, Medium, High
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_department = Column(String, nullable=True) # The AI will fill this in
    
    # Foreign key linking to the User table
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship back to the User model
    owner = relationship("User", back_populates="tasks")