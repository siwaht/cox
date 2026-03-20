"""
Agent module — exports a `graph` variable that server.py auto-wires
to /copilotkit on startup.

IMPORTANT: The checkpointer is NOT compiled into the graph here.
ag-ui-langgraph manages its own thread/run lifecycle and will fail
if the graph already has a checkpointer baked in (it tries to inject
thread_id at call time, which conflicts with a pre-compiled checkpointer).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent


@tool
def get_weather(city: str) -> str:
    """Get temperature and weather of a city."""
    return f"The weather in {city} is sunny with a temperature of 25°C."


@tool
def search_web(query: str) -> str:
    """Search the web for information about a topic."""
    return f"Search results for '{query}': This is a placeholder. Connect a real search API for production use."


MODEL = os.getenv("AGENT_MODEL", "openai:gpt-4o-mini")

_api_key = (
    os.getenv("OPENAI_API_KEY")
    or os.getenv("ANTHROPIC_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
)

if not _api_key:
    print("⚠ No LLM API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in .env")
    graph = None
else:
    # NOTE: Do NOT pass checkpointer here. The ag-ui-langgraph adapter
    # manages thread state externally. Passing MemorySaver() here causes
    # "thread_id required" errors because the adapter doesn't know about
    # the pre-compiled checkpointer.
    graph = create_react_agent(
        MODEL,
        tools=[get_weather, search_web],
        prompt=(
            "You are a helpful assistant. Use your tools when needed to answer questions accurately. "
            "Always explain your reasoning and provide clear, structured responses."
        ),
    )
    print(f"✓ Agent graph created with model={MODEL}")
