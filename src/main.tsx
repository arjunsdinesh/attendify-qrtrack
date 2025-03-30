
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Improved error handling and React 18 initialization
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error rendering the application:", error);
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Failed to load the application. Please check the console for details.</div>';
  }
}
