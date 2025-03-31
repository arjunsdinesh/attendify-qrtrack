
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enhanced error handling and React 18 initialization
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize application. The root element was not found.</div>';
} else {
  try {
    // Force render regardless of potential errors
    const root = createRoot(rootElement);
    
    // Add global error boundary that helps recover from rendering errors
    const ErrorFallback = () => (
      <div className="p-4">
        <h2 className="text-xl font-bold text-red-600 mb-2">Application Error</h2>
        <p className="mb-4">Something went wrong. Please try refreshing the page.</p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" 
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
    
    // Set a timeout to force render even if resources are slow to load
    const renderTimeoutId = setTimeout(() => {
      try {
        console.log("Force rendering due to timeout");
        root.render(<App />);
      } catch (e) {
        console.error("Error during forced render:", e);
        root.render(<ErrorFallback />);
      }
    }, 3000);
    
    // Try standard rendering first
    root.render(<App />);
    clearTimeout(renderTimeoutId);
    
    // Log after rendering has started
    setTimeout(() => {
      console.log("React application initialized successfully");
    }, 0);
  } catch (error) {
    console.error("Error rendering the application:", error);
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Failed to load the application. Please check the console for details.</div>';
  }
}
