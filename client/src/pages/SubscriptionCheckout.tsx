import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, CreditCard, Globe, Truck, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  maxTenants: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isActive: boolean;
  popular?: boolean;
}

interface PaymentProvider {
  id: string;
  name: string;
  displayName: string;
  fees: string;
  payoutTime: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
  logo?: string;
}

const paymentProviders: PaymentProvider[] = [
  {
    id: "mercado_pago",
    name: "mercado_pago",
    displayName: "Mercado Pago",
    fees: "Variable (Contactar para precios específicos)",
    payoutTime: "Inmediato disponible, estándar toma más tiempo",
    pros: [
      "Dominante en México",
      "Pagos en efectivo via OXXO",
      "Tarifas más bajas",
      "Integración local fuerte"
    ],
    cons: [
      "Precios menos transparentes",
      "Algunos usuarios reportan retrasos de 30 días"
    ],
    recommended: true
  },
  {
    id: "stripe",
    name: "stripe",
    displayName: "Stripe",
    fees: "2.9% + $0.30 por transacción",
    payoutTime: "2-7 días hábiles",
    pros: [
      "Precios transparentes",
      "Herramientas de desarrollador excelentes",
      "Plataforma global",
      "Pagos más rápidos"
    ],
    cons: [
      "Tarifas más altas",
      "Métodos de pago locales limitados"
    ],
    recommended: false
  },
  {
    id: "paypal",
    name: "paypal",
    displayName: "PayPal",
    fees: "Variable según tipo de transacción",
    payoutTime: "1-3 días hábiles",
    pros: [
      "Reconocimiento mundial",
      "Múltiples métodos de pago",
      "Protección de comprador"
    ],
    cons: [
      "Tarifas variables",
      "Menos integración local en México"
    ],
    recommended: false
  }
];

export default function SubscriptionCheckout() {
  const [selectedPlan, setSelectedPlan] = useState<string>("medium");
  const [selectedProvider, setSelectedProvider] = useState<string>("mercado_pago");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { toast } = useToast();

  const { data: subscriptionPlans, isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    retry: false,
  });

  const defaultPlans: SubscriptionPlan[] = [
    {
      id: "trial",
      name: "trial",
      displayName: "Prueba / Básico",
      description: "Perfecto para clínicas pequeñas que empiezan",
      maxTenants: 2,
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: ["2 Clínicas", "Citas básicas", "Gestión de clientes", "Soporte por email"],
      isActive: true
    },
    {
      id: "medium",
      name: "medium",
      displayName: "Mediano",
      description: "Ideal para clínicas en crecimiento",
      maxTenants: 5,
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      features: [
        "5 Clínicas",
        "Gestión de citas avanzada",
        "Reportes y analíticas",
        "WhatsApp automático",
        "Facturación integrada",
        "Soporte prioritario"
      ],
      isActive: true,
      popular: true
    },
    {
      id: "large",
      name: "large",
      displayName: "Grande",
      description: "Para cadenas de clínicas establecidas",
      maxTenants: 8,
      monthlyPrice: 4999,
      yearlyPrice: 49990,
      features: [
        "8 Clínicas",
        "Todas las características Medianas",
        "API personalizada",
        "Integraciones avanzadas",
        "Gestión multi-sucursal",
        "Soporte dedicado"
      ],
      isActive: true
    },
    {
      id: "extra_large",
      name: "extra_large",
      displayName: "Extra Grande",
      description: "Para empresas veterinarias grandes",
      maxTenants: 15,
      monthlyPrice: 7999,
      yearlyPrice: 79990,
      features: [
        "15 Clínicas",
        "Todas las características Grandes",
        "Dashboard ejecutivo",
        "Análisis predictivo",
        "Implementación personalizada",
        "Gerente de cuenta dedicado"
      ],
      isActive: true
    }
  ];

  const plans: SubscriptionPlan[] = subscriptionPlans || defaultPlans;
  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const selectedProviderData = paymentProviders.find(p => p.id === selectedProvider);

  const calculatePrice = () => {
    if (!selectedPlanData) return 0;
    return billingCycle === "yearly" ? selectedPlanData.yearlyPrice : selectedPlanData.monthlyPrice;
  };

  const calculateSavings = () => {
    if (!selectedPlanData || billingCycle === "monthly") return 0;
    const monthlyTotal = selectedPlanData.monthlyPrice * 12;
    const yearlyPrice = selectedPlanData.yearlyPrice;
    return monthlyTotal - yearlyPrice;
  };

  const handleSubscribe = async () => {
    try {
      toast({
        title: "Procesando suscripción",
        description: "Redirigiendo al sistema de pagos...",
      });

      // Here we'll integrate with the payment providers
      console.log("Processing subscription:", {
        plan: selectedPlan,
        provider: selectedProvider,
        billingCycle,
        amount: calculatePrice()
      });

      // TODO: Implement actual payment processing
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la suscripción. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-300 mb-4">
            Suscripción VetGroom
          </h1>
          <p className="text-gray-400 text-lg">
            Elige el plan perfecto para tu negocio veterinario
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition-colors ${
                billingCycle === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              data-testid="toggle-monthly"
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md transition-colors relative ${
                billingCycle === "yearly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              data-testid="toggle-yearly"
            >
              Anual
              <Badge className="absolute -top-2 -right-2 bg-green-600 text-xs">
                Ahorra
              </Badge>
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:scale-105 ${
                selectedPlan === plan.id
                  ? "border-blue-500 bg-gray-800"
                  : "border-gray-700 bg-gray-850"
              } ${plan.popular ? "ring-2 ring-blue-400" : ""}`}
              onClick={() => setSelectedPlan(plan.id)}
              data-testid={`plan-${plan.id}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                  Más Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-blue-300">{plan.displayName}</CardTitle>
                <CardDescription className="text-gray-400">
                  {plan.description}
                </CardDescription>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    ${billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice}
                    <span className="text-sm text-gray-400">
                      /{billingCycle === "yearly" ? "año" : "mes"}
                    </span>
                  </div>
                  {billingCycle === "yearly" && plan.monthlyPrice > 0 && (
                    <div className="text-sm text-green-400 mt-1">
                      Ahorra ${plan.monthlyPrice * 12 - plan.yearlyPrice} al año
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-center text-gray-300 font-semibold mb-3">
                    Hasta {plan.maxTenants} {plan.maxTenants === 1 ? "Clínica" : "Clínicas"}
                  </div>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Provider Comparison */}
        <Card className="bg-gray-850 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Comparación de Proveedores de Pago
            </CardTitle>
            <CardDescription className="text-gray-400">
              Recomendación: <strong>Mercado Pago</strong> para menores costos y mejor acceso al dinero en México
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {paymentProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedProvider === provider.id
                      ? "border-blue-500 bg-gray-800"
                      : "border-gray-600 bg-gray-800"
                  } ${provider.recommended ? "ring-2 ring-green-400" : ""}`}
                  onClick={() => setSelectedProvider(provider.id)}
                  data-testid={`provider-${provider.id}`}
                >
                  {provider.recommended && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600">
                      Recomendado
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-blue-300">{provider.displayName}</CardTitle>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Tarifas: </span>
                        <span className="text-white">{provider.fees}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tiempo de pago: </span>
                        <span className="text-white">{provider.payoutTime}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-green-400 font-semibold text-sm mb-1">Ventajas:</h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {provider.pros.map((pro, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-yellow-400 font-semibold text-sm mb-1">Desventajas:</h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {provider.cons.map((con, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <Clock className="w-3 h-3 text-yellow-400 mt-0.5" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary and Checkout */}
        <Card className="bg-gray-850 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-300">Resumen de Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Plan seleccionado:</span>
                <span className="text-white font-semibold">
                  {selectedPlanData?.displayName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Método de pago:</span>
                <span className="text-white font-semibold">
                  {selectedProviderData?.displayName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Facturación:</span>
                <span className="text-white font-semibold">
                  {billingCycle === "yearly" ? "Anual" : "Mensual"}
                </span>
              </div>
              {billingCycle === "yearly" && calculateSavings() > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span>Ahorro anual:</span>
                  <span className="font-semibold">${calculateSavings()}</span>
                </div>
              )}
              <Separator className="bg-gray-600" />
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300 font-semibold">Total:</span>
                <span className="text-white font-bold">
                  ${calculatePrice()} MXN
                </span>
              </div>
              
              <Button
                onClick={handleSubscribe}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                data-testid="button-subscribe"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Suscribirse a VetGroom
              </Button>

              <div className="text-center text-sm text-gray-400 mt-4">
                <p>
                  Después del pago, configuraremos tu cuenta con {selectedPlanData?.maxTenants}{" "}
                  {selectedPlanData?.maxTenants === 1 ? "clínica" : "clínicas"} y te enviaremos
                  una guía de inicio completa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}