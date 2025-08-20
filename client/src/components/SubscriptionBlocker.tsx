import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionBlockerProps {
  children: React.ReactNode;
  companyId: string;
}

interface SubscriptionData {
  hasSubscription: boolean;
  status: string;
  daysRemaining: number;
  plan?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxTenants: number;
}

export function SubscriptionBlocker({ children, companyId }: SubscriptionBlockerProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const { toast } = useToast();

  // Check if this is a demo tenant (exempt from subscription requirements)
  const isDemoTenant = companyId && (
    companyId.startsWith('demo-') || 
    companyId.includes('demo') || 
    companyId === 'unknown'
  );

  // Check subscription status (skip for demo tenants)
  const { data: subscriptionData, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/status", companyId],
    enabled: !!companyId && !isDemoTenant,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get available plans (excluding trial)
  const { data: availablePlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/superadmin/subscription-plans"],
    enabled: isBlocked,
  });

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      return apiRequest(`/api/subscription/update-plan/${companyId}`, 'POST', { planId });
    },
    onSuccess: () => {
      toast({
        title: "Suscripción activada",
        description: "Tu plan ha sido activado exitosamente. Ya puedes acceder a todas las funcionalidades.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status", companyId] });
      setIsBlocked(false);
      setIsUpgradeDialogOpen(false);
      setSelectedPlan('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo activar la suscripción",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Demo tenants are never blocked
    if (isDemoTenant) {
      setIsBlocked(false);
      return;
    }

    if (subscriptionData) {
      // Block access if subscription is expired or doesn't exist
      const shouldBlock = !subscriptionData.hasSubscription || 
                         subscriptionData.daysRemaining <= 0 ||
                         subscriptionData.status === 'cancelled' ||
                         subscriptionData.status === 'suspended';
      
      setIsBlocked(shouldBlock);
    }
  }, [subscriptionData, isDemoTenant]);

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setIsUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = () => {
    if (selectedPlan) {
      updateSubscriptionMutation.mutate({ planId: selectedPlan });
    }
  };

  // Skip loading check for demo tenants
  if (isLoading && !isDemoTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Verificando suscripción...</p>
        </div>
      </div>
    );
  }

  // Demo tenants are never blocked
  if (isBlocked && !isDemoTenant) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl text-red-900 dark:text-red-100">
                Suscripción Requerida
              </CardTitle>
              <p className="text-red-700 dark:text-red-300 mt-2">
                {subscriptionData?.hasSubscription
                  ? "Tu suscripción ha expirado. Selecciona un plan para continuar usando el sistema."
                  : "Necesitas una suscripción activa para acceder al sistema."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current Status */}
                {subscriptionData?.hasSubscription && (
                  <div className="bg-red-100 border border-red-300 rounded-lg p-4 dark:bg-red-900 dark:border-red-700">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">
                        Plan Actual: {subscriptionData.plan || 'N/A'}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Expira en: {subscriptionData.daysRemaining} días
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Plans */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Planes Disponibles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {availablePlans?.filter((plan: SubscriptionPlan) => plan.name !== 'trial')?.map((plan: SubscriptionPlan) => (
                    <Card key={plan.id} className="border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                          {plan.displayName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                      <Badge variant="secondary" className="text-xs">
                        {plan.maxTenants} VetSite{plan.maxTenants !== 1 ? 's' : ''}
                      </Badge>
                      <div className="space-y-2">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${plan.monthlyPrice}/mes
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${plan.yearlyPrice}/año
                        </p>
                      </div>
                      <Button 
                        onClick={() => handlePlanSelection(plan.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={updateSubscriptionMutation.isPending}
                      >
                        {updateSubscriptionMutation.isPending ? 'Procesando...' : 'Seleccionar Plan'}
                      </Button>
                    </CardContent>
                    </Card>
                  )) || []}
                </div>
                </div>

                {/* Billing Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900 dark:border-blue-700">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Política de Facturación
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Los cambios de precio entrarán en vigor en 10 días naturales desde la fecha de activación. 
                        Esto te da tiempo suficiente para planificar tu presupuesto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900 dark:border-green-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Acceso Completo
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Una vez activado tu plan, tendrás acceso completo a todas las funcionalidades 
                        del sistema de gestión veterinaria.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Dialog */}
          <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Activación de Plan</DialogTitle>
                <DialogDescription>
                  {selectedPlan && availablePlans && (
                    <>
                      Estás a punto de activar el plan{" "}
                      <strong>
                        {availablePlans.find((p: SubscriptionPlan) => p.id === selectedPlan)?.displayName}
                      </strong>
                      {" "}por{" "}
                      <strong>
                        ${availablePlans.find((p: SubscriptionPlan) => p.id === selectedPlan)?.monthlyPrice}/mes
                      </strong>
                      .
                      <br />
                      <br />
                      Los cambios de precio entrarán en vigor en 10 días naturales desde hoy.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsUpgradeDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmUpgrade}
                  disabled={updateSubscriptionMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {updateSubscriptionMutation.isPending ? 'Activando...' : 'Confirmar Activación'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // For demo tenants or valid subscriptions, render children
  return <>{children}</>;
}