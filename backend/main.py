from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import models, schemas, utils
from database import engine, get_db
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import List
import jwt

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Task Manager API",
    description="Backend system for managing tasks and AI suggestions.",
    version="1.0.0"
)


# --- 2. ADD THIS CORS BLOCK ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change "*" to your actual frontend URL!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "success", "message": "Welcome to the AI Task Manager API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Backend API is running smoothly."}

# Tells FastAPI where clients can go to get a token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- THE BOUNCER ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Decode the token using the secret key from utils.py
        payload = jwt.decode(token, utils.SECRET_KEY, algorithms=[utils.ALGORITHM])
        
        # 2. Extract the user ID (we saved it as "sub" yesterday)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except jwt.PyJWTError:
        raise credentials_exception
        
    # 3. Find the actual user in the database
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    return user

# --- LOGIN ROUTE ---
@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Find the user in the database (OAuth2 uses 'username', but we will let them type their email here)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Check if user exists AND password is correct
    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create the JWT Token with their user_id embedded inside it
    access_token = utils.create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}



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
        hashed_password=hashed_pwd,
        role=user.role,              # FIXED: Explicitly save the role
        department=user.department   # FIXED: Explicitly save the department
    )

    # 5. Save to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 

    # 6. Return the created user 
    return new_user


# --- ADMIN ROUTE: GET ALL USERS (READ) ---
@app.get("/users/", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
    return db.query(models.User).all()

# --- ADMIN ROUTE: UPDATE USER (UPDATE) ---
@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # We replaced 'role' with 'email' here
    if user_update.email:
        # Optional: Add a check here to ensure the new email isn't already taken
        user.email = user_update.email
    if user_update.department:
        user.department = user_update.department
        
    db.commit()
    db.refresh(user)
    return user


# --- ADMIN ROUTE: DELETE USER (DELETE) ---
@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Security Check: Prevent the boss from accidentally deleting themselves!
    if user_to_delete.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")
        
    db.delete(user_to_delete)
    db.commit()
    return



# --- SECURE TASK CREATION (WITH AI ENGINE) ---
@app.post("/tasks", response_model=schemas.TaskResponse)
def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. Hand the unstructured text to your AI Manager
    ai_analysis = utils.get_ai_priority(task.title, task.description)
    
    # 2. Extract the structured data (using .get() adds a safety net if a key is missing)
    ai_priority = ai_analysis.get("priority", "Medium")
    target_dept = ai_analysis.get("department", "General")

    # 3. Assemble the final database record using your upgraded schema
    new_task = models.Task(
        title=task.title,
        description=task.description,
        priority=ai_priority,
        assigned_department=target_dept, # The AI's routing decision
        owner_id=current_user.id         # The human who submitted it
    )
    
    # 4. Save to PostgreSQL
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return new_task


# --- SECURE TASK RETRIEVAL ---
@app.get("/tasks", response_model=List[schemas.TaskResponse])
def read_tasks(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. ADMIN RULE: Executives see the entire company's workload
    if current_user.role == "admin":
        tasks = db.query(models.Task).offset(skip).limit(limit).all()
        
    # 2. RESOLVER RULE: Workers ONLY see tasks assigned to their department
    elif current_user.role == "employee":
        tasks = db.query(models.Task).filter(
            models.Task.assigned_department == current_user.department
        ).offset(skip).limit(limit).all()
        
    # 3. DISPATCHER RULE: The person at the front desk only sees what they submitted
    else:
        tasks = db.query(models.Task).filter(
            models.Task.owner_id == current_user.id
        ).offset(skip).limit(limit).all()
        
    return tasks


# --- SECURE TASK UPDATE ---
@app.put("/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int, 
    task_update: schemas.TaskUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. Find the specific task that belongs to this user
    db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner_id == current_user.id).first()
    
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 2. Update only the fields that were actually provided in the request
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    # 3. Save changes
    db.commit()
    db.refresh(db_task)
    return db_task

# --- SECURE TASK DELETION ---
@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. Find the specific task
    db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner_id == current_user.id).first()
    
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # 2. Delete it
    db.delete(db_task)
    db.commit()
    return # A 204 status code means successful action, but no dadta to return