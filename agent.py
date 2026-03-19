"""
Default agent — replace this with your own LangGraph agent.

This file is loaded automatically by server.py. Export a variable named
`graph` (a LangGraphAGUIAgent or compiled LangGraph graph) and it will
be wired to /copilotkit automatically on restart.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the same directory as this script
load_dotenv(Path(__file__).parent / ".env")

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

# ─── Tools ───────────────────────────────────────────────────────────────────
@tool
def get_weather(location: str) -> str:
    """Get current weather for a location."""
    return f"The weather in {location} is sunny and 72°F."

@tool
def search(query: str) -> str:
    """Search for information on a topic."""
    return f"Here are results for '{query}': This is a placeholder. Replace with a real search tool."

# ─── Model ───────────────────────────────────────────────────────────────────
MODEL = os.getenv("AGENT_MODEL", "openai:gpt-4o-mini")

# ─── Graph ───────────────────────────────────────────────────────────────────
_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not _api_key:
    print("⚠ No LLM API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in your .env file.")
    print("  The agent will not be available until an API key is configured.")
    graph = None
else:
    _checkpointer = MemorySaver()
    # LangGraph v1.0+ renamed system_prompt → prompt
    graph = create_react_agent(
        MODEL,
        tools=[get_weather, search],
        checkpointer=_checkpointer,
        prompt="You are a helpful assistant with weather and search tools.",
    )
    print(f"✓ Agent graph created with model={MODEL}")
