import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface SubscriptionStatusProps {
  companyId: string;
  className?: string;
}

interface SubscriptionInfo {
  status: string;
  hasSubscription: boolean;
  plan?: string;
  daysRemaining?: number;
  expiresAt?: string;
  vetsitesUsed?: number;
  vetsitesAllowed?: number;
  isExpired?: boolean;
  isNearExpiry?: boolean;
}

export function SubscriptionStatus({ companyId, className }: SubscriptionStatusProps) {
  const { data: subscription, isLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/subscription/status', companyId],
    enabled: !!companyId
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription?.hasSubscription) {
    return (
      <Card className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            No Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-red-600 dark:text-red-300 mb-3">
            A subscription is required to access this VetSite.
          </p>
          <Button size="sm" variant="destructive" className="w-full">
            Contact Support
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (subscription.isExpired) return "bg-red-500";
    if (subscription.isNearExpiry) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusIcon = () => {
    if (subscription.isExpired) return <XCircle className="h-4 w-4" />;
    if (subscription.isNearExpiry) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (subscription.isExpired) return "Expired";
    if (subscription.isNearExpiry) return "Expiring Soon";
    return "Active";
  };

  const getBorderColor = () => {
    if (subscription.isExpired) return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
    if (subscription.isNearExpiry) return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20";
    return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20";
  };

  return (
    <Card className={`${getBorderColor()} ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon()}
            Subscription Status
          </span>
          <Badge variant="secondary" className={`${getStatusColor()} text-white`}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600 dark:text-gray-400">Plan:</span>
          <span className="font-medium">{subscription.plan}</span>
        </div>
        
        {subscription.daysRemaining !== undefined && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">Days Left:</span>
            <span className={`font-medium flex items-center gap-1 ${
              subscription.isExpired ? 'text-red-600 dark:text-red-400' :
              subscription.isNearExpiry ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            }`}>
              <Clock className="h-3 w-3" />
              {subscription.daysRemaining > 0 ? subscription.daysRemaining : 'Expired'}
            </span>
          </div>
        )}
        
        {subscription.vetsitesAllowed && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">VetSites:</span>
            <span className="font-medium">
              {subscription.vetsitesUsed}/{subscription.vetsitesAllowed}
            </span>
          </div>
        )}
        
        {subscription.expiresAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t">
            Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
          </div>
        )}
        
        {(subscription.isExpired || subscription.isNearExpiry) && (
          <Button 
            size="sm" 
            variant={subscription.isExpired ? "destructive" : "default"}
            className="w-full mt-2"
          >
            {subscription.isExpired ? "Renew Now" : "Extend Subscription"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}