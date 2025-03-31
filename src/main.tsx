
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get the root element immediately
const rootElement = document.getElementById("root");

// Initialize the app as quickly as possible
if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  try {
    // Create root and render immediately without any delays
    const root = createRoot(rootElement);
    root.render(<App />);
    
    // Simple error handler that doesn't block rendering
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // Don't prevent default to allow the app to continue running
    });
    
    console.log("React application initialized");
  } catch (error) {
    console.error("Error rendering the application:", error);
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Failed to load the application. Please check the console for details.</div>';
  }
}
