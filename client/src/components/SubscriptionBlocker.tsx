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

export function SubscriptionBlocker({ children, companyId }: SubscriptionBlockerProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const { toast } = useToast();

  // Check subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["/api/subscription/status", companyId],
    enabled: !!companyId,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get available plans (excluding trial)
  const { data: availablePlans } = useQuery({
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo activar la suscripción",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (subscriptionData) {
      // Block access if subscription is expired or doesn't exist
      const shouldBlock = !subscriptionData.hasSubscription || 
                         subscriptionData.daysRemaining <= 0 ||
                         subscriptionData.status === 'cancelled' ||
                         subscriptionData.status === 'suspended';
      
      setIsBlocked(shouldBlock);
    }
  }, [subscriptionData]);

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setIsUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = () => {
    if (selectedPlan) {
      updateSubscriptionMutation.mutate({ planId: selectedPlan });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Verificando suscripción...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
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
                          Plan Anterior: {subscriptionData.plan}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Expiró hace {Math.abs(subscriptionData.daysRemaining)} días
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">
                  Selecciona un Plan para Continuar
                </h3>

                {/* Available Plans */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePlans
                    ?.filter((plan: any) => plan.id !== 'trial' && plan.displayName !== 'Trial')
                    .map((plan: any) => (
                    <Card 
                      key={plan.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedPlan === plan.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400' 
                          : 'hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            ${plan.monthlyPrice.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">MXN/mes</div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          {plan.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Hasta {plan.maxTenants} clínicas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Soporte 24/7</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Actualizaciones incluidas</span>
                          </div>
                        </div>
                        {selectedPlan === plan.id && (
                          <Badge className="w-full justify-center bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Seleccionado
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-center">
                  <Button 
                    onClick={() => handlePlanSelection(selectedPlan)}
                    disabled={!selectedPlan}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Activar Plan Seleccionado
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Activación de Plan</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres activar este plan?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPlan && availablePlans && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        {availablePlans.find((p: any) => p.id === selectedPlan)?.displayName}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        ${availablePlans.find((p: any) => p.id === selectedPlan)?.monthlyPrice.toLocaleString()} MXN/mes
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Acceso inmediato a todas las funcionalidades
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={updateSubscriptionMutation.isPending}
                >
                  {updateSubscriptionMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Activando...
                    </>
                  ) : (
                    'Confirmar Activación'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <>{children}</>;
}