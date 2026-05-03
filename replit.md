# CopilotKit Frontend Creator

## Overview
Visual workspace for building AI agent frontends. React 19 + Vite SPA editor (drag/drop blocks, templates, preview, code export) backed by a single-process FastAPI server that also hosts the live agent so users can chat with their agent in Preview mode.

## Architecture
- **`server.py`** — FastAPI app on port 5000.
  - Serves the built React SPA from `copilotkit-frontend-creator/dist/`.
  - Mounts the agent at `POST /copilotkit` via `ag-ui-langgraph` (raw AG-UI protocol).
  - Stub `GET/POST /copilotkit/info` returns minimal agent info (silences CopilotKit React's runtime-discovery probe — we don't run the GraphQL runtime).
  - `/health` returns capability flags for the frontend's `useLocalAgent` auto-detection.
- **`agent.py`** — Builds a `deepagents` graph with `openai:gpt-4o-mini`, `CopilotKitMiddleware`, `MemorySaver` checkpointer. Exports `graph`.
- **Frontend** (`copilotkit-frontend-creator/`) — React 19, Vite 6, Zustand, Tailwind, @copilotkit/react-core 1.54.
  - `CopilotKitBridge.tsx` wraps Preview with `<CopilotKit>` and registers an `HttpAgent` from `@ag-ui/client` via `agents__unsafe_dev_only={ default: httpAgent }`. This bypasses CopilotKit's GraphQL runtime and talks AG-UI directly to the FastAPI mount.
  - `useLocalAgent.ts` auto-seeds a "Local Agent" connection at `window.location.origin` on first load.

## Critical wiring details (don't change without re-testing chat)
- HttpAgent registration key MUST be `"default"` (CopilotKit's legacy `useCopilotChat` resolves `agentId` to `"default"`). HttpAgent's `agentId` config must equal its registration key, and `<CopilotKit agent="default">` must match too.
- Backend agent name (`LangGraphAGUIAgent(name=...)`) does NOT need to match — the AG-UI mount is a single endpoint.
- `OPENAI_API_KEY` secret is required for `agent.py` to compile its graph.

## Running
Workflow `Start application` runs `python server.py`. After frontend changes, rebuild: `cd copilotkit-frontend-creator && npm run build` then restart workflow.

## Deployment
Single process (`python server.py`) — frontend is pre-built into `dist/` and served by FastAPI. Use `bash build.sh` to install + build before deploy.
