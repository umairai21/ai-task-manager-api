from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, utils
from database import engine, get_db
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
import jwt

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
        hashed_password=hashed_pwd
    )

    # 5. Save to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 

    # 6. Return the created user 
    return new_user

# --- SECURE TASK CREATION (WITH AI ENGINE) ---
@app.post("/tasks/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. Ask the AI for the priority based on what the user typed!
    ai_priority = utils.get_ai_priority(title=task.title, description=task.description)
    
    # 2. Unpack the user's data, OVERRIDE the priority with the AI's answer, and attach the user ID
    task_data = task.model_dump()
    task_data["priority"] = ai_priority # Inject the AI decision here!
    
    new_task = models.Task(**task_data, owner_id=current_user.id)
    
    # 3. Save to database
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return new_task


# --- SECURE TASK RETRIEVAL ---
@app.get("/tasks/", response_model=list[schemas.TaskResponse])
def read_tasks(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) # <-- The lock!
):
    # We only fetch tasks belonging to the currently logged-in user
    tasks = db.query(models.Task).filter(models.Task.owner_id == current_user.id).all()
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
    return # A 204 status code means successful action, but no data to return