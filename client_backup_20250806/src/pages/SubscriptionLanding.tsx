import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Star, Crown, Building2, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SubscriptionPlan, SubscriptionPromotion } from "@shared/schema";

const subscriptionSchema = z.object({
  email: z.string().email("Email inválido"),
  companyName: z.string().min(1, "Nombre de empresa requerido"),
  promotionCode: z.string().optional(),
});

type SubscriptionForm = z.infer<typeof subscriptionSchema>;

export default function SubscriptionLanding() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<SubscriptionPromotion | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["/api/promotions/active"],
  });

  const form = useForm<SubscriptionForm>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      email: "",
      companyName: "",
      promotionCode: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SubscriptionForm) => {
      // TODO: Implement actual signup with Stripe
      console.log("Signup data:", data, "Plan:", selectedPlan);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "¡Bienvenido a VetGroom!",
        description: "Tu cuenta ha sido creada. Revisa tu email para continuar.",
      });
      setShowSignupDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validatePromotion = async (code: string) => {
    if (!code) {
      setAppliedPromotion(null);
      return;
    }

    try {
      // TODO: Implement promotion validation API
      const promotion = promotions.find((p: SubscriptionPromotion) => p.code === code);
      if (promotion) {
        setAppliedPromotion(promotion);
        toast({
          title: "¡Código aplicado!",
          description: `Descuento del ${promotion.discountValue}${promotion.discountType === 'percentage' ? '%' : ' MXN'} aplicado.`,
        });
      } else {
        setAppliedPromotion(null);
        toast({
          title: "Código inválido",
          description: "El código promocional no es válido o ha expirado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating promotion:", error);
    }
  };

  const calculateDiscountedPrice = (originalPrice: number, promotion?: SubscriptionPromotion | null) => {
    if (!promotion) return originalPrice;
    
    if (promotion.discountType === 'percentage') {
      return originalPrice * (1 - parseFloat(promotion.discountValue) / 100);
    } else {
      return Math.max(0, originalPrice - parseFloat(promotion.discountValue));
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowSignupDialog(true);
  };

  const onSubmit = (data: SubscriptionForm) => {
    signupMutation.mutate(data);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'basic':
        return <Users className="w-8 h-8" />;
      case 'small':
        return <Building2 className="w-8 h-8" />;
      case 'medium':
        return <Zap className="w-8 h-8" />;
      case 'big':
        return <Star className="w-8 h-8" />;
      case 'extra_big':
        return <Crown className="w-8 h-8" />;
      case 'enterprise':
        return <Crown className="w-8 h-8 text-purple-600" />;
      default:
        return <Building2 className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'basic':
        return "border-blue-200 hover:border-blue-300";
      case 'small':
        return "border-green-200 hover:border-green-300";
      case 'medium':
        return "border-yellow-200 hover:border-yellow-300 ring-2 ring-yellow-400";
      case 'big':
        return "border-orange-200 hover:border-orange-300";
      case 'extra_big':
        return "border-purple-200 hover:border-purple-300";
      case 'enterprise':
        return "border-gray-800 hover:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100";
      default:
        return "border-gray-200 hover:border-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50" data-testid="subscription-landing">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Bienvenido a <span className="text-blue-600">VetGroom</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La plataforma integral para clínicas veterinarias. Gestiona citas, servicios de grooming, 
            entregas a domicilio, facturación y más, todo en un solo lugar.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Multi-tenant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Gestión de entregas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Facturación automática</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>WhatsApp integrado</span>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Elige el plan perfecto para tu negocio
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {(plans as SubscriptionPlan[]).map((plan) => {
              const isPopular = plan.name === 'medium';
              const monthlyPrice = parseFloat(plan.monthlyPrice);
              const discountedPrice = calculateDiscountedPrice(monthlyPrice, appliedPromotion);
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-200 ${getPlanColor(plan.name)} ${
                    isPopular ? 'scale-105 shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-500 text-white px-4 py-1">
                        ⭐ Más Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4 text-blue-600">
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-2xl font-bold">{plan.displayName}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        {appliedPromotion && (
                          <span className="text-lg text-gray-500 line-through">
                            ${monthlyPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-4xl font-bold text-gray-900">
                          ${discountedPrice.toFixed(2)}
                        </span>
                        <span className="text-gray-600">/ mes</span>
                      </div>
                      {plan.yearlyPrice && (
                        <p className="text-sm text-green-600 mt-1">
                          Ahorra 20% pagando anualmente
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Hasta {plan.maxTenants} {plan.maxTenants === 1 ? 'clínica' : 'clínicas'}</span>
                      </div>
                      {(plan.features as string[] || []).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                      data-testid={`select-plan-${plan.name}`}
                    >
                      {isPopular ? "Empezar Ahora" : "Seleccionar Plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Promotion Code Section */}
        <div className="text-center mb-16">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">¿Tienes un código promocional?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingresa tu código"
                  value={form.watch("promotionCode") || ""}
                  onChange={(e) => {
                    form.setValue("promotionCode", e.target.value);
                    validatePromotion(e.target.value);
                  }}
                  data-testid="input-promotion-code"
                />
                <Button 
                  variant="outline" 
                  onClick={() => validatePromotion(form.watch("promotionCode") || "")}
                  data-testid="button-apply-promotion"
                >
                  Aplicar
                </Button>
              </div>
              {appliedPromotion && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Descuento aplicado: {appliedPromotion.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Signup Dialog */}
      <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Crear cuenta - {selectedPlan?.displayName}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Empresa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Clínica Veterinaria San José"
                        {...field}
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Corporativo</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@clinica.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPlan && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Resumen del Plan</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Plan:</strong> {selectedPlan.displayName}</p>
                    <p><strong>Clínicas:</strong> Hasta {selectedPlan.maxTenants}</p>
                    <p><strong>Precio:</strong> ${calculateDiscountedPrice(parseFloat(selectedPlan.monthlyPrice), appliedPromotion).toFixed(2)} MXN/mes</p>
                    {appliedPromotion && (
                      <p className="text-green-600"><strong>Descuento:</strong> {appliedPromotion.name}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSignupDialog(false)}
                  data-testid="button-cancel-signup"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={signupMutation.isPending}
                  data-testid="button-create-account"
                >
                  {signupMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}