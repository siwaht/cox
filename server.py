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

# ── Patch: fix Python SDK 0.1.79 bug where handler_v1 raises 400 on empty body
# The @copilotkitnext/core JS client sends POST /info with no body in some code paths.
# The SDK rejects body=None but should treat it as {} for the "info" endpoint.
def _patch_copilotkit_handler_v1():
    try:
        import copilotkit.integrations.fastapi as _ck_fastapi
        import fastapi.exceptions as _fexc
        _original_handler_v1 = _ck_fastapi.handler_v1

        async def _patched_handler_v1(sdk, method, path, body, context):
            # Treat missing/None body as empty dict so POST /info works without a body
            if body is None:
                body = {}
            return await _original_handler_v1(sdk=sdk, method=method, path=path, body=body, context=context)

        _ck_fastapi.handler_v1 = _patched_handler_v1
    except Exception:
        pass  # If patching fails, continue without it

_patch_copilotkit_handler_v1()

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
        with open(agent_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Strip out lines that would start a competing server
        filtered_lines = []
        for line in code.splitlines():
            stripped = line.strip()
            if stripped.startswith("uvicorn.run("):
                continue
            if stripped.startswith("app = FastAPI("):
                continue
            if stripped.startswith("app.add_middleware("):
                continue
            if stripped.startswith("add_langgraph_fastapi_endpoint(") or stripped.startswith("add_fastapi_endpoint("):
                continue
            if stripped.startswith('@app.get("/health') or stripped.startswith('@app.get("/copilotkit'):
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

        from copilotkit import LangGraphAGUIAgent

        # Wrap in LangGraphAGUIAgent if it's a raw compiled graph
        if isinstance(agent_obj, LangGraphAGUIAgent):
            ck_agent = agent_obj
        else:
            ck_agent = LangGraphAGUIAgent(name="default", description="Agent", graph=agent_obj)

        # Try the modern AG-UI endpoint first (recommended by CopilotKit docs)
        mounted = False
        try:
            from ag_ui_langgraph import add_langgraph_fastapi_endpoint
            add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")
            mounted = True
            print("✓ Mounted agent at /copilotkit (ag-ui-langgraph)")
        except ImportError:
            pass
        except Exception as e:
            print(f"⚠ ag_ui_langgraph mount failed ({e}), trying SDK fallback...")

        # Fallback: use CopilotKitRemoteEndpoint + add_fastapi_endpoint
        if not mounted:
            try:
                from copilotkit import CopilotKitRemoteEndpoint
                from copilotkit.integrations.fastapi import add_fastapi_endpoint

                # Patch dict_repr if missing on ag_ui base class
                try:
                    from ag_ui_langgraph import LangGraphAgent as _AguiBase
                    if not hasattr(_AguiBase, 'dict_repr'):
                        def _agui_dict_repr(self):
                            return {'name': getattr(self, 'name', ''), 'description': getattr(self, 'description', '')}
                        _AguiBase.dict_repr = _agui_dict_repr
                except ImportError:
                    pass

                sdk = CopilotKitRemoteEndpoint(agents=[ck_agent])
                add_fastapi_endpoint(app, sdk, "/copilotkit")
                mounted = True
                print("✓ Mounted agent at /copilotkit (SDK fallback)")
            except Exception as e2:
                print(f"⚠ SDK fallback also failed: {e2}")

        if not mounted:
            print("⚠ Could not mount agent. Install: pip install ag-ui-langgraph copilotkit")

    except ImportError as e:
        print(f"⚠ copilotkit package issue: {e}. Run: pip install copilotkit ag-ui-langgraph")
    except Exception as e:
        print(f"⚠ Could not load agent.py: {e}")
        print("  The frontend will still work, but /copilotkit won't be available.")



mount_agent()

# ─── Fallback /copilotkit if no agent was mounted ───
_copilotkit_mounted = any(
    hasattr(r, 'path') and '/copilotkit' in str(r.path)
    for r in app.routes
)

if not _copilotkit_mounted:
    _fallback_body = {
        "error": "No agent loaded. Create an agent.py that exports a `graph` or `agent` object.",
        "hint": "Use the Code tab to generate and deploy agent code.",
    }

    @app.api_route("/copilotkit", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def copilotkit_fallback_root(request: Request):
        return JSONResponse(_fallback_body, status_code=503)

    @app.api_route("/copilotkit/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def copilotkit_fallback(request: Request, path: str = ""):
        return JSONResponse(_fallback_body, status_code=503)


# ─── Serve the built frontend ───
DIST_DIR = os.path.join("copilotkit-frontend-creator", "dist")

if os.path.isdir(DIST_DIR):
    # Redirect old cached asset filenames to force browser reload.
    # Replit preview may cache old JS bundles; returning 302 to / clears them.
    @app.get("/assets/{filename:path}")
    async def serve_asset(filename: str):
        asset_path = os.path.join(DIST_DIR, "assets", filename)
        if os.path.isfile(asset_path):
            from starlette.responses import FileResponse as _FR
            return _FR(asset_path)
        # Asset not found — redirect to root so the browser reloads with the current bundle
        from starlette.responses import RedirectResponse
        return RedirectResponse(url="/", status_code=302)

    # API routes are already registered above, so static files come last

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        """Serve index.html for all non-API routes (SPA fallback)."""
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Always return index.html with no-cache headers so the browser gets
        # the latest build (assets are content-hashed and safe to cache).
        from fastapi.responses import HTMLResponse
        index_path = os.path.join(DIST_DIR, "index.html")
        with open(index_path, encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(
            content=html,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
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
