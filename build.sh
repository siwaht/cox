#!/bin/bash
set -e

# Install Python deps
pip install fastapi "uvicorn[standard]" copilotkit python-dotenv langchain langchain-openai langchain-core langgraph ag-ui-langgraph

# Build the frontend
cd copilotkit-frontend-creator
npm install
npm run build
