import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Layers, 
  Shield, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Info,
  ArrowUp,
  Code,
  Database,
  Globe,
  Bot
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Header } from '@/components/Header';

interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  minimumTier: string;
  enabled: boolean;
  betaFeature?: boolean;
  requiresConfiguration?: boolean;
}

interface DeploymentConfig {
  tier: string;
  version: string;
  features: Feature[];
  maxTenants?: number;
  maxStaffPerTenant?: number;
  apiRateLimit?: number;
  storageLimit?: string;
}

interface DeploymentInsights {
  currentTier: string;
  version: string;
  totalFeatures: number;
  enabledFeatures: number;
  betaFeatures: number;
  resourceUsage: {
    tenants: number;
    maxTenants: string | number;
    utilizationPercentage: number;
  };
  recommendations: string[];
  featuresByCategory: Record<string, Feature[]>;
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'core_admin': Shield,
    'billing_management': TrendingUp,
    'advanced_analytics': Layers,
    'ai_integrations': Bot,
    'mobile_management': Globe,
    'api_management': Code,
    'webhook_monitoring': Settings,
    'load_testing': Zap,
    'data_exports': Database,
    'custom_integrations': Settings
  };
  return iconMap[category] || Info;
};

const getTierColor = (tier: string) => {
  const colorMap: Record<string, string> = {
    'basic': 'bg-gray-500',
    'professional': 'bg-blue-500',
    'enterprise': 'bg-purple-500',
    'development': 'bg-green-500'
  };
  return colorMap[tier] || 'bg-gray-500';
};

const getTierLabel = (tier: string) => {
  const labelMap: Record<string, string> = {
    'basic': 'Basic',
    'professional': 'Professional',
    'enterprise': 'Enterprise',
    'development': 'Development'
  };
  return labelMap[tier] || tier;
};

export function VersionedSuperAdminDashboard() {
  const [selectedTier, setSelectedTier] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch deployment configuration
  const { data: deploymentData, isLoading: configLoading } = useQuery({
    queryKey: ['/api/superadmin/deployment-config'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch deployment insights
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/superadmin/deployment-insights'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const config: DeploymentConfig | undefined = deploymentData?.config;
  const insights: DeploymentInsights | undefined = insightsData?.insights;

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tier: string) => {
      return apiRequest(`/api/superadmin/deployment-tier`, {
        method: 'PATCH',
        body: { tier }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/deployment-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/deployment-insights'] });
    }
  });

  useEffect(() => {
    if (config && !selectedTier) {
      setSelectedTier(config.tier);
    }
  }, [config, selectedTier]);

  const handleTierChange = async () => {
    if (selectedTier && selectedTier !== config?.tier) {
      await updateTierMutation.mutateAsync(selectedTier);
    }
  };

  if (configLoading || insightsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployment Configuration</h1>
          <p className="text-gray-600">Manage feature availability and deployment tiers</p>
        </div>
        <Badge className={`${getTierColor(config?.tier || '')} text-white`}>
          {getTierLabel(config?.tier || '')} v{config?.version}
        </Badge>
      </div>

      {/* Deployment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{insights?.totalFeatures || 0}</div>
            <p className="text-xs text-gray-500">Available in current tier</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Enabled Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{insights?.enabledFeatures || 0}</div>
            <p className="text-xs text-gray-500">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Beta Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{insights?.betaFeatures || 0}</div>
            <p className="text-xs text-gray-500">Experimental features</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {insights?.resourceUsage.utilizationPercentage || 0}%
            </div>
            <p className="text-xs text-gray-500">
              {insights?.resourceUsage.tenants || 0} / {insights?.resourceUsage.maxTenants} tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Management */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <ArrowUp className="h-5 w-5" />
            Deployment Tier Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Current Tier:</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
            >
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
              <option value="development">Development</option>
            </select>
            <Button
              onClick={handleTierChange}
              disabled={selectedTier === config?.tier || updateTierMutation.isPending}
              size="sm"
            >
              {updateTierMutation.isPending ? 'Updating...' : 'Update Tier'}
            </Button>
          </div>

          {insights?.recommendations && insights.recommendations.length > 0 && (
            <div className="border border-yellow-500 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Upgrade Recommendations</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                {insights.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights?.featuresByCategory && Object.entries(insights.featuresByCategory).map(([category, features]) => {
          const IconComponent = getCategoryIcon(category);
          return (
            <Card key={category} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <IconComponent className="h-5 w-5" />
                  {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features.map((feature) => (
                    <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{feature.name}</span>
                          {feature.betaFeature && (
                            <Badge variant="secondary" className="text-xs bg-yellow-600 text-white">
                              Beta
                            </Badge>
                          )}
                          {feature.requiresConfiguration && (
                            <Badge variant="secondary" className="text-xs bg-blue-600 text-white">
                              Config Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{feature.description}</p>
                      </div>
                      <Switch
                        checked={feature.enabled}
                        disabled={true} // Features are managed by tier, not individually
                        className="ml-4"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Limits */}
      {config && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              Current Tier Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-lg font-bold text-white">
                  {config.maxTenants === -1 ? '∞' : config.maxTenants}
                </div>
                <div className="text-xs text-gray-400">Max Tenants</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-lg font-bold text-white">
                  {config.maxStaffPerTenant === -1 ? '∞' : config.maxStaffPerTenant}
                </div>
                <div className="text-xs text-gray-400">Staff per Tenant</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-lg font-bold text-white">
                  {config.apiRateLimit?.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">API Rate Limit</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-lg font-bold text-white">{config.storageLimit}</div>
                <div className="text-xs text-gray-400">Storage Limit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </main>
    </div>
  );
}