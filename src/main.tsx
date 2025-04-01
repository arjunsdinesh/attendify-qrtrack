
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get root element immediately without any delays
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
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
    
    console.log("React application initialized successfully");
    
    // Clean up stale sessions in the background with a much shorter timeout
    setTimeout(() => {
      try {
        const keysToPreserve = ['supabase.auth.token'];
        Object.keys(localStorage).forEach(key => {
          if (!keysToPreserve.includes(key) && key.includes('supabase.auth.') && key !== 'supabase.auth.token') {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore localStorage errors
      }
    }, 50); // Reduced from 200ms to 50ms
  } catch (error) {
    console.error("Failed to initialize React:", error);
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.textContent = 'Error loading application. Please refresh the page.';
    document.body.appendChild(errorDiv);
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
