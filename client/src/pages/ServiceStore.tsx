import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  ShoppingCart,
  MessageCircle,
  Mail,
  CreditCard,
  TrendingUp,
  Package,
  Video,
  Check,
  Star,
  DollarSign,
  Activity,
  Building2,
  Users,
  Zap
} from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  sellingPrice: number;
  features: string[];
  setupFee: number;
  status: 'available' | 'beta' | 'coming_soon';
  pricingModel?: string;
}

interface StoreService extends ServiceItem {
  isActive?: boolean;
  activatedAt?: string;
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
  return iconMap[category] || Package;
};

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Communication': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    'Marketing': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
    'Financial': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    'Analytics': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    'Operations': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    'Medical': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
  };
  return colorMap[category] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
};

// Checkout Form Component
function CheckoutForm({ 
  serviceId, 
  onSuccess, 
  onCancel 
}: { 
  serviceId: string; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/store',
      },
    });

    if (error) {
      toast({
        title: "Error de Pago",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "¡Pago Exitoso!",
        description: "El servicio ha sido activado para tu empresa.",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? (
            <>
              <Activity className="h-4 w-4 animate-spin mr-2" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar y Activar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ServiceStore() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch available services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/store/services', currentTenant?.id],
    enabled: !!currentTenant?.id && isAuthenticated,
  });

  // Fetch active clinics count for pricing calculation
  const { data: clinicsData } = useQuery({
    queryKey: ['/api/store/clinics-count', currentTenant?.id],
    enabled: !!currentTenant?.id && isAuthenticated,
  });

  // Create payment intent mutation
  const createPaymentMutation = useMutation({
    mutationFn: async ({ serviceId }: { serviceId: string }) => {
      return apiRequest('/api/store/create-payment-intent', 'POST', {
        serviceId,
        tenantId: currentTenant?.id
      });
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setIsCheckoutOpen(true);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para comprar servicios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el pago",
        variant: "destructive",
      });
    },
  });

  const services = (servicesData as any)?.services || [];
  const activeServices = (servicesData as any)?.activeServices || [];
  const clinicsCount = (clinicsData as any)?.count || 1;

  const categories = ['all', ...Array.from(new Set(services.map((service: ServiceItem) => service.category)))];
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter((service: ServiceItem) => service.category === selectedCategory);

  const handlePurchaseService = (service: ServiceItem) => {
    setSelectedService(service);
    createPaymentMutation.mutate({ serviceId: service.id });
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    setClientSecret(null);
    setSelectedService(null);
    queryClient.invalidateQueries({ queryKey: ['/api/store/services', currentTenant?.id] });
  };

  const handlePaymentCancel = () => {
    setIsCheckoutOpen(false);
    setClientSecret(null);
    setSelectedService(null);
  };

  const isServiceActive = (serviceId: string) => {
    return activeServices.some((s: StoreService) => s.id === serviceId && s.isActive);
  };

  // Check loading states and authentication
  useEffect(() => {
    if (!isLoading && !tenantLoading && !isAuthenticated) {
      toast({
        title: "Acceso Restringido",
        description: "Debes iniciar sesión para acceder a la tienda",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, tenantLoading, toast]);

  if (isLoading || tenantLoading || servicesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex">
          <Navigation />
          <main className="flex-1 p-6 space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6 space-y-6">
          {/* Back Button */}
          <BackButton />
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                Tienda de Servicios
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Mejora tu clínica veterinaria con servicios premium e integraciones
              </p>
            </div>
            <div className="text-right">
              <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                <Building2 className="h-4 w-4 mr-1" />
                {clinicsCount} {clinicsCount === 1 ? 'Clínica' : 'Clínicas'}
              </Badge>
            </div>
          </div>

          {/* Store Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Servicios Disponibles</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{services.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-300">Servicios Activos</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{activeServices.length}</p>
                  </div>
                  <Star className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Costo Total/Mes</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      ${activeServices.reduce((total: number, service: StoreService) => total + (service.sellingPrice * clinicsCount), 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
                data-testid={`filter-category-${category}`}
              >
                {category === 'all' ? 'Todos los Servicios' : category}
              </Button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service: ServiceItem) => {
              const IconComponent = getCategoryIcon(service.category);
              const isActive = isServiceActive(service.id);
              const totalPrice = service.sellingPrice * clinicsCount;
              const totalSetupFee = service.setupFee * clinicsCount;
              
              return (
                <Card 
                  key={service.id} 
                  className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group ${
                    isActive ? 'ring-2 ring-green-500' : ''
                  }`}
                  data-testid={`service-card-${service.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {service.name}
                          </CardTitle>
                          <Badge className={`text-xs mt-1 ${getCategoryColor(service.category)}`}>
                            {service.category}
                          </Badge>
                        </div>
                      </div>
                      {isActive && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{service.description}</p>

                    {/* Pricing */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${totalPrice}
                          </span>
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mes</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          {clinicsCount}x clínicas
                        </Badge>
                      </div>
                      {service.setupFee > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          + ${totalSetupFee} configuración inicial
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Características:</h4>
                      <ul className="space-y-1">
                        {service.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {service.features.length > 3 && (
                          <li className="text-xs text-gray-400 dark:text-gray-500">
                            + {service.features.length - 3} características más
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isActive ? (
                        <Button
                          disabled
                          className="w-full bg-green-100 text-green-800 hover:bg-green-100 cursor-not-allowed"
                          data-testid={`button-active-${service.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Servicio Activo
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handlePurchaseService(service)}
                          disabled={service.status !== 'available' || createPaymentMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          data-testid={`button-purchase-${service.id}`}
                        >
                          {createPaymentMutation.isPending ? (
                            <Activity className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 mr-2" />
                          )}
                          Comprar ${totalPrice}/mes
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Payment Modal */}
          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">
                  Completar Compra
                  {selectedService && (
                    <div className="mt-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                      {selectedService.name} - ${selectedService.sellingPrice * clinicsCount}/mes
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
              {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    serviceId={selectedService?.id || ''}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                  />
                </Elements>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}