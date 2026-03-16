"""
Unified server — serves the React frontend AND your agent backend
from a single Replit app. No sandbox needed.

HOW TO USE:
1. Paste your agent code in agent.py (see the placeholder there)
2. Make sure your agent exposes a FastAPI `app` or a LangGraph graph
3. This server auto-wires /copilotkit and /health endpoints
4. Run: python server.py
"""

import os
import sys
import importlib
import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="CopilotKit Unified Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health check ───
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tools": True,
        "tool_calls": True,
        "structured_output": True,
        "logs": True,
        "progress": True,
    }


@app.get("/ok")
async def ok():
    return {"status": "ok"}


# ─── Deploy agent code from the frontend ───
@app.post("/api/deploy-agent")
async def deploy_agent(request: Request):
    """Receive agent code from the Code Transformer and write it to agent.py."""
    body = await request.json()
    code = body.get("code", "")
    deps = body.get("deps", [])
    if not code.strip():
        return JSONResponse({"error": "No code provided"}, status_code=400)

    # 1. Install dependencies first
    if deps:
        import subprocess
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "--quiet"] + deps,
                timeout=120,
            )
        except Exception as e:
            return JSONResponse({
                "ok": False,
                "warning": f"Failed to install dependencies ({', '.join(deps)}): {e}",
            })

    # 2. Write agent code
    agent_path = os.path.join(os.path.dirname(__file__), "agent.py")
    with open(agent_path, "w", encoding="utf-8") as f:
        f.write(code)

    # 3. Try loading the module to catch import errors early
    try:
        if "agent" in sys.modules:
            del sys.modules["agent"]
        importlib.import_module("agent")
    except Exception as e:
        return JSONResponse({
            "ok": True,
            "warning": f"Code saved but agent failed to load: {e}. Fix the code and try again.",
        })

    return {"ok": True, "message": "Agent deployed. Restart the server to activate."}

    return {"ok": True, "message": "Agent deployed. Restart the server to activate."}


# ─── Mount your agent ───
# agent.py should expose one of:
#   - a LangGraph compiled graph as `graph`
#   - a LangChain AgentExecutor as `executor`
# This block wires it into /copilotkit automatically.

def mount_agent():
    """Try to import agent.py and wire CopilotKit endpoints."""
    try:
        agent_mod = importlib.import_module("agent")
    except Exception as e:
        print(f"⚠ Could not import agent.py: {e}")
        print("  The frontend will still work, but /copilotkit won't be available.")
        print("  Paste your agent code in agent.py and restart.")
        return

    try:
        from copilotkit.integrations.fastapi import add_langgraph_fastapi_endpoint

        # Prefer a LangGraph graph
        graph = getattr(agent_mod, "graph", None)
        if graph:
            add_langgraph_fastapi_endpoint(app, graph, "/copilotkit")
            print("✓ Mounted LangGraph agent at /copilotkit")
            return

        # Fall back to AgentExecutor
        executor = getattr(agent_mod, "executor", None)
        if executor:
            add_langgraph_fastapi_endpoint(app, executor, "/copilotkit")
            print("✓ Mounted LangChain executor at /copilotkit")
            return

        print("⚠ agent.py found but no `graph` or `executor` exported.")
        print("  Export one of those and restart.")

    except ImportError:
        print("⚠ copilotkit package not installed. Run: pip install copilotkit")


mount_agent()


# ─── Serve the built frontend ───
DIST_DIR = os.path.join("copilotkit-frontend-creator", "dist")

if os.path.isdir(DIST_DIR):
    # API routes are already registered above, so static files come last
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve index.html for all non-API routes (SPA fallback)."""
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
else:
    @app.get("/")
    async def no_build():
        return JSONResponse(
            {"error": "Frontend not built yet. Run: bash build.sh"},
            status_code=503,
        )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
