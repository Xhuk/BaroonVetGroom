// Deployment Feature Management System
// Manages feature availability across different deployment versions

export type DeploymentTier = 'basic' | 'professional' | 'enterprise' | 'development';

export type FeatureCategory = 
  | 'core_admin'
  | 'billing_management'
  | 'advanced_analytics'
  | 'ai_integrations'
  | 'mobile_management'
  | 'api_management'
  | 'webhook_monitoring'
  | 'load_testing'
  | 'data_exports'
  | 'custom_integrations';

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  minimumTier: DeploymentTier;
  enabled: boolean;
  betaFeature?: boolean;
  requiresConfiguration?: boolean;
}

export interface DeploymentConfig {
  tier: DeploymentTier;
  version: string;
  features: Feature[];
  maxTenants?: number;
  maxStaffPerTenant?: number;
  apiRateLimit?: number;
  storageLimit?: string;
}

// Feature definitions organized by category
export const FEATURE_DEFINITIONS: Record<string, Feature> = {
  // Core Admin Features (Available in all tiers)
  'dashboard_overview': {
    id: 'dashboard_overview',
    name: 'Dashboard Overview',
    description: 'Basic dashboard statistics and company overview',
    category: 'core_admin',
    minimumTier: 'basic',
    enabled: true
  },
  'tenant_management': {
    id: 'tenant_management',
    name: 'Tenant Management',
    description: 'Manage companies and basic tenant operations',
    category: 'core_admin',
    minimumTier: 'basic',
    enabled: true
  },
  'demo_data_seeding': {
    id: 'demo_data_seeding',
    name: 'Demo Data Seeding',
    description: 'Seed demonstration data for new deployments',
    category: 'core_admin',
    minimumTier: 'basic',
    enabled: true
  },

  // Billing Management (Professional+)
  'billing_overview': {
    id: 'billing_overview',
    name: 'Billing Overview',
    description: 'Monitor deployment costs and usage statistics',
    category: 'billing_management',
    minimumTier: 'professional',
    enabled: true
  },
  'credit_management': {
    id: 'credit_management',
    name: 'Credit Management',
    description: 'Add credits and manage billing settings',
    category: 'billing_management',
    minimumTier: 'professional',
    enabled: true
  },
  'usage_alerts': {
    id: 'usage_alerts',
    name: 'Usage Alerts',
    description: 'Automated alerts for billing thresholds',
    category: 'billing_management',
    minimumTier: 'professional',
    enabled: true
  },

  // Advanced Analytics (Enterprise)
  'performance_monitoring': {
    id: 'performance_monitoring',
    name: 'Performance Monitoring',
    description: 'Advanced performance metrics and bottleneck analysis',
    category: 'advanced_analytics',
    minimumTier: 'enterprise',
    enabled: true
  },
  'predictive_analytics': {
    id: 'predictive_analytics',
    name: 'Predictive Analytics',
    description: 'AI-powered growth predictions and capacity planning',
    category: 'advanced_analytics',
    minimumTier: 'enterprise',
    enabled: true,
    betaFeature: true
  },
  'custom_reporting': {
    id: 'custom_reporting',
    name: 'Custom Reporting',
    description: 'Generate custom reports and data exports',
    category: 'advanced_analytics',
    minimumTier: 'enterprise',
    enabled: true
  },

  // AI Integrations (Enterprise)
  'ai_inventory_processor': {
    id: 'ai_inventory_processor',
    name: 'AI Inventory Processing',
    description: 'Automated inventory management using AI',
    category: 'ai_integrations',
    minimumTier: 'enterprise',
    enabled: true,
    requiresConfiguration: true
  },
  'intelligent_scheduling': {
    id: 'intelligent_scheduling',
    name: 'Intelligent Scheduling',
    description: 'AI-powered appointment optimization',
    category: 'ai_integrations',
    minimumTier: 'enterprise',
    enabled: true,
    betaFeature: true
  },

  // Mobile Management (Professional+)
  'mobile_onboarding': {
    id: 'mobile_onboarding',
    name: 'Mobile Client Onboarding',
    description: 'On-the-go client setup and management',
    category: 'mobile_management',
    minimumTier: 'professional',
    enabled: true
  },
  'mobile_analytics': {
    id: 'mobile_analytics',
    name: 'Mobile Analytics Dashboard',
    description: 'Mobile-optimized analytics and monitoring',
    category: 'mobile_management',
    minimumTier: 'professional',
    enabled: true
  },

  // API Management (Enterprise)
  'api_rate_monitoring': {
    id: 'api_rate_monitoring',
    name: 'API Rate Monitoring',
    description: 'Monitor and control API usage rates',
    category: 'api_management',
    minimumTier: 'enterprise',
    enabled: true
  },
  'webhook_management': {
    id: 'webhook_management',
    name: 'Webhook Management',
    description: 'Advanced webhook monitoring and error handling',
    category: 'webhook_monitoring',
    minimumTier: 'professional',
    enabled: true
  },

  // Load Testing (Development/Enterprise)
  'load_testing': {
    id: 'load_testing',
    name: 'Load Testing Suite',
    description: 'Simulate high-load scenarios for performance testing',
    category: 'load_testing',
    minimumTier: 'development',
    enabled: true
  },
  'scalability_demo': {
    id: 'scalability_demo',
    name: 'Scalability Demonstration',
    description: 'Demonstrate system scalability capabilities',
    category: 'load_testing',
    minimumTier: 'development',
    enabled: true
  },

  // Data Exports (Professional+)
  'bulk_data_export': {
    id: 'bulk_data_export',
    name: 'Bulk Data Export',
    description: 'Export large datasets for analysis or migration',
    category: 'data_exports',
    minimumTier: 'professional',
    enabled: true
  },
  'automated_backups': {
    id: 'automated_backups',
    name: 'Automated Backups',
    description: 'Scheduled automatic data backups',
    category: 'data_exports',
    minimumTier: 'professional',
    enabled: true
  },

  // Custom Integrations (Enterprise)
  'third_party_apis': {
    id: 'third_party_apis',
    name: 'Third-party API Integrations',
    description: 'Connect with external veterinary systems',
    category: 'custom_integrations',
    minimumTier: 'enterprise',
    enabled: true,
    requiresConfiguration: true
  }
};

// Deployment tier configurations
export const DEPLOYMENT_CONFIGS: Record<DeploymentTier, DeploymentConfig> = {
  'basic': {
    tier: 'basic',
    version: '1.0.0',
    features: Object.values(FEATURE_DEFINITIONS).filter(f => f.minimumTier === 'basic'),
    maxTenants: 5,
    maxStaffPerTenant: 10,
    apiRateLimit: 1000,
    storageLimit: '10GB'
  },
  'professional': {
    tier: 'professional',
    version: '2.0.0',
    features: Object.values(FEATURE_DEFINITIONS).filter(f => 
      f.minimumTier === 'basic' || f.minimumTier === 'professional'
    ),
    maxTenants: 25,
    maxStaffPerTenant: 50,
    apiRateLimit: 5000,
    storageLimit: '100GB'
  },
  'enterprise': {
    tier: 'enterprise',
    version: '3.0.0',
    features: Object.values(FEATURE_DEFINITIONS).filter(f => 
      f.minimumTier === 'basic' || f.minimumTier === 'professional' || f.minimumTier === 'enterprise'
    ),
    maxTenants: -1, // Unlimited
    maxStaffPerTenant: -1, // Unlimited
    apiRateLimit: 50000,
    storageLimit: '1TB'
  },
  'development': {
    tier: 'development',
    version: '4.0.0-dev',
    features: Object.values(FEATURE_DEFINITIONS), // All features available
    maxTenants: -1,
    maxStaffPerTenant: -1,
    apiRateLimit: 100000,
    storageLimit: 'unlimited'
  }
};

// Utility functions for feature management
export class FeatureManager {
  private currentTier: DeploymentTier;
  private currentConfig: DeploymentConfig;

  constructor(tier: DeploymentTier = 'development') {
    this.currentTier = tier;
    this.currentConfig = DEPLOYMENT_CONFIGS[tier];
  }

  isFeatureEnabled(featureId: string): boolean {
    return this.currentConfig.features.some(f => f.id === featureId && f.enabled);
  }

  getFeaturesByCategory(category: FeatureCategory): Feature[] {
    return this.currentConfig.features.filter(f => f.category === category);
  }

  getAvailableFeatures(): Feature[] {
    return this.currentConfig.features.filter(f => f.enabled);
  }

  getBetaFeatures(): Feature[] {
    return this.currentConfig.features.filter(f => f.betaFeature && f.enabled);
  }

  getFeaturesRequiringConfiguration(): Feature[] {
    return this.currentConfig.features.filter(f => f.requiresConfiguration && f.enabled);
  }

  canUpgradeTo(targetTier: DeploymentTier): boolean {
    const tierHierarchy: DeploymentTier[] = ['basic', 'professional', 'enterprise', 'development'];
    const currentIndex = tierHierarchy.indexOf(this.currentTier);
    const targetIndex = tierHierarchy.indexOf(targetTier);
    return targetIndex > currentIndex;
  }

  getUpgradeRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.currentTier === 'basic') {
      recommendations.push('Upgrade to Professional for billing management and mobile features');
    }
    if (this.currentTier === 'professional') {
      recommendations.push('Upgrade to Enterprise for AI integrations and advanced analytics');
    }
    
    return recommendations;
  }

  getCurrentTierInfo(): DeploymentConfig {
    return this.currentConfig;
  }

  setTier(tier: DeploymentTier): void {
    this.currentTier = tier;
    this.currentConfig = DEPLOYMENT_CONFIGS[tier];
  }
}

// Default feature manager instance
export const featureManager = new FeatureManager();