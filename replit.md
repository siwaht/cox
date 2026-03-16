# CopilotKit Frontend Creator

## Overview
A React + Vite single-page application that provides a visual workspace for building frontend UIs with CopilotKit AI integration. Users can drag, drop, and arrange blocks in an editor view, then preview and share their workspace via URL.

## Project Structure
- `copilotkit-frontend-creator/` — Main frontend app
  - `src/App.tsx` — Root component, handles editor/preview/published modes
  - `src/components/` — UI components (editor, preview, layout)
  - `src/store/` — Zustand state management stores
  - `src/utils/` — Utilities (URL sharing, etc.)
  - `vite.config.ts` — Vite config (port 5000, host 0.0.0.0, all hosts allowed)

## Tech Stack
- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 6
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Drag & Drop:** @dnd-kit
- **AI:** @copilotkit/react-core, @copilotkit/react-ui, @copilotkit/runtime
- **Package manager:** npm

## Running the App
The workflow `Start application` runs:
```
cd copilotkit-frontend-creator && npm run dev
```
This serves the app on port 5000.

## Deployment
Configured as a **static** deployment:
- Build: `cd copilotkit-frontend-creator && npm run build`
- Public dir: `copilotkit-frontend-creator/dist`

## Notes
- No backend in this project; CopilotKit API calls are proxied to `localhost:4000` (external backend expected if AI features are used)
- The app supports URL-based workspace sharing via encoded state in the URL
