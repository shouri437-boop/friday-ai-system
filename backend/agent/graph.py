"""
FRIDAY Agent — LangGraph StateGraph

Defines the decision graph:
  call_llm → should_use_tools? → run_tools → synthesize_answer
                    ↓ (no tools needed)
              → END

The graph is compiled once at import time and cached for reuse
across all chat requests.
"""
from typing import Literal

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from agent.state import AgentState
from agent.tools.obsidian_rag import obsidian_rag_search
from agent.tools.notion_tool import notion_create_task, notion_list_tasks
from agent.tools.web_search import web_search
from config import get_settings

settings = get_settings()

# ── Tool registry ─────────────────────────────────────────────────────────────
ALL_TOOLS = [
    obsidian_rag_search,
    notion_create_task,
    notion_list_tasks,
    web_search,
]

FRIDAY_SYSTEM_PROMPT = """You are FRIDAY, a highly capable personal AI Chief of Staff.
You are precise, professional, and deeply knowledgeable. You assist with:
- Searching and synthesizing notes from the user's Obsidian knowledge vault
- Creating and managing tasks in the user's Notion workspace
- Researching topics via live web search
- Providing technical engineering guidance

Always be concise, structured, and actionable. Use markdown formatting where helpful.
When using tools, explain what you are doing before and after each tool call.
"""


def _build_llm(tools: list) -> ChatOpenAI:
    """Build an LLM instance bound to the provided tools."""
    llm = ChatOpenAI(
        model=settings.openai_model,
        temperature=settings.openai_temperature,
        api_key=settings.openai_api_key,
        streaming=True,
    )
    return llm.bind_tools(tools)


def _select_tools(state: AgentState) -> list:
    """Determine which tools to expose based on state flags."""
    tools = [notion_create_task, notion_list_tasks]
    if state.get("use_rag", True):
        tools.append(obsidian_rag_search)
    if state.get("use_web_search", False):
        tools.append(web_search)
    return tools


# ── Graph Nodes ───────────────────────────────────────────────────────────────

def call_llm(state: AgentState) -> dict:
    """Primary LLM reasoning node — decides whether to call tools or answer directly."""
    active_tools = _select_tools(state)
    llm = _build_llm(active_tools)

    # Prepend system prompt if no system message exists
    messages = state["messages"]
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=FRIDAY_SYSTEM_PROMPT)] + messages

    response = llm.invoke(messages)
    return {"messages": [response]}


def route_after_llm(state: AgentState) -> Literal["run_tools", "__end__"]:
    """Conditional edge: route to tools if the LLM issued tool calls, else end."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "run_tools"
    return "__end__"


# ── Graph Construction ────────────────────────────────────────────────────────

def build_graph():
    """Compile and return the FRIDAY LangGraph agent graph."""
    tool_node = ToolNode(ALL_TOOLS)

    builder = StateGraph(AgentState)

    # Add nodes
    builder.add_node("call_llm", call_llm)
    builder.add_node("run_tools", tool_node)

    # Define flow
    builder.set_entry_point("call_llm")
    builder.add_conditional_edges(
        "call_llm",
        route_after_llm,
        {"run_tools": "run_tools", "__end__": END},
    )
    # After tools run, loop back to LLM for synthesis
    builder.add_edge("run_tools", "call_llm")

    return builder.compile()


# Compile once at module load — reused across all requests
friday_graph = build_graph()
