import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Settings, Database } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  autoStatusUpdateEnabled: boolean;
  autoStatusUpdateInterval: number;
  autoStatusUpdateLastRun: string | null;
}

interface AutoStatusConfig {
  autoStatusUpdateEnabled: boolean;
  autoStatusUpdateInterval: number;
}

export function SuperAdminAutoStatusPanel({ companyId }: { companyId: string }) {
  const [config, setConfig] = useState<AutoStatusConfig>({
    autoStatusUpdateEnabled: false,
    autoStatusUpdateInterval: 5
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current auto status configuration
  const { data: currentConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/company/auto-status-config/${companyId}`],
    enabled: !!companyId
  });

  // Fetch service status (which companies have it enabled)
  const { data: serviceStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/superadmin/auto-status-service/status']
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: AutoStatusConfig) => {
      const response = await fetch(`/api/company/auto-status-config/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Auto status update settings have been saved."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/company/auto-status-config/${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/auto-status-service/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive"
      });
    }
  });

  // Trigger manual update mutation
  const triggerUpdateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/auto-status-service/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to trigger update');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Manual Update Triggered",
        description: `Updated appointments across ${data.results?.length || 0} companies`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/auto-status-service/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Error",
        description: error.message || "Failed to trigger manual update",
        variant: "destructive"
      });
    }
  });

  // Update local state when data loads
  useEffect(() => {
    if (currentConfig) {
      setConfig({
        autoStatusUpdateEnabled: currentConfig.autoStatusUpdateEnabled || false,
        autoStatusUpdateInterval: currentConfig.autoStatusUpdateInterval || 5
      });
    }
  }, [currentConfig]);

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(config);
  };

  const handleTriggerUpdate = () => {
    triggerUpdateMutation.mutate();
  };

  if (configLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading auto status configuration...</span>
        </CardContent>
      </Card>
    );
  }

  const enabledCompanies = serviceStatus?.companies || [];
  const isCurrentCompanyEnabled = enabledCompanies.some((c: Company) => c.id === companyId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto Status Update Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-status-enabled"
              checked={config.autoStatusUpdateEnabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, autoStatusUpdateEnabled: checked }))
              }
              data-testid="switch-auto-status-enabled"
            />
            <Label htmlFor="auto-status-enabled">
              Enable automatic status updates (scheduled → in_progress)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-interval">Update Interval (minutes)</Label>
            <Input
              id="update-interval"
              type="number"
              min="1"
              max="60"
              value={config.autoStatusUpdateInterval}
              onChange={(e) => 
                setConfig(prev => ({ ...prev, autoStatusUpdateInterval: parseInt(e.target.value) || 5 }))
              }
              className="w-32"
              data-testid="input-update-interval"
            />
            <p className="text-sm text-gray-500">
              How often to check for appointments that need status updates
            </p>
          </div>

          <Button 
            onClick={handleSaveConfig}
            disabled={updateConfigMutation.isPending}
            data-testid="button-save-config"
          >
            {updateConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Service Status & Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Service Type</p>
              <p className="text-sm text-gray-600">Database Functions</p>
            </div>
            <div>
              <p className="text-sm font-medium">Enabled Companies</p>
              <p className="text-sm text-gray-600">{serviceStatus?.enabledCompanies || 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Current Company Status</p>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs ${
              isCurrentCompanyEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isCurrentCompanyEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <Button
            onClick={handleTriggerUpdate}
            disabled={triggerUpdateMutation.isPending}
            className="w-full"
            data-testid="button-trigger-update"
          >
            {triggerUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Play className="h-4 w-4 mr-2" />
            Trigger Manual Status Update
          </Button>

          <p className="text-xs text-gray-500">
            Manually triggers the database function to update appointment statuses across all enabled companies.
            Use this for testing or immediate updates.
          </p>
        </CardContent>
      </Card>

      {enabledCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enabled Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enabledCompanies.map((company: Company) => (
                <div key={company.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-gray-500">
                      Interval: {company.autoStatusUpdateInterval} minutes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Last Run: {company.autoStatusUpdateLastRun 
                        ? new Date(company.autoStatusUpdateLastRun).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}