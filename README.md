[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://friday-ai-platform-five.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/shouri437-boop/friday-ai-system)

> 🚀 **Live Vercel Deployment**: [friday-ai-platform-five.vercel.app](https://friday-ai-platform-five.vercel.app)  
> 🗺️ **Campus AI 3D Navigator**: [friday-ai-platform-five.vercel.app/campus-ai](https://friday-ai-platform-five.vercel.app/campus-ai)

**FRIDAY** is a full-stack, multimodal AI assistant and physical hardware security platform built around an intelligent multi-agent architecture. It brings together a sleek **Next.js 15** web dashboard, a **FastAPI** AI backend, a **4-pass Computer Vision engine**, **live Notion workspace integration**, a **physical RFID hardware authenticator** connected to **AWS IoT Core**, an interactive **3D campus explorer**, and a deep-document **RAG engine**.

---

## 🧠 How FRIDAY Thinks — The Master AI & Specialist LLM Network

At the heart of FRIDAY is an intelligent **multi-agent orchestration system** built with **LangGraph**. Think of it like a command centre: one **Master AI** (the LangGraph controller) receives every message you send and decides which specialist to hand it to.

### The Master AI (Orchestrator)
The Master AI doesn't answer your questions directly. Instead, it reads your intent, breaks your request down into subtasks, and delegates them to the right specialist. It decides:
- *"Is this a knowledge question? Route it to the RAG specialist."*
- *"Does the user want to schedule something? Activate the Notion tool."*
- *"Is this a reasoning-heavy query? Call the heavy-duty 70B model."*

### The Specialist LLMs (Workers)
FRIDAY runs **three Groq-hosted LLMs in parallel**, each assigned a specific role:

| Model | Role | When It's Used |
|-------|------|----------------|
| `llama3-8b-8192` | **Fast Responder** | Quick factual replies, simple queries |
| `llama-3.3-70b-versatile` | **Deep Reasoner** | Complex analysis, long-form answers, multi-step reasoning |
| `mixtral-8x7b` | **Balanced Worker** | Medium-complexity tasks, agent tool outputs |

### The RAG Database (Long-Term Memory)
All three LLMs are connected to FRIDAY's **RAG (Retrieval-Augmented Generation) knowledge base**, powered by **RAGFlow**. This means the LLMs aren't just using their training data — they are actively reading from a curated database of documents, notes, and institutional knowledge before forming their answers.

When you ask FRIDAY something, the pipeline works like this:

```
Your Question
     │
     ▼
Master AI (LangGraph)
     │  Decides intent & delegates
     ├──► Fast LLM ──────► RAG Database ──► Context chunks
     ├──► Deep LLM ──────► RAG Database ──► Context chunks
     └──► Balanced LLM ──► RAG Database ──► Context chunks
                                  │
                                  ▼
                         Synthesized, grounded answer
```

This architecture means FRIDAY's answers are always backed by real, verified knowledge from your own documents — not just pattern-matched guesses from training data.

---

## 👁️ Vision AI Lens — See, Read & Understand the World

FRIDAY's Vision AI turns your webcam into an intelligent scanning device. Point it at anything — a book cover, a product label, a manga poster, a circuit board — and FRIDAY will analyse and describe it in detail.

### How It Works
Most AI vision tools take one pass at an image and stop there. FRIDAY runs **four separate OCR passes** to extract as much text as possible before passing everything to a multimodal LLM:

- **Pass 1 — Native Colour Scan**: Reads the image exactly as your camera sees it. Works well for most everyday objects.
- **Pass 2 — Inverted Grayscale**: Flips the image's brightness. This is specifically designed for white text on dark backgrounds — think anime posters, movie covers, or dark-themed product packaging.
- **Pass 3 — CLAHE Contrast Boost**: Applies an adaptive contrast enhancement algorithm that brightens dark areas without overexposing bright ones. Perfect for images taken in dim or uneven lighting.
- **Pass 4 — 2× Upscaled Binary Threshold**: Doubles the image size and binarizes it, making tiny print readable that would otherwise be missed.

All text collected across all four passes is then merged, de-duplicated, and sent to **Groq's Multimodal Vision LLM** (`qwen/qwen3.6-27b`) alongside the original image. The result is a full structured report including:

- ✅ Exact item title and creator
- ✅ Category and genre
- ✅ 4–5 sentence overview
- ✅ Key topics and themes
- ✅ Target audience and prerequisites

### Vision Chatbot
After scanning an object, you can continue the conversation. Ask *"What is this book about?"*, *"Who is the author?"*, or *"Is this suitable for beginners?"* — FRIDAY maintains the visual context and keeps answering using both the image and its extracted knowledge.

---

## 📝 Notion Workspace Integration — Your AI Task Assistant

FRIDAY is natively connected to your **Notion workspace**, turning natural language into real, structured calendar events and task entries — no copy-pasting or manual entry needed.

### Calendar Scheduling
Tell FRIDAY things like:
- *"Schedule a team review tomorrow at 3 PM"*
- *"Add a study session for Monday"*

FRIDAY parses your words into a proper ISO timestamp, formats a database entry, and creates a real **Notion Page** directly inside your connected Calendar database through the Notion REST API. The event appears in your Notion workspace instantly.

### Auto-Discovery
If FRIDAY can't find the exact database you configured, it automatically runs a Notion Search query to find the closest match and retries — so it stays resilient even when workspace IDs change.

### Tasks Board
The web dashboard includes a dedicated **Tasks Board** (`/tasks`) where you can view, create, update, and delete tasks with full status management:

| Status | Meaning |
|--------|---------|
| ⬜ To Do | Not yet started |
| 🔄 In Progress | Actively being worked on |
| ✅ Completed | Done and resolved |

Every task also carries a priority level (`Low`, `Medium`, `High`, `Urgent`) and is tagged for easy filtering.

---

## 🔐 RFID Hardware Security System — Physical Login Authentication

FRIDAY includes a **physical hardware layer** for login authentication using an ESP32 microcontroller and an MFRC522 RFID reader. Instead of typing a password, you tap an RFID card.

### Access Granted
When an authorized card is detected (UID: `61 96 39 17`):
- The OLED screen displays **"WELCOME"**
- The green LED lights up and a short chirp sounds
- Access is granted into the FRIDAY web homepage

### Access Denied — Real-Time AWS Alert
When an unauthorized card is tapped:
- The OLED screen displays **"ACCESS DENIED"**
- The red LED and buzzer fire an intrusion alarm
- The ESP32 **immediately publishes an MQTT alert** to AWS IoT Core on the `rfid/alert` topic
- An **AWS IoT SQL Rule** catches the message and triggers **Amazon SNS** to send an email: *"Unauthorised access detected"*

This creates a real-time physical + cloud intrusion detection system — an unauthorized tap anywhere in the world triggers an alert to your inbox within seconds.

### Hardware Pinout (ESP32)

| Component | GPIO |
|-----------|------|
| MFRC522 RFID SS | 5 |
| RFID RST | 16 |
| Green LED | 4 |
| Red LED | 2 |
| Buzzer | 15 |
| OLED SDA (I2C) | 21 |
| OLED SCL (I2C) | 22 |

---

## 🗺️ Campus AI — 3D Interactive Campus Navigator

**Campus AI** is a fully interactive **3D campus visualization and intelligent routing engine** embedded directly into the FRIDAY dashboard. Built with **Three.js** for 3D rendering and **GSAP** for smooth animations, it transforms a static campus map into a living, explorable environment.

### Navigating the Campus
Users can move freely through a rendered 3D model of the campus, explore individual buildings, switch between floors, and get contextual information about rooms, labs, departments, and facilities — all without leaving the FRIDAY dashboard.

### Dijkstra's Shortest Path Algorithm
The most powerful feature of Campus AI is its **intelligent routing engine**, which uses **Dijkstra's Algorithm** to calculate the shortest walking path between any two locations on campus.

Here's how it works in plain terms:

- The entire campus is modelled as a **graph** — every junction, corridor, staircase, entrance, and landmark is a **node**, and every walkable connection between them is an **edge** with a distance weight.
- When you ask *"How do I get from the library to the computer science lab?"*, Campus AI treats that as a graph problem: find the cheapest (shortest) path from node A to node B.
- Dijkstra's Algorithm starts at your **source node** and explores all neighbouring nodes, always picking the next closest unvisited one. It keeps a running tally of the shortest known distance to every node it visits, updating it if it finds a shorter route.
- This continues until it reaches your **destination node**, at which point it traces back through the recorded shortest distances to reconstruct the optimal path.
- The result is highlighted as a **glowing overlay route** directly on the 3D campus model, showing you exactly which corridors to take, which stairs to use, and how many steps the journey is.

This means Campus AI doesn't just show you where things are — it tells you the **most efficient way to get there**, accounting for the actual physical layout and connectivity of the campus.

### AI Chatbot Integration
Campus AI also includes a built-in chatbot that understands natural language campus queries — *"Where is the examination hall?"*, *"Which floor is the dean's office on?"*, *"Find the nearest canteen from Block C"* — and responds with both a text answer and a live route overlay on the 3D map.

---

## 📚 RAGFlow Engine — Deep Document Intelligence

The `ragflow/` directory contains a complete enterprise-grade **document ingestion and retrieval pipeline**. Documents are parsed, split into semantic chunks, converted to vector embeddings, and stored for retrieval at query time. When any of FRIDAY's LLMs need factual context, they query this engine first.

---

## 📂 Repository Structure

```
.
├── app/                      # Next.js 15 App Router pages
│   ├── chat/                 # AI Chat interface
│   ├── vision/               # Vision AI Lens & webcam scanner
│   ├── tasks/                # Notion Tasks Board
│   ├── knowledge/            # RAG Knowledge Base viewer
│   └── settings/             # System configuration
├── backend/                  # FastAPI Python Server
│   ├── agent/                # LangGraph orchestrator & tools
│   ├── routers/              # API endpoints (vision, chat, tasks)
│   ├── services/             # Notion calendar service
│   ├── llm/                  # LLM engine & RAG clients
│   └── .env.example          # Backend secrets template
├── hardware/
│   └── rfid_aws/             # ESP32 Arduino sketch & AWS secrets template
├── ragflow/                  # RAGFlow document engine
├── Echo-26/                  # 3D Campus explorer
├── components/               # Shared UI components
├── .env.example              # Frontend secrets template
└── README.md
```

---

## 🛡️ Security

All credentials are strictly gitignored:
- `hardware/rfid_aws/secrets.h` — AWS certs & WiFi password (use `secrets.h.example`)
- `backend/.env` — Groq & Notion API keys (use `backend/.env.example`)
- `.env` — Frontend keys (use `.env.example`)

---

## 🚀 Quick Start

### Web Application
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Backend Server
```bash
cd backend
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Hardware
1. Copy `hardware/rfid_aws/secrets.h.example` → `secrets.h`
2. Fill in your WiFi credentials and AWS IoT certificates
3. Flash to ESP32 via Arduino IDE

---

## 📄 License
MIT
