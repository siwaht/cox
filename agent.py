"""
Agent module — exports a `graph` variable that server.py auto-wires
to /copilotkit on startup.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver


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
    graph = create_react_agent(
        MODEL,
        tools=[get_weather, search_web],
        checkpointer=MemorySaver(),
        prompt=(
            "You are a helpful assistant. Use your tools when needed to answer questions accurately. "
            "Always explain your reasoning and provide clear, structured responses."
        ),
    )
    print(f"✓ Agent graph created with model={MODEL}")
