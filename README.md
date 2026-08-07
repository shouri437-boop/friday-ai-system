# 🤖 FRIDAY - Multimodal AI Platform, Vision Lens, Notion Integration & Hardware Security System

FRIDAY is an enterprise-grade, multimodal AI assistant, computer vision system, and physical hardware security platform. It combines a **Next.js 15 Web Dashboard**, a **FastAPI Python AI Core** powered by **LangGraph & Groq**, a **Multi-Pass OpenCV Visual OCR & Vision Lens**, **Real Notion API Calendar & Task Synchronization**, an **ESP32 RFID Hardware Authenticator connected via AWS IoT Core & SNS**, an interactive **3D Campus Visualization Engine (Echo-26)**, and a **RAG Engine (`ragflow`)**.

---

## 🌟 Core System Capabilities

### 👁️ 1. Vision AI Lens & Multi-Pass OCR (`backend/routers/vision.py`, `app/vision/page.tsx`)
- **Multi-Pass Visual OCR Engine**:
  - **Pass 1 (Native RGB)**: EasyOCR scan on raw camera frames.
  - **Pass 2 (Inverted Grayscale)**: Specifically engineered for white text on dark poster backgrounds (e.g. Manga/Anime covers like *BLEACH*, dark product labels).
  - **Pass 3 (CLAHE Enhancement)**: Contrast-Limited Adaptive Histogram Equalization for shadowed or uneven lighting conditions.
  - **Pass 4 (2x Scaled Otsu Binary Thresholding)**: Upscaled binarization for fine text print, paired with Pytesseract fallback.
- **Multimodal Object Identification (`/vision/scan`)**:
  - Ingests real-time webcam streams or uploaded photos.
  - Passes base64-optimized frames and OCR text to **Groq Multimodal Vision LLMs** (`qwen/qwen3.6-27b` & `llama-3.3-70b-versatile`).
  - Identifies books, anime posters, novels, engineering textbooks, electronics, and product labels.
  - Generates structured JSON reports: *Title, Category, 4-5 Sentence Overview, Key Topics, Prerequisites, Target Audience, and Full Text Analysis*.
- **Interactive Vision Chatbot (`/vision/ask`)**:
  - Multi-turn conversational interface allowing users to ask follow-up questions about any captured camera frame or scanned item.

---

### 📝 2. Real Notion Workspace Integration (`backend/services/notion_calendar_service.py`, `backend/agent/tools/notion_tool.py`, `app/tasks/page.tsx`)
- **Direct Notion REST API Integration**: Connects to `https://api.notion.com/v1/pages` and `/v1/search`.
- **Natural Language Calendar Scheduling**:
  - Commands like *"Schedule team sync tomorrow at 5 PM"* are parsed into structured ISO timestamps.
  - Automatically creates new database row entries (Pages) in the connected Notion Calendar.
- **Auto-Discovery Schema Resolution**:
  - Features failover search logic using the Notion Search API to locate valid database targets automatically.
- **Notion Tasks Board (`app/tasks/page.tsx`)**:
  - Interactive web board UI with real-time status management (`To Do`, `In Progress`, `Completed`), priority filtering (`Low`, `Medium`, `High`, `Urgent`), and Notion synchronization indicators.

---

### 🔐 3. RFID Hardware Authenticator (`hardware/rfid_aws/`)
- **Physical Tap-to-Login Authentication**:
  - ESP32 Microcontroller + MFRC522 RFID Reader + SSD1306 OLED Display (128x64 I2C) + Status LEDs + Buzzer audio feedback.
- **Access Granted (Authorized Card UID `61 96 39 17`)**:
  - OLED displays **"WELCOME"**.
  - Green LED illuminates with an authentication chirp.
  - Grants instant login access to the FRIDAY web homepage.
- **Access Denied & AWS Intrusion Telemetry**:
  - OLED displays **"ACCESS DENIED"**.
  - Red LED flashes with an intrusion alarm tone.
  - ESP32 publishes an MQTT alert payload to **AWS IoT Core** on topic `rfid/alert`.
- **AWS IoT Core + AWS SNS**:
  - An AWS IoT SQL Rule (`SELECT * FROM 'rfid/alert'`) triggers an **Amazon SNS Topic** to send real-time security alert emails: *"Unauthorised access detected"*.

---

### 📚 4. RAGFlow Document Engine (`ragflow/`)
- Enterprise document parsing, vector embedding generation, and hybrid retrieval-augmented generation pipeline.

---

### 🌐 5. 3D Campus Explorer (`Echo-26/`)
- Interactive Three.js and GSAP 3D spatial exploration engine integrated into the dashboard.

---

## 📂 Repository Layout

```
.
├── app/                      # Next.js 15 App Router Frontend
│   ├── page.tsx              # Main dashboard overview
│   ├── chat/                 # Interactive AI chat interface
│   ├── vision/               # Real-time Vision AI Lens & Webcam Scanner UI
│   ├── tasks/                # Notion Tasks & Calendar management UI
│   ├── knowledge/            # RAG & Knowledge Base viewer
│   └── settings/             # System configuration panel
├── backend/                  # FastAPI Python Server
│   ├── agent/                # LangGraph agents & tools (Notion, Web Search, RAG)
│   ├── routers/              # API endpoints (vision.py, chat.py, tasks.py, system.py)
│   ├── services/             # Notion calendar service, execution engine
│   ├── llm/                  # Engine configuration & RAG clients
│   └── .env.example          # Backend environment variables template
├── hardware/
│   └── rfid_aws/             # ESP32 RFID hardware sketch, secrets template & README
├── ragflow/                  # RAGFlow document parsing & vector engine
├── Echo-26/                  # 3D Campus exploration engine
├── components/               # UI components, sidebars, headers, voice input controls
├── .env.example              # Frontend environment variables template
└── README.md                 # System documentation
```

---

## 🛡️ Security & Credential Hygiene

All secret keys, API credentials, and AWS private RSA keys are strictly isolated from git tracking:

1. **Hardware Secrets**:
   - `hardware/rfid_aws/secrets.h` is gitignored. Use `secrets.h.example` to configure local hardware.
2. **Environment Variables**:
   - `backend/.env` and `.env` are gitignored. Templates are available in `.env.example` and `backend/.env.example`.
3. **No Hardcoded Fallbacks**:
   - All Groq vision keys, Notion API tokens, and Featherless keys use strict runtime environment variable lookup.

---

## 🚀 Getting Started

### 1. Web Application (Next.js)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Backend Server (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
FastAPI server runs on `http://localhost:8000`.

### 3. ESP32 Hardware Authenticator
1. Open `hardware/rfid_aws/rfid_aws.ino` in Arduino IDE.
2. Copy `secrets.h.example` to `secrets.h` and enter your WiFi credentials & AWS IoT certificates.
3. Flash the code to your ESP32 board.

---

## 📄 License
MIT License
