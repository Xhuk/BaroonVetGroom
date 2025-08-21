import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useTranslations } from '@/hooks/useTranslations';
import { Check, Crown, Building, Users, Zap, Shield, ArrowRight } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  yearlyPrice: number;
  maxTenants: number;
}

export default function DemoSubscriptionUpgrade() {
  const { toast } = useToast();
  const { subscription, common, errors, messages } = useTranslations();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    address: '',
    city: '',
    country: 'Mexico'
  });

  const { data: plansData, isLoading } = useQuery<{plans: SubscriptionPlan[]}>({
    queryKey: ['/api/demo/subscription-plans'],
    retry: false
  });

  // Helper function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Helper function to get price display
  const getPriceDisplay = (plan: SubscriptionPlan, cycle: 'monthly' | 'yearly') => {
    const price = cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const formatted = formatPrice(price);
    const period = cycle === 'monthly' ? subscription.price_per_month() : subscription.price_per_year();
    return { price: formatted, period };
  };

  // Helper function to calculate yearly discount
  const calculateYearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - yearlyPrice;
    const percentage = Math.round((savings / monthlyTotal) * 100);
    return { savings: formatPrice(savings), percentage };
  };

  const requestVanillaTenantMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await apiRequest('POST', '/api/demo/request-vanilla-tenant', requestData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: messages.operation_success(),
        description: data.message,
        variant: "default",
      });
      setShowContactForm(false);
    },
    onError: (error) => {
      toast({
        title: errors.general_error(),
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      toast({
        title: "Select a Plan",
        description: "Please select a plan to continue",
        variant: "destructive",
      });
      return;
    }
    setShowContactForm(true);
  };

  const handleSubmitRequest = () => {
    if (!formData.companyName || !formData.contactName || !formData.contactEmail) {
      toast({
        title: "Required Fields",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      selectedPlan,
      billingCycle,
      ...formData
    };

    requestVanillaTenantMutation.mutate(requestData);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic': return <Building className="w-6 h-6" />;
      case 'medium': return <Users className="w-6 h-6" />;
      case 'large': return <Zap className="w-6 h-6" />;
      case 'extra_large': return <Crown className="w-6 h-6" />;
      default: return <Building className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'basic': return 'border-blue-200 hover:border-blue-300';
      case 'medium': return 'border-green-200 hover:border-green-300';
      case 'large': return 'border-purple-200 hover:border-purple-300';
      case 'extra_large': return 'border-yellow-200 hover:border-yellow-300';
      default: return 'border-gray-200 hover:border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando planes de suscripción...</p>
        </div>
      </div>
    );
  }

  if (showContactForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Información de Contacto</h1>
            <p className="text-gray-600">Completa tus datos para procesar tu solicitud</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Datos de tu Clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Clínica *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Clínica Veterinaria..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Nombre de Contacto *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de Contacto *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contacto@clinica.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, número, colonia"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ciudad de México"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="México"
                  />
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Your Selection Summary:</h3>
                  <p className="text-blue-700">
                    {plansData?.plans.find((p: SubscriptionPlan) => p.id === selectedPlan)?.displayName} Plan - 
                    {billingCycle === 'monthly' ? subscription.monthly() : subscription.yearly()} {subscription.billing_cycle()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowContactForm(false)}
                  >
                    {common.back()} to Plans
                  </Button>
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={requestVanillaTenantMutation.isPending}
                    className="flex-1"
                  >
                    {requestVanillaTenantMutation.isPending ? 'Sending...' : common.submit()}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{subscription.title()}</h1>
          <p className="text-xl text-gray-600 mb-6">{subscription.subtitle()}</p>
          
          {/* Billing Toggle */}
          <div className="inline-flex bg-gray-100 p-1 rounded-lg mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {subscription.monthly()}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {subscription.yearly()}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {plansData?.plans?.map((plan: SubscriptionPlan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPlan === plan.id
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : getPlanColor(plan.id)
              }`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.id === 'large' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-3 py-1">{subscription.most_popular()}</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className={`p-3 rounded-full ${
                    plan.id === 'basic' ? 'bg-blue-100 text-blue-600' :
                    plan.id === 'medium' ? 'bg-green-100 text-green-600' :
                    plan.id === 'large' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {getPlanIcon(plan.id)}
                  </div>
                </div>
                <CardTitle className="text-xl mb-2">{plan.displayName}</CardTitle>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {getPriceDisplay(plan, billingCycle).price}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getPriceDisplay(plan, billingCycle).period}
                  </div>
                  {billingCycle === 'yearly' && plan.yearlyPrice < (plan.monthlyPrice * 12) && (
                    <div className="text-xs text-green-600 mt-1">
                      Ahorra {calculateYearlyDiscount(plan.monthlyPrice, plan.yearlyPrice).savings}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {selectedPlan === plan.id && (
                  <div className="mt-4 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 text-center font-medium">Plan Seleccionado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedPlan}
            size="lg"
            className="px-8 py-3"
          >
            Continuar con {selectedPlan ? plansData?.plans.find((p: SubscriptionPlan) => p.id === selectedPlan)?.displayName : 'Plan Seleccionado'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}