import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './components/runtime/AppErrorBoundary';
import './index.css';

// Apply persisted theme to <html> before first paint to avoid flash
try {
  const stored = JSON.parse(localStorage.getItem('copilotkit-theme') || '{}');
  const theme = stored?.state?.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
