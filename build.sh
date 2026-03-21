#!/bin/bash
set -euo pipefail

echo "=== Installing Python dependencies ==="
pip install --quiet --upgrade \
  "fastapi>=0.115.0,<1.0.0" \
  "uvicorn[standard]" \
  "copilotkit>=0.1.81" \
  python-dotenv \
  "langchain==1.2.10" \
  "langchain-openai>=1.1.11" \
  "langchain-core>=1.2.10,<1.3.0" \
  "langgraph>=1.0.10,<1.1.0" \
  "langgraph-checkpoint>=4.0.1" \
  "ag-ui-langgraph[fastapi]>=0.0.27" \
  "ag-ui-protocol>=0.1.14" \
  "deepagents>=0.3.12,<0.4.0" \
  "starlette>=0.52.1"

echo "=== Building frontend ==="
cd copilotkit-frontend-creator
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

echo "=== Build complete ==="
