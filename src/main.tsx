
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Use an IIFE for immediate execution with robust multi-device support
(function renderApp() {
  // Create a unique session identifier for this browser tab
  const sessionId = crypto.randomUUID();
  console.log(`Initializing app with session ID: ${sessionId}`);
  
  // Get the root element and render immediately
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Failed to find the root element");
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
    return;
  }
  
  // Handle local storage to prevent cross-device conflicts while preserving authentication
  try {
    // Preserve the current authentication token
    const currentAuthToken = localStorage.getItem('supabase.auth.token');
    
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
  } catch (e) {
    console.log("Error handling local storage, continuing anyway:", e);
  }
  
  // Create root and render app immediately without waiting for any async operations
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log(`React application initialized with session ID: ${sessionId}`);
  
  // Store the current tab's session ID in sessionStorage (not localStorage)
  sessionStorage.setItem('app_session_id', sessionId);
})();

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
