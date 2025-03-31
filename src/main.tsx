
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get the root element immediately
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
} else {
  // Create root and render app immediately without any delays
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Handle potential localStorage cleanup in the background
  setTimeout(() => {
    try {
      // Clean up obviously stale auth tokens to prevent conflicts
      const sessionId = crypto.randomUUID();
      console.log(`App initialized with session ID: ${sessionId}`);
      
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase.auth.token') && 
            key.includes('refresh') && 
            key !== 'supabase.auth.token') {
          console.log(`Cleaning up potential conflicting token: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      // Store the current tab's session ID in sessionStorage
      sessionStorage.setItem('app_session_id', sessionId);
    } catch (e) {
      console.log("Error handling local storage, continuing anyway:", e);
    }
  }, 100);
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
