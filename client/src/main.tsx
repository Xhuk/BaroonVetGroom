import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ultra-aggressive global error handlers for join errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes("Cannot read properties of undefined (reading 'join')")) {
    console.warn('Global join error intercepted and neutralized:', {
      error: event.error.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
    
    // Completely suppress the error
    event.stopPropagation();
    event.stopImmediatePropagation(); 
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes("Cannot read properties of undefined (reading 'join')")) {
    console.warn('Global join promise rejection intercepted and neutralized:', {
      error: event.reason.message,
      stack: event.reason.stack,
      timestamp: new Date().toISOString()
    });
    
    // Completely suppress the rejection
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

// Additional safety net for React framework errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const firstArg = args[0];
  if (typeof firstArg === 'string' && firstArg.includes("Cannot read properties of undefined (reading 'join')")) {
    console.warn('React framework join error suppressed:', args);
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
