#!/bin/bash
set -e

# Install Python deps
pip install fastapi uvicorn copilotkit

# Build the frontend
cd copilotkit-frontend-creator
npm install
npm run build
