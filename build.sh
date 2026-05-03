#!/bin/bash
set -euo pipefail

echo "=== Installing Python dependencies ==="
pip install --quiet --upgrade \
  "fastapi>=0.115.0,<1.0.0" \
  "uvicorn[standard]" \
  "copilotkit>=0.1.81" \
  python-dotenv \
  "langchain>=1.2.0" \
  "langchain-openai>=1.1.11" \
  "langchain-core>=1.2.0" \
  "langgraph>=1.0.10" \
  "langgraph-checkpoint>=2.0.0" \
  "ag-ui-langgraph[fastapi]>=0.0.27" \
  "deepagents>=0.4.11"

echo "=== Building frontend ==="
cd copilotkit-frontend-creator
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

echo "=== Build complete ==="
