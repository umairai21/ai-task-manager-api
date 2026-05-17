import google.generativeai as genai

# Paste your actual key here
GEMINI_API_KEY = "AIzaSyCTo-vfpbsPGhHVYxhjM98G3Rc00H4TqcA" 
genai.configure(api_key=GEMINI_API_KEY)

print("Fetching available models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)