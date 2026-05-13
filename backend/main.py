from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, utils
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Task Manager API",
    description="Backend system for managing tasks and AI suggestions.",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"status": "success", "message": "Welcome to the AI Task Manager API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Backend API is running smoothly."}

# --- NEW USER ROUTE ---
@app.post("/users/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Check if the email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Check if the username already exists
    existing_username = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # 3. Hash the password
    hashed_pwd = utils.hash_password(user.password)

    # 4. Create the new user model object
    new_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_pwd
    )

    # 5. Save to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 

    # 6. Return the created user 
    return new_user

# --- NEW TASK ROUTE ---
@app.post("/users/{user_id}/tasks/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task_for_user(user_id: int, task: schemas.TaskCreate, db: Session = Depends(get_db)):
    # 1. Verify the user actually exists in the database
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Create the new task model object
    # **task.model_dump() unpacks the title, description, and priority
    new_task = models.Task(**task.model_dump(), owner_id=user_id)
    
    # 3. Save to the database
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return new_task

# --- GET USER TASKS ROUTE ---
# Notice we use a list of TaskResponses because one user can have many tasks
@app.get("/users/{user_id}/tasks/", response_model=list[schemas.TaskResponse])
def read_user_tasks(user_id: int, db: Session = Depends(get_db)):
    # 1. Verify the user exists
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Fetch all tasks where the owner_id matches
    tasks = db.query(models.Task).filter(models.Task.owner_id == user_id).all()
    
    return tasks