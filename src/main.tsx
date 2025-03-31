
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get the root element and render immediately
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  // Create root and render without any delays or checks
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log("React application initialized");
}

// Global error handler that doesn't interfere with rendering
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
