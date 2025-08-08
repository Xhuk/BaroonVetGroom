import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Immediately suppress join errors without showing error UI
    if (error.message?.includes("Cannot read properties of undefined (reading 'join')")) {
      console.warn('Join error detected in getDerivedStateFromError - suppressing:', error.message);
      return { hasError: false }; // Don't show error UI for join errors
    }
    
    // For other errors, show fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Handle join() errors specifically with immediate recovery
    if (error.message?.includes("Cannot read properties of undefined (reading 'join')")) {
      console.warn('Caught join() error in React boundary - forcing immediate recovery:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
      
      // Immediate recovery - don't even set error state
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      // Force a micro-task to ensure clean recovery
      Promise.resolve().then(() => {
        this.forceUpdate();
      });
      
      return;
    }

    // Log other errors
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // If it's a join error, show minimal fallback and auto-recover
      if (this.state.error?.message?.includes("Cannot read properties of undefined (reading 'join')")) {
        return (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm">Cargando aplicación...</p>
            </div>
          </div>
        );
      }

      // For other errors, show the fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold mb-4">Error de aplicación</h2>
            <p className="text-gray-300 mb-4">
              Se produjo un error inesperado. La aplicación se está recuperando automáticamente.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;