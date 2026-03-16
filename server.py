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

    # Known pip package name mappings (import name → pip name)
    PIP_ALIASES = {
        "dotenv": "python-dotenv",
        "cv2": "opencv-python",
        "sklearn": "scikit-learn",
        "yaml": "pyyaml",
        "bs4": "beautifulsoup4",
        "PIL": "pillow",
        "gi": "pygobject",
    }

    # 1. Install dependencies first
    import subprocess
    all_deps = list(deps) if deps else []
    # Always ensure python-dotenv if code uses it
    if "dotenv" in code and "python-dotenv" not in all_deps:
        all_deps.append("python-dotenv")

    if all_deps:
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "--quiet"] + all_deps,
                timeout=120,
            )
        except Exception as e:
            return JSONResponse({
                "ok": False,
                "warning": f"Failed to install dependencies ({', '.join(all_deps)}): {e}",
            })

    # 2. Write agent code
    agent_path = os.path.join(os.path.dirname(__file__), "agent.py")
    with open(agent_path, "w", encoding="utf-8") as f:
        f.write(code)

    return {"ok": True, "message": "Agent deployed. Restart the server to activate."}


@app.post("/api/restart")
async def restart_server():
    """Restart the server process by re-executing itself."""
    import subprocess
    # On Replit, the workflow runner will restart the process
    os.execv(sys.executable, [sys.executable, __file__])


# ─── Mount your agent ───
# agent.py should expose one of:
#   - a LangGraph compiled graph as `graph`
#   - a LangChain AgentExecutor as `executor`
# This block wires it into /copilotkit automatically.

def mount_agent():
    """Try to import agent.py and wire CopilotKit endpoints."""
    agent_path = os.path.join(os.path.dirname(__file__), "agent.py")
    if not os.path.isfile(agent_path):
        print("⚠ No agent.py found. The frontend will work but /copilotkit won't be available.")
        return

    try:
        # Read the code and exec it in an isolated namespace so its top-level
        # FastAPI app / uvicorn.run don't interfere with ours.
        with open(agent_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Strip out lines that would start a competing server
        filtered_lines = []
        for line in code.splitlines():
            stripped = line.strip()
            # Skip standalone server bootstrap
            if stripped.startswith("uvicorn.run("):
                continue
            if stripped.startswith("app = FastAPI("):
                continue
            if stripped.startswith("app.add_middleware("):
                continue
            if stripped.startswith("add_langgraph_fastapi_endpoint("):
                continue
            if stripped.startswith('@app.get("/health')  or stripped.startswith('@app.get("/copilotkit'):
                continue
            if stripped == 'def health():' or stripped == 'return {"status": "ok"}':
                continue
            filtered_lines.append(line)

        namespace = {}
        exec("\n".join(filtered_lines), namespace)

        # Look for the agent/graph/executor object
        agent_obj = (
            namespace.get("graph")
            or namespace.get("agent")
            or namespace.get("executor")
            or namespace.get("workflow")
        )

        if not agent_obj:
            print("⚠ agent.py found but no `graph`, `agent`, `executor`, or `workflow` exported.")
            print("  Export one of those and restart.")
            return

        from copilotkit.integrations.fastapi import add_langgraph_fastapi_endpoint
        add_langgraph_fastapi_endpoint(app, agent_obj, "/copilotkit")
        print("✓ Mounted agent at /copilotkit")

    except ImportError:
        print("⚠ copilotkit package not installed. Run: pip install copilotkit")
    except Exception as e:
        print(f"⚠ Could not load agent.py: {e}")
        print("  The frontend will still work, but /copilotkit won't be available.")


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
