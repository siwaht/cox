"""
Unified server — serves the React frontend AND your agent backend
from a single process.

HOW TO USE:
1. Paste your agent code in agent.py (see the placeholder there)
2. Make sure your agent exports a `graph` variable (compiled LangGraph graph)
3. This server auto-wires /copilotkit and /health endpoints
4. Run: python server.py
"""

import os
import sys
import logging
import time
import uvicorn
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(Path(__file__).parent / ".env")

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
    """Import agent.py and wire the CopilotKit/AG-UI endpoint."""
    # Ensure agent.py's directory is importable
    agent_dir = os.path.dirname(os.path.abspath(__file__))
    if agent_dir not in sys.path:
        sys.path.insert(0, agent_dir)

    agent_path = os.path.join(agent_dir, "agent.py")
    if not os.path.isfile(agent_path):
        logger.warning("No agent.py found. /copilotkit won't be available.")
        return

    try:
        # Clear cached module so changes are picked up
        if "agent" in sys.modules:
            del sys.modules["agent"]

        import agent as agent_module

        # Look for the graph/agent object
        agent_obj = getattr(agent_module, "graph", None) or getattr(agent_module, "agent", None)

        if agent_obj is None:
            logger.warning("agent.py found but no `graph` or `agent` variable exported.")
            return

        # Wrap in LangGraphAGUIAgent if it's a raw compiled graph
        from copilotkit import LangGraphAGUIAgent

        if isinstance(agent_obj, LangGraphAGUIAgent):
            ck_agent = agent_obj
        else:
            ck_agent = LangGraphAGUIAgent(
                name="agent",
                description="A helpful assistant.",
                graph=agent_obj,
            )

        # Mount using ag_ui_langgraph — this speaks the AG-UI protocol that
        # CopilotKit React frontend (v1.8+) uses when the `agent` prop is set.
        from ag_ui_langgraph import add_langgraph_fastapi_endpoint

        add_langgraph_fastapi_endpoint(
            app=app,
            agent=ck_agent,
            path="/copilotkit",
        )
        logger.info("✓ Mounted agent at /copilotkit (ag-ui-langgraph)")

    except ImportError as e:
        logger.error(
            "Missing dependency: %s. Run: pip install copilotkit>=0.1.79 'ag-ui-langgraph[fastapi]>=0.0.26'",
            e,
        )
    except Exception as e:
        logger.error("Could not load agent.py: %s", e, exc_info=True)
        # Check for common issues
        err_str = str(e)
        if "dict_repr" in err_str:
            logger.error(
                "HINT: dict_repr error — upgrade SDK: pip install --upgrade copilotkit ag-ui-langgraph"
            )
        elif "thread_id" in err_str:
            logger.error(
                "HINT: thread_id error — remove checkpointer from graph.compile(). "
                "ag-ui-langgraph manages state externally."
            )


mount_agent()


# ─── Fallback /copilotkit if no agent was mounted ────────────────────────────
_copilotkit_mounted = any(
    hasattr(r, "path") and "/copilotkit" in str(r.path)
    for r in app.routes
)

if not _copilotkit_mounted:
    _fallback_body = {
        "error": "No agent loaded. Create an agent.py that exports a `graph` variable.",
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
