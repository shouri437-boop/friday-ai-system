/**
 * FRIDAY Frontend — Typed API client for the FastAPI backend.
 *
 * All functions target http://localhost:8000 (backend dev server).
 * The chat stream uses the native EventSource / fetch SSE pattern.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamChunk {
  type: "token" | "tool_call" | "done" | "error" | "model_info";
  content?: string;
  tool_name?: string;
  session_id?: string;
  model_used?: string;
  error?: string;
}

export interface AskResponsePayload {
  answer: string;
  model_used: string;
  agent_used?: string;
}


export interface ChatRequestPayload {
  message: string;
  session_id?: string;
  use_rag?: boolean;
  use_web_search?: boolean;
  model?: string;
}

/**
 * Send a query directly to the Controller AI /ask endpoint.
 */
export async function askQuestion(question: string): Promise<AskResponsePayload> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Ask request failed: ${res.status}`);
  return res.json();
}

export interface TaskPayload {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  tags?: string[];
}

export interface KnowledgeSearchPayload {
  query: string;
  top_k?: number;
}

export interface SystemStatus {
  status: string;
  agent: string;
  model: string;
  vault_path: string;
  vault_docs_indexed: number;
  tools_registered: string[];
  notion_configured: boolean;
  openai_configured: boolean;
  tavily_configured: boolean;
  version: string;
}

// ── System ────────────────────────────────────────────────────────────────────

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/api/system/status`);
  if (!res.ok) throw new Error(`System status error: ${res.status}`);
  return res.json();
}

// ── Chat (SSE Streaming) ──────────────────────────────────────────────────────

/**
 * Stream a chat response from the FRIDAY backend via Server-Sent Events.
 *
 * @param payload   The chat request payload.
 * @param onChunk   Called for each SSE chunk received.
 * @param onDone    Called when the stream is complete.
 * @param onError   Called if an error occurs.
 */
export async function streamChat(
  payload: ChatRequestPayload,
  onChunk: (chunk: StreamChunk) => void,
  onDone: (sessionId: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body readable stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const chunk: StreamChunk = JSON.parse(line.slice(6));
            if (chunk.type === "done") {
              onDone(chunk.session_id ?? "");
              return;
            } else if (chunk.type === "error") {
              onError(chunk.error ?? "Unknown error");
              return;
            } else {
              onChunk(chunk);
            }
          } catch {
            // Malformed JSON chunk — skip
          }
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(status = "all") {
  const res = await fetch(`${API_BASE}/api/tasks?status=${status}`);
  if (!res.ok) throw new Error(`Tasks fetch error: ${res.status}`);
  return res.json();
}

export async function createTask(payload: TaskPayload) {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Task creation error: ${res.status}`);
  return res.json();
}

export async function updateTask(
  taskId: string,
  update: { status?: string; priority?: string; description?: string }
) {
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`Task update error: ${res.status}`);
  return res.json();
}

// ── Knowledge ─────────────────────────────────────────────────────────────────

export async function searchKnowledge(payload: KnowledgeSearchPayload) {
  const res = await fetch(`${API_BASE}/api/knowledge/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Knowledge search error: ${res.status}`);
  return res.json();
}

export async function syncVault() {
  const res = await fetch(`${API_BASE}/api/knowledge/sync`, { method: "POST" });
  if (!res.ok) throw new Error(`Vault sync error: ${res.status}`);
  return res.json();
}

// ── Vision ────────────────────────────────────────────────────────────────────

export interface VisionDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

/**
 * Send a base64 image frame to POST /vision/detect.
 * Validates process.env.MY_API_KEY presence before making the call.
 */
export async function detectVisionObjects(base64Image: string): Promise<VisionDetection[]> {
  // 🔐 API Key Check Requirement
  const apiKey = process.env.MY_API_KEY || process.env.NEXT_PUBLIC_MY_API_KEY;
  if (!apiKey) {
    throw new Error("API key not found");
  }

  const res = await fetch(`${API_BASE}/vision/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || errorData.detail === "API key not found") {
      throw new Error("API key not found");
    }
    throw new Error(errorData.detail || `Vision detection error (${res.status})`);
  }

  return res.json();
}

export interface ScanAnalysisResponse {
  object_found: boolean;
  title: string;
  category: string;
  summary: string;
  key_topics: string[];
  useful_for: string;
  prerequisites: string;
  full_text_output: string;
  detections: VisionDetection[];
}



/**
 * Send a base64 image frame to POST /vision/scan for deep AI analysis.
 */
export async function scanVisionObject(
  base64Image: string,
  manualTitle: string = ""
): Promise<ScanAnalysisResponse> {
  const apiKey = process.env.MY_API_KEY || process.env.NEXT_PUBLIC_MY_API_KEY;
  if (!apiKey) {
    throw new Error("API key not found");
  }

  const res = await fetch(`${API_BASE}/vision/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      image: base64Image,
      manual_title: manualTitle,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || errorData.detail === "API key not found") {
      throw new Error("API key not found");
    }
    throw new Error(errorData.detail || `Vision scan error (${res.status})`);
  }

  return res.json();
}


export interface VisionChatResponse {
  answer: string;
  model_used: string;
}

/**
 * Send a follow-up user question to the Vision Chatbot endpoint POST /vision/ask.
 */
export async function askVisionFollowUp(
  question: string,
  title: string,
  imageContext: string
): Promise<VisionChatResponse> {
  const apiKey = process.env.MY_API_KEY || process.env.NEXT_PUBLIC_MY_API_KEY;
  if (!apiKey) {
    throw new Error("API key not found");
  }

  const res = await fetch(`${API_BASE}/vision/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      question,
      title,
      image_context: imageContext,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || errorData.detail === "API key not found") {
      throw new Error("API key not found");
    }
    throw new Error(errorData.detail || `Vision chatbot error (${res.status})`);
  }

  return res.json();
}



