# 🤖 AI-Powered Task Manager

A full-stack, AI-driven task management system that uses Google's Gemini LLM to autonomously analyze and prioritize tasks based on business impact.

---

## 🚀 Features

- **AI Priority Engine** — Integrates Google Gemini 2.5 Flash using Few-Shot prompt engineering to dynamically grade tasks (High, Medium, Low) based on semantic context and revenue impact, not just keywords
- **Secure Authentication** — Implements JWT (JSON Web Tokens) for secure user login and password hashing using bcrypt
- **Modern Frontend** — A clean, responsive React SPA built with Vite to seamlessly consume the RESTful API and manage UI state
- **Robust Backend** — Lightning-fast Python backend built with FastAPI, utilizing SQLAlchemy for ORM database operations
- **Containerized Database** — Uses Docker to run a localized, production-ready PostgreSQL instance

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, FastAPI, Uvicorn, SQLAlchemy, PyJWT |
| **Frontend** | React, Vite, JavaScript |
| **AI / LLM** | Google Gemini API (`gemini-2.5-flash`) |
| **Database** | PostgreSQL (Docker Compose) |
| **Security** | `python-dotenv`, CORS middleware, bcrypt |

---

## ⚙️ Prerequisites

- [Python](https://www.python.org/downloads/) `3.9+`
- [Node.js](https://nodejs.org/) `18+`
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

---

## 💻 How to Run Locally

### 1. Start the Database

```bash
docker compose up -d
```

### 2. Configure Environment Variables

Create a `.env` file inside the `backend/` directory and add your keys:

```env
SECRET_KEY="your_jwt_secret_key"
GEMINI_API_KEY="your_google_gemini_key"
```

### 3. Start the Backend API

Open a terminal in the `backend/` directory:

```bash
# Activate your virtual environment first
uvicorn main:app --reload
```

> The API will be available at **http://127.0.0.1:8000**
> Visit `/docs` for the interactive Swagger UI.

### 4. Start the React Dashboard

Open a new terminal in the `frontend/` directory:

```bash
npm install
npm run dev
```

> The dashboard will automatically open in your browser.

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py
│   ├── .env          # ← your environment variables (never commit this)
│   └── ...
├── frontend/
│   ├── src/
│   └── ...
└── docker-compose.yml
```

> ⚠️ **Never commit your `.env` file.** Make sure it's listed in your `.gitignore`.