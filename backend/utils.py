from urllib import response

from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from google.genai import Client
from dotenv import load_dotenv
import os
import jwt
import json


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

def get_ai_priority(title: str, description: str) -> dict:
    """Uses Google Gemini to determine task priority and department."""
    
    task_text = f"Title: {title}\nDescription: {description or 'No description provided.'}"

    prompt = f"""
    You are an AI Enterprise Dispatcher. Analyze the task and determine its priority and target department.
    
    You MUST respond with EXACTLY ONE valid JSON object. 
    Do not wrap the JSON in markdown formatting or code blocks (like ```json). Just the raw JSON.
    
    Available Departments: "IT", "HR", "Facilities", "Finance", "General"
    
    Rules for Priority:
    - HIGH: System crashes, security threats, revenue loss, or broken core features.
    - MEDIUM: Standard feature requests, minor bugs, and non-blocking issues.
    - LOW: Cosmetic updates, internal requests, and office supplies.
    
    Examples:
    Task: Title: Coffee machine broken. Description: The kitchen needs espresso.
    Output: {{"priority": "Low", "department": "Facilities"}}
    
    Task: Title: Overcharging error. Description: Customers are being billed twice.
    Output: {{"priority": "High", "department": "Finance"}}
    
    Task: Title: Need new laptop. Description: My screen cracked.
    Output: {{"priority": "Medium", "department": "IT"}}
    
    Task:
    {task_text}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # 1. Strip any accidental markdown formatting (like ```json)
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        
        # 2. Convert the AI's text response into a real Python dictionary
        ai_data = json.loads(clean_text)
        
        return ai_data
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        # Failsafe: Return a default dictionary if Gemini hallucinates bad JSON
        return {"priority": "Medium", "department": "General"}
    except Exception as e:
        print(f"AI Engine Error: {e}")
        return {"priority": "Medium", "department": "General"}