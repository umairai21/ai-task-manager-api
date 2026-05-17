from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from google.genai import Client
from dotenv import load_dotenv
import os
import jwt


# YOU MUST CALL THIS FUNCTION TO WAKE UP THE .ENV FILE!
load_dotenv()

# --- SECURITY CONSTANTS ---
# In production, this SECRET_KEY is hidden in a .env file!
SECRET_KEY = os.getenv("SECRET_KEY") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- AI PRIORITY ENGINE ---
# WARNING: For local testing only. Never commit real API keys to GitHub!
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
client = Client(api_key=GEMINI_API_KEY)

def get_ai_priority(title: str, description: str) -> str:
    """Uses Google Gemini to determine task priority."""
    
    task_text = f"Title: {title}\nDescription: {description or 'No description provided.'}"
    
    prompt = f"""
    You are an AI Task Manager. Read the following task and determine its priority level.
    Respond with EXACTLY ONE WORD from this list: High, Medium, Low.
    Do not add any punctuation, explanation, or extra text.
    
    Task:
    {task_text}
    """
    
    try:
        # Using the modern client and the ultra-cheap Flash Lite model
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
        )
        priority = response.text.strip().capitalize()
        
        if priority not in ["High", "Medium", "Low"]:
            return "Medium"
            
        return priority
        
    except Exception as e:
        print(f"AI Engine Error: {e}")
        return "Medium"