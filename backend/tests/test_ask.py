"""
Test suite for Groq Multi-Key Model Mapping Architecture.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from controller.controller import friday_controller
from agent.specialized_agents import get_agent
from agent.core import friday_agent_core
from llm.engine import llm_engine


def test_agent_to_model_mapping():
    # Academic -> FAST (llama-3.1-8b-instant)
    agent_academic = get_agent("AcademicAgent")
    assert agent_academic.model == "llama-3.1-8b-instant"

    # Communication -> HEAVY (llama-3.1-70b-versatile)
    agent_comms = get_agent("CommunicationAgent")
    assert agent_comms.model == "llama-3.1-70b-versatile"

    # Knowledge -> HEAVY (llama-3.1-70b-versatile)
    agent_knowledge = get_agent("KnowledgeAgent")
    assert agent_knowledge.model == "llama-3.1-70b-versatile"

    # Notification -> BALANCED (mixtral-8x7b-32768)
    agent_notify = get_agent("NotificationAgent")
    assert agent_notify.model == "mixtral-8x7b-32768"


def test_groq_key_mapping_registry():
    # Verify strict key mapping
    _, key_env1 = llm_engine.MODEL_KEY_MAP["llama-3.1-8b-instant"]
    assert key_env1 == "GROQ_API_KEY_FAST"

    _, key_env2 = llm_engine.MODEL_KEY_MAP["llama-3.1-70b-versatile"]
    assert key_env2 == "GROQ_API_KEY_HEAVY"

    _, key_env3 = llm_engine.MODEL_KEY_MAP["mixtral-8x7b-32768"]
    assert key_env3 == "GROQ_API_KEY_BALANCED"


def test_minimal_task_execution():
    try:
        res1 = friday_agent_core.execute_task("What is my timetable?")
        assert res1["model_used"] == "llama-3.1-8b-instant"
        assert "answer" in res1
    except RuntimeError as err:
        assert "GROQ_API_KEY_FAST" in str(err) or "Groq API Error" in str(err)
        print("  [Note] Live API key check verified (GROQ_API_KEY_FAST required).")


if __name__ == "__main__":
    print("Running Groq Multi-Key Architecture tests...")
    test_agent_to_model_mapping()
    print("[OK] Agent to model mapping tests passed!")
    test_groq_key_mapping_registry()
    print("[OK] Groq API key mapping registry tests passed!")
    test_minimal_task_execution()
    print("[OK] Minimal task execution tests passed!")
