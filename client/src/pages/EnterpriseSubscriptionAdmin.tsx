import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { Plus, Building2, Users, DollarSign, Settings, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
}

interface TenantVet {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  vetsitesUsed: number;
  vetsitesAllowed: number;
  monthlyRevenue: number;
  subscriptionStart: string;
  subscriptionEnd: string;
}

export default function EnterpriseSubscriptionAdmin() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [planConfigDialog, setPlanConfigDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Fetch subscription plans
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/superadmin/subscription-plans'],
  });

  // Fetch all TenantVet customers
  const { data: tenantVets, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/superadmin/tenant-customers'],
  });

  // Fetch expiring subscriptions (next 7 days)
  const { data: expiringSubscriptions, isLoading: expiringLoading } = useQuery({
    queryKey: ['/api/superadmin/subscriptions/expiring'],
  });

  // Create new TenantVet customer
  const createCustomer = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      planId: string;
      vetsitesCount?: number;
    }) => {
      const response = await fetch('/api/superadmin/tenant-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/tenant-customers'] });
      setNewClientDialog(false);
    },
  });

  // Update subscription plan configuration
  const updatePlan = useMutation({
    mutationFn: async (planData: Partial<SubscriptionPlan>) => {
      const response = await fetch(`/api/superadmin/subscription-plans/${planData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      if (!response.ok) throw new Error('Failed to update plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/subscription-plans'] });
      setPlanConfigDialog(false);
      setEditingPlan(null);
    },
  });

  if (plansLoading || clientsLoading) {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              EnterpriseVet - Gestión de Suscripciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra clientes TenantVet y sus suscripciones
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={planConfigDialog} onOpenChange={setPlanConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-config-plans">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Planes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configurar Planes de Suscripción</DialogTitle>
                  <DialogDescription>
                    Ajusta los límites de VetSites y precios de cada plan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {subscriptionPlans?.map((plan: SubscriptionPlan) => (
                    <div key={plan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{plan.displayName}</h3>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                          <div className="mt-2">
                            <Badge variant="outline">
                              Máximo {plan.maxTenants} VetSites
                            </Badge>
                            <Badge variant="outline" className="ml-2">
                              ${plan.monthlyPrice}/mes
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanConfigDialog(true);
                          }}
                          data-testid={`button-edit-plan-${plan.name}`}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente TenantVet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Cliente TenantVet</DialogTitle>
                  <DialogDescription>
                    Registra un nuevo cliente y asigna su plan de suscripción
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createCustomer.mutate({
                      name: formData.get('name') as string,
                      email: formData.get('email') as string,
                      planId: selectedPlan,
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="name">Nombre de la Empresa</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ej: Clínicas Veterinarias ABC"
                      required
                      data-testid="input-client-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email de Contacto</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      required
                      data-testid="input-client-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">Plan de Suscripción</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger data-testid="select-subscription-plan">
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans?.map((plan: SubscriptionPlan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.displayName} - {plan.maxTenants} VetSites (${plan.monthlyPrice}/mes)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={createCustomer.isPending || !selectedPlan}
                    className="w-full"
                    data-testid="button-create-client"
                  >
                    {createCustomer.isPending ? 'Creando...' : 'Crear Cliente'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Subscription Plans Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {subscriptionPlans?.map((plan: SubscriptionPlan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.maxTenants} VetSites máximo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${plan.monthlyPrice}
                </div>
                <p className="text-xs text-gray-500">por mes</p>
                <div className="mt-3">
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expiring Subscriptions Alert */}
        {expiringSubscriptions && expiringSubscriptions.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Suscripciones por Expirar ({expiringSubscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {expiringSubscriptions.map((sub: any) => (
                  <div key={sub.companyId} className="flex justify-between items-center text-sm border-b border-yellow-200 dark:border-yellow-700 pb-1">
                    <span className="font-medium">{sub.companyName}</span>
                    <div className="text-right">
                      <div className="text-yellow-700 dark:text-yellow-300">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        {sub.planDisplayName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TenantVet Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes TenantVet</CardTitle>
            <CardDescription>
              Gestión de clientes empresariales y sus suscripciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantVets?.map((client: TenantVet) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid={`client-${client.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {client.subscriptionPlan}
                        </Badge>
                        <Badge 
                          variant={client.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                        >
                          {client.subscriptionStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {client.vetsitesUsed}/{client.vetsitesAllowed} VetSites
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        ${client.monthlyRevenue?.toLocaleString('es-MX')}/mes
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Vence: {format(new Date(client.subscriptionEnd), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No hay clientes registrados
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}