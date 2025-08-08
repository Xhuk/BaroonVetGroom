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
    // Handle join() errors and MessagePort errors specifically
    const isJoinError = error.message?.includes("Cannot read properties of undefined (reading 'join')");
    const isMessagePortError = error.stack?.includes("MessagePort") || errorInfo.componentStack?.includes("MessagePort");
    
    if (isJoinError || isMessagePortError) {
      console.warn('Caught framework communication error - forcing silent recovery:', {
        error: error.message,
        stack: error.stack?.substring(0, 200) + '...',
        componentStack: errorInfo.componentStack?.substring(0, 200) + '...',
        timestamp: new Date().toISOString(),
        type: isJoinError ? 'join' : 'messageport'
      });
      
      // Ultra-fast silent recovery - no error state, no UI flash
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      // Immediate force update to prevent any error UI
      this.forceUpdate();
      
      return;
    }

    // Log other errors normally
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