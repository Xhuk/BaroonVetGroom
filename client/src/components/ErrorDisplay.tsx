import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ChevronDown, ChevronRight, AlertTriangle, Bug, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorDisplayProps {
  error: any;
  context?: string;
  timestamp?: Date;
  userId?: string;
  tenantId?: string;
  additionalInfo?: Record<string, any>;
}

export function ErrorDisplay({ 
  error, 
  context = 'Unknown', 
  timestamp = new Date(),
  userId,
  tenantId,
  additionalInfo = {}
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const errorDetails = {
    message: error?.message || 'Unknown error',
    name: error?.name || 'Error',
    stack: error?.stack || 'No stack trace available',
    code: error?.code || error?.status || 'N/A',
    timestamp: timestamp.toISOString(),
    context,
    userId: userId || 'N/A',
    tenantId: tenantId || 'N/A',
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...additionalInfo,
    ...(typeof error === 'object' ? error : {})
  };

  const copyToClipboard = async () => {
    const debugInfo = `
=== ERROR DEBUG INFORMATION ===
Timestamp: ${errorDetails.timestamp}
Context: ${errorDetails.context}
User ID: ${errorDetails.userId}
Tenant ID: ${errorDetails.tenantId}
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

    try {
      await navigator.clipboard.writeText(debugInfo);
      toast({
        title: "Información copiada",
        description: "La información de debug ha sido copiada al portapapeles",
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = debugInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Información copiada",
        description: "La información de debug ha sido copiada al portapapeles",
      });
    }
  };

  const getErrorIcon = () => {
    if (errorDetails.code >= 500) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (errorDetails.code >= 400) return <Info className="w-5 h-5 text-orange-600" />;
    return <Bug className="w-5 h-5 text-yellow-600" />;
  };

  const getErrorColor = () => {
    if (errorDetails.code >= 500) return 'destructive';
    if (errorDetails.code >= 400) return 'outline';
    return 'secondary';
  };

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getErrorIcon()}
            <span className="text-red-800 dark:text-red-200">Error en {context}</span>
            <Badge variant={getErrorColor()}>{errorDetails.code}</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
            className="text-red-700 hover:text-red-800"
            data-testid="button-copy-error"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copiar Debug
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-white dark:bg-gray-900 p-3 rounded-md border">
          <p className="text-red-800 dark:text-red-200 font-medium" data-testid="text-error-message">
            {errorDetails.message}
          </p>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2" data-testid="button-toggle-debug">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              Mostrar información de debug
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <strong>Timestamp:</strong>
                <div className="font-mono text-xs mt-1" data-testid="text-timestamp">
                  {errorDetails.timestamp}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <strong>Usuario:</strong>
                <div className="font-mono text-xs mt-1" data-testid="text-user-id">
                  {errorDetails.userId}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <strong>Tenant:</strong>
                <div className="font-mono text-xs mt-1" data-testid="text-tenant-id">
                  {errorDetails.tenantId}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <strong>URL:</strong>
                <div className="font-mono text-xs mt-1 break-all" data-testid="text-url">
                  {errorDetails.url}
                </div>
              </div>
            </div>

            {Object.keys(additionalInfo).length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <strong className="text-sm">Información adicional:</strong>
                <pre className="text-xs mt-2 whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300" data-testid="text-additional-info">
                  {JSON.stringify(additionalInfo, null, 2)}
                </pre>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <strong className="text-sm">Stack Trace:</strong>
              <pre className="text-xs mt-2 whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto" data-testid="text-stack-trace">
                {errorDetails.stack}
              </pre>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <strong className="text-sm">Objeto de Error Completo:</strong>
              <pre className="text-xs mt-2 whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto" data-testid="text-raw-error">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}