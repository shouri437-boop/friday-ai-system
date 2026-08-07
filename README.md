# 🤖 FRIDAY - Full-Stack AI Assistant & Physical Hardware Authentication System

FRIDAY is an advanced, multimodal AI Assistant and Physical Hardware Security Platform. It combines a **Next.js 15 Web Application**, a **FastAPI Python Backend** powered by **LangGraph & Groq**, an **ESP32 RFID Hardware Authenticator connected via AWS IoT Core & SNS**, an interactive **3D Campus Visualization Engine (Echo-26)**, and a **RAG Engine (`ragflow`)**.

---

## 🌟 Key System Components

### 1. 🎨 Web Application (`app/`, `components/`)
- **Next.js 15 App Router** with React, TypeScript, and Tailwind CSS.
- Sleek dark glassmorphism dashboard with Chat, Tasks (Notion sync), Knowledge Base, 3D Campus Explorer, and Settings.
- Hardware physical authentication handshake upon scanning authorized RFID tags.

### 2. ⚙️ FastAPI AI Core (`backend/`)
- **FastAPI / Async Python Engine**: Handles request routing, vision model analysis, multi-agent orchestration, and task processing.
- **LangGraph Agents**: Task decomposition, tool selection (Notion API, Web Search), and direct RAG retrieval.
- **Strict Groq Model Mapping**: Fast 8B, Heavy 70B, and Balanced Mixtral dynamic LLM selection.

### 3. 🔐 RFID Hardware Authenticator (`hardware/rfid_aws/`)
- **ESP32 Microcontroller + MFRC522 RFID Reader**: Physical tap-to-login authentication.
- **SSD1306 OLED Display & Audio-Visual Alerts**: Displays **"WELCOME"** with green LED and chirp for authorized cards (`61 96 39 17`), or **"ACCESS DENIED"** with red LED and alarm for unauthorized tags.
- **AWS IoT Core + AWS SNS**: Publishes security telemetry over MQTT (`rfid/alert`) on access failure, triggering instant email notifications (*"Unauthorised access detected"*).

### 4. 📚 RAGFlow Engine (`ragflow/`)
- Enterprise-grade document parsing, embedding creation, and Retrieval-Augmented Generation pipeline.

### 5. 🌐 3D Campus Explorer (`Echo-26/`)
- Interactive Three.js / GSAP 3D spatial view integration.

---

## 📂 Repository Structure

```
.
├── app/                  # Next.js App Router UI pages
├── backend/              # FastAPI Python server, LangGraph agents & routers
├── components/           # Reusable UI components & layouts
├── hardware/
│   └── rfid_aws/         # ESP32 RFID hardware sketch, pinout guide & AWS config
├── ragflow/              # Deep document RAG engine pipeline
├── Echo-26/              # 3D Campus exploration engine
├── public/               # Static web assets
├── .env.example          # Frontend environment variables template
└── backend/.env.example  # Backend environment variables template
```

---

## 🛡️ Security & Environment Setup

All secret keys, API credentials, and AWS private keys are strictly excluded from source control.

### 1. Backend Environment Setup
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Fill in your Groq API keys, Notion token, and backend host parameters.

### 2. Hardware Credentials Setup
Navigate to `hardware/rfid_aws/` and copy `secrets.h.example` to `secrets.h`:
```bash
cd hardware/rfid_aws
cp secrets.h.example secrets.h
```
Configure your WiFi SSID/Password, AWS IoT Core Endpoint, Root CA, Certificate PEM, and AWS Private Key in `secrets.h`.

---

## 🚀 Quick Start

### Running the Web Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the FastAPI Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
FastAPI server runs on `http://localhost:8000`.

---

## 📄 License
MIT License
