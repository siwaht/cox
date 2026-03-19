"""
Unified server — serves the React frontend AND your agent backend
from a single process.

HOW TO USE:
1. Paste your agent code in agent.py (see the placeholder there)
2. Make sure your agent exposes a FastAPI `app` or a LangGraph graph
3. This server auto-wires /copilotkit and /health endpoints
4. Run: python server.py
"""

import os
import sys
import logging
import time
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("server")

# ─── Environment ─────────────────────────────────────────────────────────────
IS_PRODUCTION = os.environ.get("PYTHON_ENV", "development") == "production"
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

# ── Patch: fix Python SDK 0.1.79 bug where handler_v1 raises 400 on empty body
def _patch_copilotkit_handler_v1():
    try:
        import copilotkit.integrations.fastapi as _ck_fastapi
        _original_handler_v1 = _ck_fastapi.handler_v1

        async def _patched_handler_v1(sdk, method, path, body, context):
            if body is None:
                body = {}
            # Ensure required fields exist to prevent 422 validation errors
            if isinstance(body, dict):
                body.setdefault("method", "agent.run")
                body.setdefault("params", {})
            return await _original_handler_v1(sdk=sdk, method=method, path=path, body=body, context=context)

        _ck_fastapi.handler_v1 = _patched_handler_v1
    except Exception:
        pass

_patch_copilotkit_handler_v1()


# ─── Security Headers Middleware ─────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# ─── Request Logging Middleware ──────────────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000
        if not request.url.path.startswith("/assets"):
            logger.info(
                "%s %s %d %.0fms",
                request.method, request.url.path, response.status_code, duration_ms,
            )
        return response


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CopilotKit Unified Server",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return cleaner error responses instead of raw Pydantic validation dumps."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Request validation failed",
            "detail": str(exc).split("\n")[0][:200],
            "hint": "Check the request body format. If using CopilotKit, ensure the SDK version matches the server.",
        },
    )


# ─── Health check ────────────────────────────────────────────────────────────
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


# ─── Mount your agent ────────────────────────────────────────────────────────
def mount_agent():
    """Try to import agent.py and wire CopilotKit endpoints."""
    agent_path = os.path.join(os.path.dirname(__file__), "agent.py")
    if not os.path.isfile(agent_path):
        logger.warning("No agent.py found. /copilotkit won't be available.")
        return

    try:
        with open(agent_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Clear cached 'agent' module if it was previously imported
        if 'agent' in sys.modules:
            del sys.modules['agent']

        # Strip out lines that would start a competing server
        filtered_lines = []
        skip_block = False
        block_indent = 0
        for line in code.splitlines():
            stripped = line.strip()
            if "uvicorn.run(" in stripped:
                continue
            if stripped.startswith("app = FastAPI(") or stripped.startswith("app=FastAPI("):
                continue
            if stripped.startswith("app.add_middleware("):
                continue
            if "add_langgraph_fastapi_endpoint(" in stripped or "add_fastapi_endpoint(" in stripped:
                continue
            if "CopilotKitRemoteEndpoint(" in stripped:
                continue
            if (stripped.startswith('@app.get(') or stripped.startswith('@app.post(') or
                    stripped.startswith('@app.route(') or stripped.startswith('@app.api_route(')):
                skip_block = True
                block_indent = 0
                continue
            if stripped == 'if __name__ == "__main__":' or stripped == "if __name__ == '__main__':":
                skip_block = True
                block_indent = 0
                continue
            if skip_block:
                if stripped.startswith("def ") or stripped.startswith("async def "):
                    block_indent = len(line) - len(line.lstrip())
                    continue
                if stripped == "" or stripped.startswith("#"):
                    continue
                current_indent = len(line) - len(line.lstrip())
                if current_indent > block_indent and stripped:
                    continue
                skip_block = False
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
            logger.warning("agent.py found but no `graph`, `agent`, `executor`, or `workflow` exported.")
            return

        from copilotkit import LangGraphAGUIAgent

        # Wrap in LangGraphAGUIAgent if it's a raw compiled graph
        if isinstance(agent_obj, LangGraphAGUIAgent):
            ck_agent = agent_obj
        else:
            ck_agent = LangGraphAGUIAgent(name="agent", description="Agent", graph=agent_obj)

        # Try the modern AG-UI endpoint first
        mounted = False
        try:
            from ag_ui_langgraph import add_langgraph_fastapi_endpoint
            add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")
            mounted = True
            logger.info("Mounted agent at /copilotkit (ag-ui-langgraph)")
        except ImportError:
            pass
        except Exception as e:
            logger.warning("ag_ui_langgraph mount failed (%s), trying SDK fallback...", e)

        # Fallback: CopilotKitRemoteEndpoint + add_fastapi_endpoint
        if not mounted:
            try:
                from copilotkit import CopilotKitRemoteEndpoint
                from copilotkit.integrations.fastapi import add_fastapi_endpoint

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
                logger.info("Mounted agent at /copilotkit (SDK fallback)")
            except Exception as e2:
                logger.error("SDK fallback also failed: %s", e2)

        if not mounted:
            logger.error("Could not mount agent. Install: pip install ag-ui-langgraph copilotkit")

    except ImportError as e:
        logger.error("copilotkit package issue: %s. Run: pip install copilotkit ag-ui-langgraph", e)
    except Exception as e:
        logger.error("Could not load agent.py: %s", e)


mount_agent()


# ─── Fallback /copilotkit if no agent was mounted ────────────────────────────
_copilotkit_mounted = any(
    hasattr(r, 'path') and '/copilotkit' in str(r.path)
    for r in app.routes
)

if not _copilotkit_mounted:
    _fallback_body = {
        "error": "No agent loaded. Create an agent.py that exports a `graph` or `agent` object.",
        "hint": "Use the Code tab to generate agent code, then download and deploy it.",
    }

    @app.api_route("/copilotkit", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def copilotkit_fallback_root(request: Request):
        return JSONResponse(_fallback_body, status_code=503)

    @app.api_route("/copilotkit/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def copilotkit_fallback(request: Request, path: str = ""):
        return JSONResponse(_fallback_body, status_code=503)


# ─── Serve the built frontend ────────────────────────────────────────────────
DIST_DIR = os.path.join("copilotkit-frontend-creator", "dist")
ASSET_CACHE = "public, max-age=31536000, immutable"

if os.path.isdir(DIST_DIR):
    import mimetypes

    @app.get("/assets/{filename:path}")
    async def serve_asset(filename: str):
        asset_path = os.path.join(DIST_DIR, "assets", filename)
        if os.path.isfile(asset_path):
            content_type = mimetypes.guess_type(asset_path)[0] or "application/octet-stream"
            return FileResponse(
                asset_path,
                media_type=content_type,
                headers={"Cache-Control": ASSET_CACHE},
            )
        from starlette.responses import RedirectResponse
        return RedirectResponse(url="/", status_code=302)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        """Serve index.html for all non-API routes (SPA fallback)."""
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
            return FileResponse(file_path, media_type=content_type)
        index_path = os.path.join(DIST_DIR, "index.html")
        if not os.path.isfile(index_path):
            return JSONResponse({"error": "index.html not found"}, status_code=500)
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
    workers = int(os.environ.get("WEB_CONCURRENCY", 1))
    logger.info("Starting server on port %d (production=%s)", port, IS_PRODUCTION)
    uvicorn.run(
        "server:app" if IS_PRODUCTION else app,
        host="0.0.0.0",
        port=port,
        workers=workers if IS_PRODUCTION else 1,
        log_level="warning" if IS_PRODUCTION else "info",
        access_log=not IS_PRODUCTION,
    )
