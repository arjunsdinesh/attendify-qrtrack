
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Generate a unique session ID to help debug multi-device issues
const sessionId = `session_${Math.random().toString(36).substring(2, 9)}`;
console.log(`Initializing application (session: ${sessionId})`);

// Get root element immediately without any delays
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error(`Failed to find the root element (session: ${sessionId})`);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  try {
    // Create root and render immediately without any delays
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log(`React application initialized successfully (session: ${sessionId})`);
    
    // Clean up stale sessions in the background with a much shorter timeout
    // Using setTimeout to ensure it doesn't block rendering
    setTimeout(() => {
      try {
        // Multi-device safe cleanup
        const keysToPreserve = ['supabase.auth.token'];
        const currentTime = new Date().getTime();
        const cleanupId = `cleanup_${Math.random().toString(36).substring(2, 9)}`;
        
        console.log(`Starting auth cleanup (cleanup: ${cleanupId}, session: ${sessionId})`);
        
        Object.keys(localStorage).forEach(key => {
          if (!keysToPreserve.includes(key) && key.includes('supabase.auth.') && key !== 'supabase.auth.token') {
            console.log(`Removing stale auth item: ${key} (cleanup: ${cleanupId})`);
            localStorage.removeItem(key);
          }
        });
        
        console.log(`Auth cleanup completed (cleanup: ${cleanupId}, session: ${sessionId}, time: ${new Date().getTime() - currentTime}ms)`);
      } catch (e) {
        // Ignore localStorage errors
        console.warn(`Auth cleanup failed (session: ${sessionId}):`, e);
      }
    }, 50); // Reduced from 200ms to 50ms
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
