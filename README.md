# AI-Powered Task Manager

A full-stack, AI-driven task management system that uses Google's Gemini LLM to autonomously analyze and prioritize tasks based on business impact.

## 🚀 Features
* **AI Priority Engine:** Integrates Google Gemini 2.5 Flash using Few-Shot prompt engineering to dynamically grade tasks (High, Medium, Low) based on semantic context and revenue impact, not just keywords.
* **Secure Authentication:** Implements JWT (JSON Web Tokens) for secure user login and password hashing using bcrypt.
* **Modern Frontend:** A clean, responsive React SPA (Single Page Application) built with Vite to seamlessly consume the RESTful API and manage UI state.
* **Robust Backend:** Lightning-fast Python backend built with FastAPI, utilizing SQLAlchemy for ORM database operations.
* **Containerized Database:** Uses Docker to run a localized, production-ready PostgreSQL instance.

## 🛠️ Tech Stack
* **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy, PyJWT
* **Frontend:** React, Vite, JavaScript
* **AI/LLM:** Google Gemini API (`gemini-2.5-flash`)
* **Database:** PostgreSQL (Docker Compose)
* **Security:** `python-dotenv` for environment variables, CORS middleware

## 💻 How to Run Locally

**1. Start the Database**
```bash
docker compose up -d