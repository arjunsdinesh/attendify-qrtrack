import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Immediate rendering function to ensure the app loads quickly
(function renderApp() {
  // Get the root element and render immediately
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Failed to find the root element");
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
    return;
  }
  
  // Create root and render without any delays or checks
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log("React application initialized");
  } catch (error) {
    console.error("Failed to initialize React:", error);
    // Show error but keep original HTML spinner visible
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.textContent = 'Error loading application. Please refresh the page.';
    document.body.appendChild(errorDiv);
  }
})();

// Global error handler that doesn't interfere with rendering
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
