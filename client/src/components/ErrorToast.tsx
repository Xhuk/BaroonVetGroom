import { useErrorToast } from '@/hooks/useErrorToast';
import { Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorToastProps {
  error: any;
  context: string;
  onDismiss?: () => void;
}

export function ErrorToast({ error, context, onDismiss }: ErrorToastProps) {
  const { showErrorToast } = useErrorToast();

  const handleShowError = () => {
    showErrorToast({
      title: "Error detectado",
      description: `Error en ${context}`,
      context,
      error,
      additionalInfo: { 
        triggeredFrom: 'ErrorToastComponent',
        timestamp: new Date().toISOString()
      }
    });
  };

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              Error en {context}
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">
              {error?.message || 'Error desconocido'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowError}
            data-testid="button-show-error-toast"
          >
            <Copy className="w-3 h-3 mr-1" />
            Ver Debug
          </Button>
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              data-testid="button-dismiss-error"
            >
              ×
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}