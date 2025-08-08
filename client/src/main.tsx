import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to catch and gracefully handle join errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes("Cannot read properties of undefined (reading 'join')")) {
    console.warn('Global join error caught and handled:', {
      error: event.error.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
    
    // Prevent the error from propagating and breaking the app
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes("Cannot read properties of undefined (reading 'join')")) {
    console.warn('Global join promise rejection caught and handled:', {
      error: event.reason.message,
      stack: event.reason.stack,
      timestamp: new Date().toISOString()
    });
    
    // Prevent the unhandled rejection from crashing the app
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
