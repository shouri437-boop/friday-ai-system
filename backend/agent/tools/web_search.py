"""
FRIDAY Agent Tool — Tavily Web Search

Stub implementation: returns mock search results.
Swap with real tavily-python client once TAVILY_API_KEY is set.
"""
from langchain_core.tools import tool


@tool
def web_search(query: str, max_results: int = 3) -> str:
    """
    Search the live web for up-to-date information using Tavily AI Search.

    Args:
        query: The search query to look up on the web.
        max_results: Maximum number of search results to return (1–5).

    Returns:
        Formatted search results with titles, URLs, and excerpts.
    """
    # TODO: Replace with real Tavily API call:
    # from tavily import TavilyClient
    # client = TavilyClient(api_key=settings.tavily_api_key)
    # response = client.search(query=query, max_results=max_results)
    # results = response["results"]

    mock_results = [
        {
            "title": f"Latest Research on: {query}",
            "url": "https://example.com/research/1",
            "excerpt": (
                f"Recent developments in {query} show significant advances. "
                "Researchers have published new findings that impact how we understand this topic. "
                "Key takeaways include improved performance benchmarks and novel architectural approaches."
            ),
            "score": 0.91,
        },
        {
            "title": f"{query} — Comprehensive Guide 2025",
            "url": "https://example.com/guide",
            "excerpt": (
                f"This guide covers {query} from fundamentals to advanced implementations. "
                "Updated for 2025 with the latest tooling and ecosystem recommendations."
            ),
            "score": 0.84,
        },
        {
            "title": f"GitHub — Open Source Projects for {query}",
            "url": "https://github.com/search",
            "excerpt": (
                f"Top open-source repositories related to {query}. "
                "Community-maintained implementations with active development and strong documentation."
            ),
            "score": 0.78,
        },
    ]

    top = mock_results[:max_results]
    lines = [f"🌐 Web Search Results for: '{query}'\n"]
    for i, result in enumerate(top, 1):
        lines.append(
            f"  {i}. **{result['title']}** [{result['score']:.0%} relevance]\n"
            f"     URL: {result['url']}\n"
            f"     {result['excerpt']}\n"
        )

    return "\n".join(lines)
