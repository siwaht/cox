#!/bin/bash
set -euo pipefail

echo "=== Installing Python dependencies ==="
pip install --quiet \
  fastapi \
  "uvicorn[standard]" \
  copilotkit \
  python-dotenv \
  langchain \
  langchain-openai \
  langchain-core \
  langgraph \
  langgraph-checkpoint \
  ag-ui-langgraph

echo "=== Building frontend ==="
cd copilotkit-frontend-creator
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

echo "=== Build complete ==="
