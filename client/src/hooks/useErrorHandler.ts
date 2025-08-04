import { useCallback } from 'react';
import { useAuth } from './useAuth';

interface ErrorContext {
  context: string;
  additionalInfo?: Record<string, any>;
  showToast?: boolean;
}

export function useErrorHandler() {
  const { user } = useAuth();

  const handleError = useCallback((error: any, errorContext: ErrorContext) => {
    const errorInfo = {
      error,
      context: errorContext.context,
      timestamp: new Date(),
      userId: user?.id || 'anonymous',
      tenantId: 'no-tenant', // Will be enhanced later with tenant context
      additionalInfo: {
        ...errorContext.additionalInfo,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
        },
        pageInfo: {
          url: window.location.href,
          referrer: document.referrer,
          title: document.title,
        },
        sessionInfo: {
          sessionStorage: Object.keys(sessionStorage).length,
          localStorage: Object.keys(localStorage).length,
        }
      }
    };

    // Log to console for development
    console.group(`🐛 Error in ${errorContext.context}`);
    console.error('Error:', error);
    console.log('Context:', errorInfo);
    console.groupEnd();

    // Send to server for logging (optional)
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      }).catch(logError => {
        console.warn('Failed to log error to server:', logError);
      });
    }

    return errorInfo;
  }, [user]);

  return { handleError };
}