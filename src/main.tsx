
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { generateSessionId, cleanupStaleSessions } from './utils/session-tracker';

// Make React available globally to prevent "Cannot read properties of null" errors with libraries
window.React = React;

// Generate a unique session ID for debugging
const sessionId = generateSessionId();
console.log(`Initializing application (session: ${sessionId})`);

// Initialize the app and render immediately
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error(`Failed to find the root element (session: ${sessionId})`);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  try {
    // Create root and render immediately
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log(`React application initialized successfully (session: ${sessionId})`);
    
    // Clean up stale sessions in the background
    setTimeout(() => cleanupStaleSessions(sessionId), 25);
  } catch (error) {
    console.error(`Failed to initialize React (session: ${sessionId}):`, error);
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.textContent = 'Error loading application. Please refresh the page.';
    document.body.appendChild(errorDiv);
  }
}

// Global error handler with session tracking
window.addEventListener('error', (event) => {
  console.error(`Global error caught (session: ${sessionId}):`, event.error);
});
