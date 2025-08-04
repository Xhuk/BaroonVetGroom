import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Activity, 
  Clock, 
  RefreshCw,
  Settings,
  TrendingUp
} from "lucide-react";

interface WebhookStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByTenant: Record<string, number>;
  recentErrors: any[];
  activeFailures: number;
  resolvedErrors: number;
}

interface WebhookErrorLog {
  id: string;
  tenantId: string;
  webhookType: string;
  endpoint: string;
  errorMessage: string;
  errorCode: string;
  httpStatus: number;
  status: string;
  createdAt: string;
  retryCount: number;
}

interface WebhookMonitoring {
  id: string;
  tenantId: string;
  webhookType: string;
  endpoint: string;
  status: string;
  lastSuccessAt: string;
  lastFailureAt: string;
  consecutiveFailures: number;
  isAutoRetryEnabled: boolean;
  retryIntervalMinutes: number;
  maxRetryIntervalMinutes: number;
  nextRetryAt: string;
}

export default function SuperAdminMonitoring() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  const { data: stats, isLoading: statsLoading } = useQuery<WebhookStats>({
    queryKey: ["/api/superadmin/webhook-stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: errorLogs, isLoading: logsLoading } = useQuery<WebhookErrorLog[]>({
    queryKey: ["/api/superadmin/webhook-errors", selectedTenant],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: monitoring, isLoading: monitoringLoading } = useQuery<WebhookMonitoring[]>({
    queryKey: ["/api/superadmin/webhook-monitoring", selectedTenant],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const resolveErrorMutation = useMutation({
    mutationFn: async (logId: string) => {
      return apiRequest('POST', `/api/superadmin/webhook-retry/${logId}`);
    },
    onSuccess: () => {
      toast({
        title: "Error Resolved",
        description: "Webhook error has been marked as resolved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve error",
        variant: "destructive",
      });
    },
  });

  const updateMonitoringMutation = useMutation({
    mutationFn: async ({ tenantId, webhookType, config }: any) => {
      return apiRequest('PUT', `/api/superadmin/webhook-monitoring/${tenantId}/${webhookType}`, config);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Webhook monitoring settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/webhook-monitoring"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800 border-green-200";
      case "degraded": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "down": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "degraded": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "down": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-800">Super Admin - Webhook Monitoring</h1>
          <p className="text-gray-600">Monitor and manage webhook integrations across all tenants</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/superadmin"] })}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats?.totalErrors || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Failures</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.activeFailures || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats?.resolvedErrors || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats ? Math.round(((stats.resolvedErrors / (stats.totalErrors || 1)) * 100)) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Webhook Status Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monitoringLoading ? (
                <div className="text-center py-8">Loading monitoring data...</div>
              ) : (
                <div className="space-y-4">
                  {monitoring?.map((webhook) => (
                    <div key={`${webhook.tenantId}-${webhook.webhookType}`} 
                         className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(webhook.status)}
                            <div>
                              <h3 className="font-medium">
                                {webhook.webhookType.toUpperCase()} - {webhook.tenantId}
                              </h3>
                              <p className="text-sm text-gray-600">{webhook.endpoint}</p>
                            </div>
                            <Badge className={getStatusColor(webhook.status)}>
                              {webhook.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Last Success:</span>
                              <p>{webhook.lastSuccessAt ? new Date(webhook.lastSuccessAt).toLocaleString() : 'Never'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Last Failure:</span>
                              <p>{webhook.lastFailureAt ? new Date(webhook.lastFailureAt).toLocaleString() : 'None'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Consecutive Failures:</span>
                              <p>{webhook.consecutiveFailures}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Next Retry:</span>
                              <p>{webhook.nextRetryAt ? new Date(webhook.nextRetryAt).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {monitoring?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No webhook monitoring data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Webhook Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading error logs...</div>
              ) : (
                <div className="space-y-4">
                  {errorLogs?.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="destructive">{log.webhookType}</Badge>
                            <Badge variant="outline">{log.tenantId}</Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium mb-1">{log.errorMessage}</p>
                          <p className="text-xs text-gray-600">
                            Endpoint: {log.endpoint} | Status: {log.httpStatus} | Code: {log.errorCode}
                          </p>
                          
                          {log.retryCount > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Retried {log.retryCount} times
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge className={log.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {log.status}
                          </Badge>
                          
                          {log.status !== 'resolved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => resolveErrorMutation.mutate(log.id)}
                              disabled={resolveErrorMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {errorLogs?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No error logs found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {monitoring?.map((webhook) => (
                  <div key={`${webhook.tenantId}-${webhook.webhookType}`} 
                       className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">
                      {webhook.webhookType.toUpperCase()} - {webhook.tenantId}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={webhook.isAutoRetryEnabled}
                          onCheckedChange={(enabled) => {
                            updateMonitoringMutation.mutate({
                              tenantId: webhook.tenantId,
                              webhookType: webhook.webhookType,
                              config: {
                                isAutoRetryEnabled: enabled,
                                retryIntervalMinutes: webhook.retryIntervalMinutes,
                                maxRetryIntervalMinutes: webhook.maxRetryIntervalMinutes
                              }
                            });
                          }}
                        />
                        <Label>Auto Retry Enabled</Label>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Retry Interval (minutes)</Label>
                        <Input 
                          type="number" 
                          value={webhook.retryIntervalMinutes}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0) {
                              updateMonitoringMutation.mutate({
                                tenantId: webhook.tenantId,
                                webhookType: webhook.webhookType,
                                config: {
                                  isAutoRetryEnabled: webhook.isAutoRetryEnabled,
                                  retryIntervalMinutes: value,
                                  maxRetryIntervalMinutes: webhook.maxRetryIntervalMinutes
                                }
                              });
                            }
                          }}
                          min="1"
                          max="60"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Max Retry Interval (minutes)</Label>
                        <Input 
                          type="number" 
                          value={webhook.maxRetryIntervalMinutes}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0) {
                              updateMonitoringMutation.mutate({
                                tenantId: webhook.tenantId,
                                webhookType: webhook.webhookType,
                                config: {
                                  isAutoRetryEnabled: webhook.isAutoRetryEnabled,
                                  retryIntervalMinutes: webhook.retryIntervalMinutes,
                                  maxRetryIntervalMinutes: value
                                }
                              });
                            }
                          }}
                          min="1"
                          max="1440"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {monitoring?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No webhook configurations found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}