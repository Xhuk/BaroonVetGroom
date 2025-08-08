import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  CreditCard, 
  TrendingUp,
  Package,
  Bot,
  Video,
  ShoppingCart,
  Star,
  Check,
  ExternalLink,
  DollarSign,
  Users,
  Zap,
  Shield,
  Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  baseCost: number;
  sellingPrice: number;
  profitMargin: number;
  features: string[];
  setupFee: number;
  status: 'available' | 'beta' | 'coming_soon';
  pricingModel?: string;
}

interface ServiceSummary {
  totalServices: number;
  availableServices: number;
  betaServices: number;
  totalMonthlyRevenuePotentialPerClinic: number;
  totalSetupRevenuePotentialPerClinic: number;
  averageProfitMargin: number;
  pricingNote: string;
}

interface ServicesCatalogResponse {
  success: boolean;
  catalog: ServiceCatalogItem[];
  summary: ServiceSummary;
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'Communication': MessageCircle,
    'Marketing': Mail,
    'Financial': CreditCard,
    'Analytics': TrendingUp,
    'Operations': Package,
    'Medical': Video
  };
  return iconMap[category] || Bot;
};

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Communication': 'bg-blue-50 text-blue-700 border-blue-200',
    'Marketing': 'bg-purple-50 text-purple-700 border-purple-200',
    'Financial': 'bg-green-50 text-green-700 border-green-200',
    'Analytics': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Operations': 'bg-orange-50 text-orange-700 border-orange-200',
    'Medical': 'bg-red-50 text-red-700 border-red-200'
  };
  return colorMap[category] || 'bg-gray-50 text-gray-700 border-gray-200';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Available</Badge>;
    case 'beta':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Beta</Badge>;
    case 'coming_soon':
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Coming Soon</Badge>;
    default:
      return null;
  }
};

export function VersionedSuperAdminDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch services catalog
  const { data: catalogData, isLoading: catalogLoading } = useQuery<ServicesCatalogResponse>({
    queryKey: ['/api/superadmin/services-catalog'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Service activation mutation
  const activateServiceMutation = useMutation({
    mutationFn: async ({ companyId, serviceId }: { companyId: string; serviceId: string }) => {
      const response = await fetch('/api/superadmin/activate-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyId, serviceId })
      });
      if (!response.ok) throw new Error('Failed to activate service');
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Service Activated Successfully",
        description: data.message || "The service has been activated for the selected company.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/services-catalog'] });
      setSelectedService(null);
    },
    onError: (error: any) => {
      toast({
        title: "Service Activation Failed",
        description: error?.message || "Failed to activate the service. Please try again.",
        variant: "destructive",
      });
    }
  });

  const catalog = catalogData?.catalog || [];
  const summary = catalogData?.summary;

  const categories = ['all', ...Array.from(new Set(catalog.map(service => service.category)))];

  const filteredServices = selectedCategory === 'all' 
    ? catalog 
    : catalog.filter(service => service.category === selectedCategory);

  const handleActivateService = (serviceId: string) => {
    // In a real implementation, you'd select a company first
    const companyId = 'vetgroom-corp'; // Sample company
    activateServiceMutation.mutate({ companyId, serviceId });
  };

  if (catalogLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="space-y-6 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="space-y-6 p-6">
        {/* Back Button */}
        <BackButton />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              VetAdmin Service Store
            </h1>
            <p className="text-gray-600 mt-2">Enhance your veterinary practice with premium services and integrations</p>
          </div>
          <div className="text-right">
            <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
              <Star className="h-4 w-4 mr-1" />
              {summary?.availableServices || 0} Services Available
            </Badge>
          </div>
        </div>

        {/* Store Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Services</p>
                  <p className="text-3xl font-bold text-blue-900">{summary?.totalServices || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Monthly Revenue Potential</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${summary?.totalMonthlyRevenuePotentialPerClinic || 0}
                  </p>
                  <p className="text-xs text-green-600">per clinic</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Setup Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${summary?.totalSetupRevenuePotentialPerClinic || 0}
                  </p>
                  <p className="text-xs text-purple-600">one-time fees</p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Avg Profit Margin</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {Math.round((summary?.averageProfitMargin || 0) * 100)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Notice */}
        {summary?.pricingNote && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                <span className="font-medium">Pricing Model:</span>
                <span>{summary.pricingNote}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category === 'all' ? 'All Services' : category}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => {
            const IconComponent = getCategoryIcon(service.category);
            return (
              <Card key={service.id} className="bg-white border-gray-200 hover:shadow-lg transition-shadow duration-200 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {service.name}
                        </CardTitle>
                        <Badge className={`text-xs mt-1 ${getCategoryColor(service.category)}`}>
                          {service.category}
                        </Badge>
                      </div>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{service.description}</p>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ${service.sellingPrice}
                        <span className="text-sm font-normal text-gray-500">/month/clinic</span>
                      </span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {Math.round(service.profitMargin * 100)}% margin
                      </Badge>
                    </div>
                    {service.setupFee > 0 && (
                      <p className="text-xs text-gray-500">
                        + ${service.setupFee} one-time setup fee
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Key Features:</h4>
                    <ul className="space-y-1">
                      {service.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {service.features.length > 3 && (
                        <li className="text-xs text-gray-400">
                          + {service.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setSelectedService(service)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      View Details
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      onClick={() => handleActivateService(service.id)}
                      disabled={service.status !== 'available' || activateServiceMutation.isPending}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {activateServiceMutation.isPending ? (
                        <Activity className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Service Detail Modal */}
        {selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${getCategoryColor(selectedService.category)}`}>
                      {React.createElement(getCategoryIcon(selectedService.category), { className: "h-8 w-8" })}
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900">{selectedService.name}</CardTitle>
                      <Badge className={`mt-1 ${getCategoryColor(selectedService.category)}`}>
                        {selectedService.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedService(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <p className="text-gray-700">{selectedService.description}</p>

                {/* Pricing Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Pricing Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monthly Price (per clinic):</span>
                      <span className="font-bold">${selectedService.sellingPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Setup Fee (one-time):</span>
                      <span className="font-bold">${selectedService.setupFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span className="font-bold text-green-600">
                        {Math.round(selectedService.profitMargin * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Example:</strong> Company with 3 clinics = ${selectedService.sellingPrice * 3}/month
                    </p>
                  </div>
                </div>

                {/* All Features */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Complete Feature List</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedService.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedService(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleActivateService(selectedService.id)}
                    disabled={selectedService.status !== 'available' || activateServiceMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {activateServiceMutation.isPending ? (
                      <Activity className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Activate Service
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}