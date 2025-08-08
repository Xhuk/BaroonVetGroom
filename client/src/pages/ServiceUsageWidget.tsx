import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface UsageSummary {
  used: number;
  limit: number;
  percentage: number;
}

interface ServiceUsageWidgetProps {
  serviceId: string;
  serviceName: string;
}

function ServiceUsageWidget({ serviceId, serviceName }: ServiceUsageWidgetProps) {
  const { currentTenant } = useTenant();
  
  const { data: usageSummary, isLoading } = useQuery<UsageSummary>({
    queryKey: ['/api/store/usage-summary', currentTenant?.id, serviceId],
    enabled: !!currentTenant?.id && !!serviceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !usageSummary) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { used, limit, percentage } = usageSummary || { used: 0, limit: 0, percentage: 0 };
  const isNearLimit = percentage >= 85;
  const isOverLimit = percentage >= 100;

  const getStatusColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (isOverLimit) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (isNearLimit) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{serviceName}</CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={isOverLimit ? "destructive" : isNearLimit ? "default" : "secondary"}>
              {percentage.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>{used.toLocaleString()} usado</span>
            <span>{limit.toLocaleString()} límite</span>
          </div>
        </div>
        
        {isOverLimit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium">Servicio desactivado - Límite alcanzado</span>
            </div>
          </div>
        )}
        
        {isNearLimit && !isOverLimit && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium">Cerca del límite - Considera renovar</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceUsageWidget;