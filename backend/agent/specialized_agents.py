"""
FRIDAY Specialized Agents Module.

Strict Separation:
- Chat Agents use GROQ_API_KEY_FAST, GROQ_API_KEY_HEAVY, GROQ_API_KEY_BALANCED and retrieve context ONLY from RAGFlow dataset PDFs in ragflow/data.
- Chat tab has ZERO connection to Vision camera state or scanned items.

Agent -> Model Mapping:
- AcademicAgent        -> llama-3.1-8b-instant   (GROQ_API_KEY_FAST)
- PlacementAgent       -> llama-3.1-8b-instant   (GROQ_API_KEY_FAST)
- EventsAgent          -> llama-3.1-8b-instant   (GROQ_API_KEY_FAST)
- StudentServicesAgent -> llama-3.1-8b-instant   (GROQ_API_KEY_FAST)
- CommunicationAgent   -> llama-3.1-70b-versatile (GROQ_API_KEY_HEAVY)
- KnowledgeAgent       -> llama-3.1-70b-versatile (GROQ_API_KEY_HEAVY)
- NotificationAgent    -> mixtral-8x7b-32768      (GROQ_API_KEY_BALANCED)
"""
from typing import Dict, Any
from llm.engine import llm_engine
from llm.direct_rag_retriever import retrieve_ragflow_context, doc_store


class BaseSpecializedAgent:
    """Base class for Chat Specialized Agents using dataset RAG retrieval."""

    def __init__(self, name: str, model: str, system_prompt: str):
        self.name = name
        self.model = model
        self.system_prompt = system_prompt
        self.engine = llm_engine

    def execute(self, question: str) -> Dict[str, str]:
        """
        Executes Chat query:
        1. Retrieves RAG context from dataset PDFs in ragflow/data.
        2. Injects dataset context with strict Chat system instructions.
        3. Calls Groq engine without any Vision interference.
        """
        # Retrieve context from RAGFlow dataset PDFs
        context = retrieve_ragflow_context(query=question, top_k=8)

        # Fallback if specific search terms yielded no matches: send top chunks from syllabus & calendar
        if not context and doc_store.chunks:
            fallback_chunks = doc_store.chunks[:6]
            formatted = []
            for r in fallback_chunks:
                formatted.append(f"📄 [Document: {r['doc_name']} | Page: {r['page']}]\n{r['content']}")
            context = "\n\n---\n".join(formatted)

        FRIDAY_MODE_SYSTEM_INSTRUCTION = """
SYSTEM ROLE & OPERATING MODES:
You are FRIDAY — an AI assistant operating strictly in TWO MODES:

----------------------------------
🧠 ANSWER MODE
----------------------------------
- Used for questions, concepts, and explanations (e.g. "What is AI?", "Explain calculus syllabus")
- Output: normal text ONLY
- No action JSON

----------------------------------
⚙️ ACTION MODE
----------------------------------
- Used when user wants to DO something (intent words: send, schedule, add, create, update, open, show, view, check, display)
- Output: Structured JSON array ONLY. Do NOT add markdown codeblock wrappers or text intro.

⚙️ ACTION MODE OUTPUT FORMAT:
[
  {
    "action": "action_name",
    "data": { ... }
  }
]

🧩 SUPPORTED ACTIONS:
1. send_email (data: to, subject, body)
2. update_notion_calendar (data: title, date: "YYYY-MM-DD", time: "HH:MM")
3. update_tasks (data: task, status)
4. view_calendar (data: type)
5. view_tasks (data: filter)
6. open_file (data: file_path/name)
7. vision_detect (data: object)

⚠️ STRICT MODE RULES:
- IF query intent is an ACTION (send/schedule/add/create/update/open/show/view/check/display) -> Output ACTION MODE JSON ONLY!
- IF query intent is a QUESTION/EXPLANATION -> Output ANSWER MODE normal text ONLY!
"""

        # Build clean Chat System Prompt strictly isolated from Vision
        full_system_prompt = (
            f"{self.system_prompt}\n\n"
            f"{FRIDAY_MODE_SYSTEM_INSTRUCTION}\n\n"
            "STRICT DATASET RULE: When in ANSWER MODE, answer using the official RAGFlow dataset context provided below.\n"
            f"=== OFFICIAL RAGFLOW DATASET CONTEXT ===\n{context}\n========================================"
        )

        answer, model_used = self.engine.generate(
            model=self.model,
            question=question,
            system_prompt=full_system_prompt
        )

        return {
            "answer": answer,
            "model_used": model_used
        }


class AcademicAgent(BaseSpecializedAgent):
    """Handles academic timetables, course schedules, syllabi, exams, and grades."""
    def __init__(self):
        super().__init__(
            name="AcademicAgent",
            model="llama-3.1-8b-instant",
            system_prompt="You are the Academic Affairs Agent. Provide precise, detailed course syllabus information, units, course codes, and academic schedules from the dataset."
        )


class PlacementAgent(BaseSpecializedAgent):
    """Handles internship listings, job drives, resume feedback."""
    def __init__(self):
        super().__init__(
            name="PlacementAgent",
            model="llama-3.1-8b-instant",
            system_prompt="You are the Career & Placement Agent. Provide direct details on internships, campus recruiting drives, and career guidance."
        )


class EventsAgent(BaseSpecializedAgent):
    """Handles campus hackathons, technical fests, workshops, and holiday calendars."""
    def __init__(self):
        super().__init__(
            name="EventsAgent",
            model="llama-3.1-8b-instant",
            system_prompt="You are the Campus Events Agent. Provide exact details on upcoming hackathons, technical fests, workshops, and official holiday dates."
        )


class StudentServicesAgent(BaseSpecializedAgent):
    """Handles hostel rules, mess schedules, fee payments, amenities."""
    def __init__(self):
        super().__init__(
            name="StudentServicesAgent",
            model="llama-3.1-8b-instant",
            system_prompt="You are the Student Services Agent. Answer queries regarding hostel regulations, mess schedules, transport, and campus services."
        )


class CommunicationAgent(BaseSpecializedAgent):
    """Drafts formal emails to faculty."""
    def __init__(self):
        super().__init__(
            name="CommunicationAgent",
            model="llama-3.1-70b-versatile",
            system_prompt="You are the Communication Agent. Draft well-structured, professional, formal emails and communications for students."
        )


class KnowledgeAgent(BaseSpecializedAgent):
    """Handles college policy explanations and institutional regulations."""
    def __init__(self):
        super().__init__(
            name="KnowledgeAgent",
            model="llama-3.1-70b-versatile",
            system_prompt="You are the Institutional Knowledge Agent. Explain college policies, grading systems, and regulations clearly."
        )


class NotificationAgent(BaseSpecializedAgent):
    """Handles student reminders and time-based alerts."""
    def __init__(self):
        super().__init__(
            name="NotificationAgent",
            model="mixtral-8x7b-32768",
            system_prompt="You are the Notification Agent. Confirm reminders and scheduled alerts clearly."
        )


# Registry mapping agent name to instance
AGENT_REGISTRY: Dict[str, BaseSpecializedAgent] = {
    "AcademicAgent": AcademicAgent(),
    "PlacementAgent": PlacementAgent(),
    "EventsAgent": EventsAgent(),
    "StudentServicesAgent": StudentServicesAgent(),
    "CommunicationAgent": CommunicationAgent(),
    "KnowledgeAgent": KnowledgeAgent(),
    "NotificationAgent": NotificationAgent(),
}


def get_agent(agent_name: str) -> BaseSpecializedAgent:
    """Retrieve agent instance from registry."""
    return AGENT_REGISTRY.get(agent_name, AGENT_REGISTRY["AcademicAgent"])
