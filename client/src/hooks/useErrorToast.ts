import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ErrorToastOptions {
  title?: string;
  description?: string;
  context: string;
  error: any;
  additionalInfo?: Record<string, any>;
}

export function useErrorToast() {
  const { toast } = useToast();
  const { user } = useAuth();

  const showErrorToast = ({ 
    title = "Error", 
    description = "Ha ocurrido un error", 
    context, 
    error, 
    additionalInfo = {} 
  }: ErrorToastOptions) => {
    
    const errorDetails = {
      message: error?.message || 'Unknown error',
      name: error?.name || 'Error',
      stack: error?.stack || 'No stack trace available',
      code: error?.code || error?.status || 'N/A',
      timestamp: new Date().toISOString(),
      context,
      userId: user?.id || 'anonymous',
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...additionalInfo,
      ...(typeof error === 'object' ? error : {})
    };

    // Auto-copy debug info to clipboard
    const debugInfo = `
=== ERROR DEBUG INFORMATION ===
Timestamp: ${errorDetails.timestamp}
Context: ${errorDetails.context}
User ID: ${errorDetails.userId}
URL: ${errorDetails.url}
User Agent: ${errorDetails.userAgent}

Error Details:
- Name: ${errorDetails.name}
- Message: ${errorDetails.message}
- Code: ${errorDetails.code}

Stack Trace:
${errorDetails.stack}

Additional Information:
${Object.entries(additionalInfo || {}).map(([key, value]) => 
  `- ${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`
).join('\n')}

Raw Error Object:
${JSON.stringify(error, null, 2)}
=== END DEBUG INFORMATION ===
    `.trim();

    // Auto-copy to clipboard
    try {
      navigator.clipboard.writeText(debugInfo);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = debugInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    toast({
      variant: "destructive",
      title,
      description: `${description} - Debug info copiada al portapapeles`,
      duration: 8000, // Longer duration for error messages
    });

    // Also log to console for development
    console.group(`🐛 Error Toast: ${context}`);
    console.error('Error:', error);
    console.log('Error Details:', errorDetails);
    console.groupEnd();
  };

  return { showErrorToast };
}