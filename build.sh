#!/bin/bash
set -euo pipefail

echo "=== Installing Python dependencies ==="
pip install --quiet --upgrade \
  "deepagents>=0.5.7" \
  "copilotkit>=0.1.88" \
  "ag-ui-langgraph[fastapi]>=0.0.35" \
  "ag-ui-protocol>=0.1.18" \
  "langchain>=1.2.0" \
  "langchain-core>=1.3.2" \
  "langchain-openai>=1.1.0" \
  "langgraph>=1.0.0" \
  "langgraph-checkpoint>=4.0.0" \
  "fastapi>=0.115.0" \
  "uvicorn[standard]>=0.30.0" \
  python-dotenv

echo "=== Building frontend ==="
cd copilotkit-frontend-creator
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

echo "=== Build complete ==="
