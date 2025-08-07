import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Activity, TestTube, Clock, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DebugControls } from "@/components/DebugControls";
import { BackButton } from "@/components/BackButton";
import { Header } from "@/components/Header";
import { format } from "date-fns";

const WEBHOOK_TYPES = [
  { value: "payment_reminder", label: "Payment Reminders" },
  { value: "delivery_notification", label: "Delivery Notifications" },
  { value: "pickup_confirmation", label: "Pickup Confirmations" },
  { value: "appointment_reminder", label: "Appointment Reminders" },
  { value: "general", label: "General Notifications" }
];

interface WebhookIntegration {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  webhookType: string;
  endpointUrl: string;
  apiKey?: string;
  secretKey?: string;
  isActive: boolean;
  headers?: Record<string, string>;
  retryAttempts: number;
  timeoutMs: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookLog {
  id: string;
  webhookIntegrationId: string;
  triggerType: string;
  success: boolean;
  responseStatus?: number;
  executionTimeMs?: number;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

interface WebhookStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
}

export default function WebhookIntegrations() {
  const [selectedCompany, setSelectedCompany] = useState("vetgroom");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<WebhookIntegration | null>(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      webhookType: "",
      endpointUrl: "",
      apiKey: "",
      secretKey: "",
      isActive: true,
      retryAttempts: 3,
      timeoutMs: 30000,
      headers: "{}"
    }
  });

  // Fetch webhook integrations
  const { data: integrations = [], isLoading } = useQuery<WebhookIntegration[]>({
    queryKey: ['/api/webhook-integrations', selectedCompany],
    enabled: !!selectedCompany
  });

  // Fetch webhook stats
  const { data: stats } = useQuery<WebhookStats>({
    queryKey: ['/api/webhook-stats', selectedCompany],
    enabled: !!selectedCompany
  });

  // Fetch webhook logs for selected integration
  const { data: logs = [] } = useQuery<WebhookLog[]>({
    queryKey: ['/api/webhook-logs', selectedIntegration?.id],
    enabled: !!selectedIntegration?.id && showLogsDialog
  });

  // Create webhook integration
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/webhook-integrations/${selectedCompany}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          headers: data.headers ? JSON.parse(data.headers) : {}
        })
      });
      if (!response.ok) throw new Error('Failed to create webhook integration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-stats'] });
      toast({ title: "Webhook integration created successfully" });
      setShowCreateDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating webhook integration",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update webhook integration
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/webhook-integrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update webhook integration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      toast({ title: "Webhook integration updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating webhook integration",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete webhook integration
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhook-integrations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete webhook integration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-stats'] });
      toast({ title: "Webhook integration deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting webhook integration",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Test webhook integration
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhook-integrations/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: "Test from VetGroom Super Admin" })
      });
      if (!response.ok) throw new Error('Failed to test webhook integration');
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-logs'] });
      toast({
        title: result.success ? "Test successful" : "Test failed",
        description: `Status: ${result.status}, Time: ${result.executionTime}ms`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const toggleActive = (integration: WebhookIntegration) => {
    updateMutation.mutate({
      id: integration.id,
      data: { isActive: !integration.isActive }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              LateNode Webhook Integrations
            </h1>
            <p className="text-sm text-gray-600">
              Configure automated notifications and integrations for veterinary operations
            </p>
          </div>
        </div>
        <DebugControls />
      </Header>

      <div className="p-6 space-y-6">

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Company</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vetgroom">VetGroom</SelectItem>
              <SelectItem value="clinic1">Demo Clinic 1</SelectItem>
              <SelectItem value="clinic2">Demo Clinic 2</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Executions</p>
                  <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{stats.successfulExecutions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failedExecutions}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageResponseTime)}ms</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Webhook Integrations List */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Webhook Integrations</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-webhook">
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Webhook Integration</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-webhook-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="webhookType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-webhook-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WEBHOOK_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-webhook-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endpointUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://your-latenode-webhook.com/webhook"
                          data-testid="input-webhook-url"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Bearer token or API key"
                            data-testid="input-webhook-apikey"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Webhook validation secret"
                            data-testid="input-webhook-secret"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="retryAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Attempts</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            min="0" 
                            max="10"
                            data-testid="input-webhook-retries"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeoutMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            min="1000" 
                            max="120000"
                            data-testid="input-webhook-timeout"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Headers (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder='{"Content-Type": "application/json", "X-Custom-Header": "value"}'
                          data-testid="textarea-webhook-headers"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel-webhook"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-save-webhook"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Integration"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading webhook integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No webhook integrations configured for this company
          </div>
        ) : (
          integrations.map((integration: WebhookIntegration) => (
            <Card key={integration.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold" data-testid={`text-webhook-name-${integration.id}`}>
                      {integration.name}
                    </h3>
                    <Badge 
                      variant={integration.isActive ? "default" : "secondary"}
                      data-testid={`badge-webhook-status-${integration.id}`}
                    >
                      {integration.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-webhook-type-${integration.id}`}>
                      {WEBHOOK_TYPES.find(t => t.value === integration.webhookType)?.label || integration.webhookType}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testMutation.mutate(integration.id)}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-webhook-${integration.id}`}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setShowLogsDialog(true);
                      }}
                      data-testid={`button-logs-webhook-${integration.id}`}
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Logs
                    </Button>
                    <Button
                      size="sm"
                      variant={integration.isActive ? "destructive" : "default"}
                      onClick={() => toggleActive(integration)}
                      data-testid={`button-toggle-webhook-${integration.id}`}
                    >
                      {integration.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(integration.id)}
                      data-testid={`button-delete-webhook-${integration.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  {integration.description && (
                    <p data-testid={`text-webhook-description-${integration.id}`}>
                      {integration.description}
                    </p>
                  )}
                  <p data-testid={`text-webhook-url-${integration.id}`}>
                    <strong>Endpoint:</strong> {integration.endpointUrl}
                  </p>
                  <div className="flex space-x-4">
                    <span>
                      <strong>Timeout:</strong> {integration.timeoutMs}ms
                    </span>
                    <span>
                      <strong>Retries:</strong> {integration.retryAttempts}
                    </span>
                    {integration.lastUsed && (
                      <span data-testid={`text-webhook-lastused-${integration.id}`}>
                        <strong>Last Used:</strong> {format(new Date(integration.lastUsed), 'PPp')}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Webhook Logs - {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No execution logs found for this integration
              </div>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className={log.success ? "border-green-200" : "border-red-200"}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Success" : "Failed"}
                        </Badge>
                        <span className="text-sm font-medium">{log.triggerType}</span>
                        {log.responseStatus && (
                          <Badge variant="outline">
                            Status: {log.responseStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(log.createdAt), 'PPp')}
                        {log.executionTimeMs && ` • ${log.executionTimeMs}ms`}
                      </div>
                    </div>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 mt-2">{log.errorMessage}</p>
                    )}
                    {log.retryCount > 0 && (
                      <p className="text-sm text-yellow-600 mt-2">
                        Retry attempt: {log.retryCount}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}