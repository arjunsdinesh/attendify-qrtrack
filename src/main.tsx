
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Use an IIFE for immediate execution with robust multi-device support
(function renderApp() {
  // Get the root element and render immediately without delay
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Failed to find the root element");
    return;
  }
  
  // Prevent clearing auth token during initialization
  try {
    const currentAuthToken = localStorage.getItem('supabase.auth.token');
    
    // Create root and render app immediately without waiting for any async operations
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Clean up stale tokens in the background AFTER rendering
    setTimeout(() => {
      try {
        // Generate a unique session ID for this tab
        const sessionId = crypto.randomUUID();
        console.log(`App initialized with session ID: ${sessionId}`);
        
        // Only clean potentially conflicting refresh tokens from other sessions
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase.auth.token') && 
              key.includes('refresh') && 
              !key.includes(sessionId) &&
              key !== 'supabase.auth.token') {
            console.log(`Cleaning up potential conflicting token: ${key}`);
            localStorage.removeItem(key);
          }
        });
        
        // Make sure we didn't accidentally remove the current token
        if (currentAuthToken) {
          localStorage.setItem('supabase.auth.token', currentAuthToken);
        }
        
        // Store the current tab's session ID in sessionStorage (not localStorage)
        sessionStorage.setItem('app_session_id', sessionId);
      } catch (e) {
        console.log("Error handling local storage, continuing anyway:", e);
      }
    }, 100);
  } catch (e) {
    console.log("Error during initialization, continuing anyway:", e);
    // Render the app even if there's an error with localStorage
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
})();

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
