import { useState, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { Plus, Building2, Users, DollarSign, Settings, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

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

// Memoized loading skeleton for fastload optimization
const SubscriptionSkeleton = memo(() => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64 bg-gray-700" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <Skeleton className="h-6 w-32 bg-gray-700" />
            <Skeleton className="h-4 w-24 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 bg-gray-700" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
));

function EnterpriseSubscriptionAdmin() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [planConfigDialog, setPlanConfigDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Fastload optimization: Fetch subscription plans with caching
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/superadmin/subscription-plans'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fastload optimization: Fetch all TenantVet customers with stale-while-revalidate
  const { data: tenantVets, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/superadmin/tenant-customers'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fastload optimization: Fetch expiring subscriptions with real-time updates needed
  const { data: expiringSubscriptions, isLoading: expiringLoading } = useQuery({
    queryKey: ['/api/superadmin/subscriptions/expiring'],
    staleTime: 30 * 1000, // 30 seconds for critical alerts
    gcTime: 2 * 60 * 1000, // 2 minutes
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

  // Early return with skeleton for fastload optimization
  if (plansLoading || clientsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <SubscriptionSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" data-testid="subscription-admin">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/superadmin" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Building2 className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold">EnterpriseVet - Gestión de Suscripciones</h1>
              <p className="text-gray-400">Administra clientes TenantVet y sus suscripciones</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={planConfigDialog} onOpenChange={setPlanConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-gray-700 border-gray-600 hover:bg-gray-600" data-testid="button-config-plans">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Planes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-blue-300">Configurar Planes de Suscripción</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Ajusta los límites de VetSites y precios de cada plan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {subscriptionPlans?.map((plan: SubscriptionPlan) => (
                    <div key={plan.id} className="border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white">{plan.displayName}</h3>
                          <p className="text-sm text-gray-400">{plan.description}</p>
                          <div className="mt-2 flex gap-4 text-sm">
                            <span className="text-gray-300">Max VetSites: {plan.maxTenants}</span>
                            <span className="text-gray-300">Precio: ${plan.monthlyPrice}/mes</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanConfigDialog(true);
                          }}
                          className="bg-gray-700 border-gray-600 hover:bg-gray-600"
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
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-new-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-blue-300">Crear Nuevo Cliente TenantVet</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Registra un nuevo cliente con su suscripción inicial
                  </DialogDescription>
                </DialogHeader>
                {/* Form content would go here */}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{tenantVets?.length || 0}</div>
              <p className="text-xs text-gray-400">
                clientes activos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${tenantVets?.reduce((sum: number, tenant: TenantVet) => sum + (tenant.monthlyRevenue || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">
                ingresos totales
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">VetSites Activos</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {tenantVets?.reduce((sum: number, tenant: TenantVet) => sum + tenant.vetsitesUsed, 0) || 0}
              </div>
              <p className="text-xs text-gray-400">
                sitios en uso
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Expirando Pronto</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{expiringSubscriptions?.length || 0}</div>
              <p className="text-xs text-gray-400">
                próximos 7 días
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Subscriptions Alert */}
        {expiringSubscriptions && expiringSubscriptions.length > 0 && (
          <Card className="bg-yellow-900/20 border-yellow-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                Suscripciones por Expirar
              </CardTitle>
              <CardDescription className="text-yellow-300">
                {expiringSubscriptions.length} clientes con suscripciones expirando en los próximos 7 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringSubscriptions.slice(0, 5).map((subscription: any) => (
                  <div key={subscription.id} className="flex justify-between items-center p-2 bg-yellow-900/10 rounded">
                    <div>
                      <span className="font-medium text-white">{subscription.name}</span>
                      <span className="text-sm text-yellow-300 ml-2">({subscription.subscriptionPlan})</span>
                    </div>
                    <span className="text-sm text-yellow-400">
                      {format(new Date(subscription.subscriptionEnd), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clients List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-300">Clientes TenantVet</CardTitle>
            <CardDescription className="text-gray-400">
              Gestiona todos los clientes y sus suscripciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-gray-700" />
                ))}
              </div>
            ) : tenantVets && tenantVets.length > 0 ? (
              <div className="space-y-3">
                {tenantVets.map((tenant: TenantVet) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{tenant.name}</h3>
                        <Badge 
                          variant={tenant.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                          className={tenant.subscriptionStatus === 'active' ? 'bg-green-600' : ''}
                        >
                          {tenant.subscriptionStatus === 'active' ? 'Activo' : 'Trial'}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {tenant.subscriptionPlan}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{tenant.email}</p>
                      <div className="flex gap-4 text-sm text-gray-300 mt-2">
                        <span>VetSites: {tenant.vetsitesUsed}/{tenant.vetsitesAllowed}</span>
                        <span>Ingresos: ${tenant.monthlyRevenue?.toLocaleString()}/mes</span>
                        <span>Expira: {format(new Date(tenant.subscriptionEnd), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 hover:bg-gray-600">
                        Gestionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No hay clientes registrados</p>
                <p className="text-sm">Crea el primer cliente para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(EnterpriseSubscriptionAdmin);