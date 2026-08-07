# Milestone 1: FRIDAY Architecture & Project Foundation Setup

This plan outlines the architecture for **FRIDAY** and the step-by-step setup for **Milestone 1 & 2 (Frontend Foundation & UI Shell)**.

---

## 🏛️ System Architecture Explained

Before building, let's understand how FRIDAY is designed from top to bottom.

```
[ USER ]
   │
   ▼
┌────────────────────────────────────────────────────────┐
│ 🎨 Frontend (Next.js / React / Tailwind CSS / shadcn)  │
│    - Chat UI, Tasks View, Knowledge View, Settings      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / WebSocket REST APIs
                           ▼
┌────────────────────────────────────────────────────────┐
│ ⚙️ Backend (FastAPI / Python)                           │
│    - Request Routing, Async Workers, API Gateway       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 🧠 AI Agent Core (LangGraph)                            │
│    - Decision-making, Task Decomposition, Tool Selection│
└──────┬───────────────────┬───────────────────┬─────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
│ 🔮 LLM Engine│   │ 💾 Memory    │   │ 📚 RAG Engine   │
│  (OpenAI)    │   │(PostgreSQL + │   │ (LlamaIndex +   │
│              │   │   pgvector)  │   │  Obsidian Vault)│
└──────────────┘   └──────────────┘   └─────────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ Tool Execution
                           ▼
┌────────────────────────────────────────────────────────┐
│ 🛠️ External Tools & Services                            │
│    - Notion (Tasks/Calendar), GitHub, Gmail, Web Search│
└────────────────────────────────────────────────────────┘
```

---

### Real-World Analogy 🏢
Imagine **FRIDAY** as a high-tech corporate office:
1. **Frontend (The Front Desk & Dashboard)**: The clean screen you interact with. It receives your input and displays answers cleanly.
2. **Backend (The Manager)**: Coordinates incoming messages, forwards requests safely to the AI core, and returns answers back to your screen.
3. **AI Agent (The Chief of Staff)**: Decides *how* to answer your request. Does it need to search your notes? Does it need to create a Notion task? Does it need to calculate something?
4. **LLM Engine (The Master Thinker / Brain)**: Generates human language, reasons through logic, and formulates responses.
5. **Memory & RAG (The Archive & Filing Cabinet)**:
   - *Memory*: Remembers past conversations, user preferences, and context.
   - *RAG*: Reads your local Obsidian markdown notes so FRIDAY knows your specific notes and documentation.
6. **Tools (The Assistants)**: Connects to external services like Notion, GitHub, and Gmail to take real-world actions.

---

## 📂 Proposed Folder Structure (Next.js App Router)

We will structure the Next.js application cleanly following separation of concerns:

```
FRI GRAV/
├── app/
│   ├── layout.tsx         # Root layout with global styles & sidebar container
│   ├── page.tsx           # Home redirect / main view
│   ├── chat/
│   │   └── page.tsx       # Interactive Chat Interface
│   ├── tasks/
│   │   └── page.tsx       # Notion / Tasks Dashboard placeholder
│   ├── knowledge/
│   │   └── page.tsx       # Obsidian / Knowledge Base placeholder
│   └── settings/
│       └── page.tsx       # System Configuration & Preferences page
├── components/
│   ├── ui/                # Base UI components (buttons, inputs, cards)
│   ├── layout/
│   │   ├── sidebar.tsx    # Collapsible / responsive navigation sidebar
│   │   └── header.tsx     # Top navigation / status bar
│   └── chat/
│       ├── chat-input.tsx # Message composer with send button
│       └── chat-message.tsx # User and Assistant message bubbles
├── lib/
│   └── utils.ts           # Utility functions (cn helper for Tailwind)
├── types/
│   └── index.ts           # TypeScript interfaces (Message, Task, Navigation)
└── public/                # Static assets
```

---

## 🛠️ Step-by-Step Implementation Strategy

### Step 1: Initialize Next.js Project
- Create a clean Next.js 14/15 application using App Router, TypeScript, Tailwind CSS, and ESLint.
- Configure clean root directories and package scripts.

### Step 2: Install UI Foundations
- Install Lucide React icons (`lucide-react`) for sleek, modern icon graphics.
- Setup `clsx` and `tailwind-merge` for clean component styling class composition (`cn` helper).

### Step 3: Core Layout & Navigation Component
- Build `Sidebar` component (`components/layout/sidebar.tsx`) with dark mode aesthetics, clean active states, and navigation links:
  - 💬 **Chat**
  - 📋 **Tasks**
  - 🧠 **Knowledge Base**
  - ⚙️ **Settings**
- Build `Header` component for status indicator (Online / Systems Ready).

### Step 4: Page Implementations
- **Chat Page** (`app/chat/page.tsx`): Premium Dark UI chat feed with message bubbles, action buttons, dynamic input box, quick suggestions, and clear conversation flow.
- **Tasks Page** (`app/tasks/page.tsx`): Structured workspace board UI placeholder.
- **Knowledge Page** (`app/knowledge/page.tsx`): Obsidian vault sync status & document index layout placeholder.
- **Settings Page** (`app/settings/page.tsx`): API key configuration, persona settings, model selection UI layout.

---

## 🧪 Verification Plan

### Automated Checks
1. Run `npm run build` to verify there are zero TypeScript or build errors.
2. Run `npm run dev` to verify the local development server starts cleanly.

### Manual Inspection
1. Verify responsive design (desktop and mobile layouts).
2. Test smooth page switching across Chat, Tasks, Knowledge, and Settings.
3. Confirm dark mode theme styling and accessibility.
