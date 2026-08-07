"""
FRIDAY Central Orchestrator (Controller AI) Module.

Strictly classifies user queries to select ONE of the 7 specialized agents.
IMPORTANT: This Controller selects ONLY the agent — model selection is performed
independently by the selected agent.
"""
from pydantic import BaseModel, Field
from typing import Literal

AgentType = Literal[
    "AcademicAgent",
    "PlacementAgent",
    "EventsAgent",
    "StudentServicesAgent",
    "CommunicationAgent",
    "KnowledgeAgent",
    "NotificationAgent"
]


class ControllerDecision(BaseModel):
    """Output decision structure from Central Orchestrator."""
    agent_name: AgentType = Field(
        ..., description="The chosen specialized agent to handle the query"
    )
    reasoning: str = Field(
        "", description="Brief rationale for agent selection"
    )


class ControllerAI:
    """
    Central Orchestrator.
    Evaluates user prompt intent and routes exclusively to a specialized agent.
    Never selects LLM models directly.
    """

    def select_agent(self, question: str) -> ControllerDecision:
        """
        Classifies user prompt intent to select ONE specialized agent.

        Routing Matrix:
        - Timetable, exams, syllabus, grades, assignments -> AcademicAgent
        - Internships, jobs, placements, resume, career -> PlacementAgent
        - Hackathons, fests, workshops, club events, sports -> EventsAgent
        - Hostel, mess, fee, ID card, transport, amenities -> StudentServicesAgent
        - Email drafting, formal letters, professor comms -> CommunicationAgent
        - College policy, handbook, attendance rules, regulations -> KnowledgeAgent
        - Reminders, alarms, alerts, notifications -> NotificationAgent
        """
        text = question.lower()
        # 1. AcademicAgent — check FIRST because it has the RAG syllabus / calendar data
        academic_kw = [
            "timetable", "schedule", "exam", "syllabus", "course", "grade", "gpa",
            "marks", "assignment", "class", "lecture", "subject", "unit", "semester",
            "curriculum", "matrices", "calculus", "physics", "chemistry", "engineering",
            "attendance", "result", "internal", "credits"
        ]
        if any(kw in text for kw in academic_kw):
            return ControllerDecision(
                agent_name="AcademicAgent",
                reasoning="Query relates to academic schedule, course syllabus, or exams."
            )

        # 2. NotificationAgent check
        notification_kw = ["remind", "reminder", "alarm", "alert", "notify", "schedule reminder", "timer", "schedule alert"]
        if any(kw in text for kw in notification_kw):
            return ControllerDecision(
                agent_name="NotificationAgent",
                reasoning="Query involves setting reminders or time-based alerts."
            )

        # 3. CommunicationAgent check
        communication_kw = ["email", "draft", "write email", "mail to", "letter to professor", "formal message", "announcement draft", "contact professor"]
        if any(kw in text for kw in communication_kw):
            return ControllerDecision(
                agent_name="CommunicationAgent",
                reasoning="Query involves drafting formal communications or emails."
            )

        # 4. PlacementAgent check
        placement_kw = ["internship", "placement", "job", "career", "resume", "interview", "hiring", "company visit", "recruit"]
        if any(kw in text for kw in placement_kw):
            return ControllerDecision(
                agent_name="PlacementAgent",
                reasoning="Query involves career placements, internships, or resume prep."
            )

        # 5. EventsAgent check
        events_kw = ["hackathon", "fest", "workshop", "seminar", "event", "club", "competition", "sports meet", "cultural"]
        if any(kw in text for kw in events_kw):
            return ControllerDecision(
                agent_name="EventsAgent",
                reasoning="Query relates to campus events, hackathons, or workshops."
            )

        # 6. StudentServicesAgent check
        services_kw = ["hostel", "mess", "fee", "fees", "id card", "bus", "transport", "library pass", "room", "amenities", "canteen"]
        if any(kw in text for kw in services_kw):
            return ControllerDecision(
                agent_name="StudentServicesAgent",
                reasoning="Query relates to hostel, mess, transport, or campus student services."
            )

        # 7. KnowledgeAgent check
        knowledge_kw = ["policy", "handbook", "regulation", "rule", "rules", "attendance policy", "grading system", "faq", "constitution", "guidelines"]
        if any(kw in text for kw in knowledge_kw):
            return ControllerDecision(
                agent_name="KnowledgeAgent",
                reasoning="Query requests college rules, handbook search, or institutional policy."
            )

        # 8. Holiday / Events — route to EventsAgent which has date data
        holiday_kw = ["holiday", "holidays", "vacation", "leave", "off day", "public holiday"]
        if any(kw in text for kw in holiday_kw):
            return ControllerDecision(
                agent_name="EventsAgent",
                reasoning="Query involves holidays or scheduled leaves."
            )

        # Default fallback — use AcademicAgent with full RAG context
        return ControllerDecision(
            agent_name="AcademicAgent",
            reasoning="Defaulting to AcademicAgent with RAG context for general student query."
        )



# Singleton orchestrator instance
friday_controller = ControllerAI()
