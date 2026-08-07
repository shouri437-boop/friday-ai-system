"""FRIDAY Agent — AgentState schema for LangGraph."""
from typing import Annotated, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    The shared state that flows through every node in the FRIDAY LangGraph.

    Fields
    ------
    messages     : Conversation history (HumanMessage / AIMessage / ToolMessage).
                   `add_messages` reducer appends new messages rather than replacing.
    use_rag      : Whether to activate the Obsidian RAG tool.
    use_web_search: Whether to activate the Tavily web-search tool.
    tool_results : Collected results from tool executions (for synthesis node).
    final_answer : The assistant's finished response text.
    """
    messages: Annotated[list[BaseMessage], add_messages]
    use_rag: bool
    use_web_search: bool
    tool_results: list[dict]
    final_answer: Optional[str]
