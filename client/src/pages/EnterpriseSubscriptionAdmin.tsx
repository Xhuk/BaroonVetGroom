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
  const [planConfigDialog, setPlanConfigDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    displayName: '',
    description: '',
    maxTenants: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [] as string[],
    isActive: true
  });

  // Feature definitions for subscription plans
  const availableFeatures = {
    // VetSites Management
    'X_vetsites': 'The number of independent clinic dashboards (VetSites) the tenant can manage',
    
    // Appointment Features
    'basic_appointments': 'Only simple appointment booking (no staff/room/resource allocation or calendar sync)',
    'unlimited_appointments': 'No limit on appointments per clinic, includes full scheduling features',
    
    // Reporting Features
    'basic_reporting': 'Access to basic reports: clients, appointments, sales',
    'advanced_reporting': 'Access to detailed analytics: services usage, income tracking, clinic performance, etc.',
    
    // Support Features
    'email_support': 'Support provided via email (standard response time)',
    'priority_support': 'Faster response time via email or WhatsApp (premium queue)',
    'phone_support': 'Phone support line included',
    'dedicated_support': 'Assigned success manager or premium onboarding/training',
    
    // Integration Features
    'whatsapp_integration': 'Ability to send appointment reminders, confirmations, follow-ups via WhatsApp',
    'grooming_module': 'Enables grooming-specific features: bath scheduling, notes, pet grooming history, etc.',
    'delivery_tracking': 'Tracks medicine/product deliveries from clinic to customer',
    'api_access': 'Enables access to public API for external integrations',
    'custom_integrations': 'Includes integration service for ERP/CRM/payments per enterprise use case',
    'multi_location_dashboard': 'Centralized dashboard to monitor all clinics from one parent account (for chains/franchises)'
  };

  // Fastload optimization: Fetch subscription plans with caching
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/superadmin/subscription-plans'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create new subscription plan
  const createPlan = useMutation({
    mutationFn: async (planData: Omit<SubscriptionPlan, 'id'>) => {
      const response = await fetch('/api/superadmin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      if (!response.ok) throw new Error('Failed to create plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/subscription-plans'] });
      setPlanConfigDialog(false);
      setNewPlanForm({
        name: '',
        displayName: '',
        description: '',
        maxTenants: 1,
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [''],
        isActive: true
      });
    },
  });

  const handleCreatePlan = () => {
    if (!newPlanForm.name || !newPlanForm.displayName) {
      return;
    }
    
    createPlan.mutate(newPlanForm);
  };

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
  if (plansLoading) {
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
            <Settings className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Configurar Planes de Suscripción
              </h1>
              <p className="text-gray-400">Gestión global de planes y precios para todas las empresas</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Quick Feature Template Button */}
            <Button 
              onClick={() => {
                setEditingPlan(null);
                const basicFeatures = ['basic_appointments', 'email_support', 'basic_reporting', 'whatsapp_integration'];
                setNewPlanForm({
                  name: 'basic',
                  displayName: 'Plan Básico',
                  description: 'Plan inicial con características esenciales',
                  maxTenants: 1,
                  monthlyPrice: 49,
                  yearlyPrice: 490,
                  features: basicFeatures,
                  isActive: true
                });
                setPlanConfigDialog(true);
              }}
              variant="outline"
              className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              data-testid="button-feature-template"
            >
              <Settings className="w-4 h-4 mr-2" />
              Plantilla Básica
            </Button>
            
            <Dialog open={planConfigDialog} onOpenChange={setPlanConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" data-testid="button-new-plan">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-purple-300">
                    {editingPlan ? 'Editar Plan de Suscripción' : 'Crear Nuevo Plan'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {editingPlan ? 'Modifica la configuración del plan' : 'Configura un nuevo plan de suscripción'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="planName" className="text-gray-300">Nombre del Plan</Label>
                      <Input
                        id="planName"
                        value={editingPlan?.name || newPlanForm.name}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({...editingPlan, name: e.target.value}) : 
                          setNewPlanForm({...newPlanForm, name: e.target.value})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="basic, medium, large..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayName" className="text-gray-300">Nombre Mostrado</Label>
                      <Input
                        id="displayName"
                        value={editingPlan?.displayName || newPlanForm.displayName}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({...editingPlan, displayName: e.target.value}) : 
                          setNewPlanForm({...newPlanForm, displayName: e.target.value})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Plan Básico, Plan Medium..."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-gray-300">Descripción</Label>
                    <Input
                      id="description"
                      value={editingPlan?.description || newPlanForm.description}
                      onChange={(e) => editingPlan ? 
                        setEditingPlan({...editingPlan, description: e.target.value}) : 
                        setNewPlanForm({...newPlanForm, description: e.target.value})
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Descripción del plan..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="maxTenants" className="text-gray-300">Max VetSites</Label>
                      <Input
                        id="maxTenants"
                        type="number"
                        value={editingPlan?.maxTenants || newPlanForm.maxTenants}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({...editingPlan, maxTenants: parseInt(e.target.value)}) : 
                          setNewPlanForm({...newPlanForm, maxTenants: parseInt(e.target.value)})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyPrice" className="text-gray-300">Precio Mensual ($)</Label>
                      <Input
                        id="monthlyPrice"
                        type="number"
                        value={editingPlan?.monthlyPrice || newPlanForm.monthlyPrice}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({...editingPlan, monthlyPrice: parseFloat(e.target.value)}) : 
                          setNewPlanForm({...newPlanForm, monthlyPrice: parseFloat(e.target.value)})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        min="0"
                        step="0.01"
                        placeholder="99.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="yearlyPrice" className="text-gray-300">Precio Anual ($)</Label>
                      <Input
                        id="yearlyPrice"
                        type="number"
                        value={editingPlan?.yearlyPrice || newPlanForm.yearlyPrice}
                        onChange={(e) => editingPlan ? 
                          setEditingPlan({...editingPlan, yearlyPrice: parseFloat(e.target.value)}) : 
                          setNewPlanForm({...newPlanForm, yearlyPrice: parseFloat(e.target.value)})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        min="0"
                        step="0.01"
                        placeholder="990.00"
                      />
                    </div>
                  </div>
                  
                  {/* Feature Assignment Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-gray-300 font-semibold">Características del Plan</Label>
                      <Badge variant="outline" className="bg-purple-900/30 border-purple-600 text-purple-300">
                        {(editingPlan?.features || newPlanForm.features).length} seleccionadas
                      </Badge>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto bg-gray-750 rounded-lg border border-gray-600 p-3">
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(availableFeatures).map(([featureKey, description]) => {
                          const currentFeatures = editingPlan?.features || newPlanForm.features;
                          const isSelected = currentFeatures.includes(featureKey);
                          
                          return (
                            <div
                              key={featureKey}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-purple-900/30 border-purple-500 text-white' 
                                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-purple-400'
                              }`}
                              onClick={() => {
                                const updatedFeatures = isSelected
                                  ? currentFeatures.filter(f => f !== featureKey)
                                  : [...currentFeatures, featureKey];
                                
                                if (editingPlan) {
                                  setEditingPlan({...editingPlan, features: updatedFeatures});
                                } else {
                                  setNewPlanForm({...newPlanForm, features: updatedFeatures});
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      isSelected 
                                        ? 'bg-purple-600 border-purple-600' 
                                        : 'border-gray-500'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="font-medium text-sm">
                                      {featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1 ml-6">
                                    {description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      💡 Selecciona las características que incluirá este plan de suscripción
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setPlanConfigDialog(false);
                        setEditingPlan(null);
                      }}
                      className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={editingPlan ? 
                        () => updatePlan.mutate(editingPlan) : 
                        handleCreatePlan
                      }
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={editingPlan ? updatePlan.isPending : createPlan.isPending}
                    >
                      {editingPlan ? 'Actualizar' : 'Crear'} Plan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {/* Subscription Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptionPlans?.map((plan: SubscriptionPlan) => (
            <Card key={plan.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-all duration-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-400" />
                      {plan.displayName}
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      {plan.description}
                    </CardDescription>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"} className={plan.isActive ? "bg-green-600" : "bg-gray-600"}>
                    {plan.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">${plan.monthlyPrice}</div>
                      <div className="text-sm text-gray-400">por mes</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">${plan.yearlyPrice}</div>
                      <div className="text-sm text-gray-400">por año</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Max VetSites:</span>
                      <span className="text-white font-semibold">{plan.maxTenants}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm font-medium">Características:</span>
                        <Badge variant="secondary" className="bg-gray-600 text-xs">
                          {plan.features?.length || 0} funciones
                        </Badge>
                      </div>
                      {plan.features?.length > 0 ? (
                        <div className="space-y-1">
                          {plan.features.slice(0, 4).map((feature, index) => {
                            const featureName = feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                                <span className="text-xs text-gray-300">{featureName}</span>
                              </div>
                            );
                          })}
                          {plan.features.length > 4 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs text-gray-400">
                                +{plan.features.length - 4} características más
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay características definidas</p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanConfigDialog(true);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    data-testid={`button-edit-plan-${plan.id}`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Editar Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Global Subscription Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Planes Totales</CardTitle>
              <Settings className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{subscriptionPlans?.length || 0}</div>
              <p className="text-xs text-gray-400">
                planes configurados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Planes Activos</CardTitle>
              <Badge className="h-4 w-4 text-green-400 bg-transparent border-0 p-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {subscriptionPlans?.filter((plan: SubscriptionPlan) => plan.isActive).length || 0}
              </div>
              <p className="text-xs text-gray-400">
                disponibles para venta
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Rango de Precios</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${Math.min(...(subscriptionPlans?.map((p: SubscriptionPlan) => p.monthlyPrice) || [0]))} - 
                ${Math.max(...(subscriptionPlans?.map((p: SubscriptionPlan) => p.monthlyPrice) || [0]))}
              </div>
              <p className="text-xs text-gray-400">
                rango mensual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Configuration Guidelines */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-600/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-300">
              <Settings className="w-5 h-5" />
              Configuración de Planes - SuperAdmin
            </CardTitle>
            <CardDescription className="text-purple-200">
              Gestión global de planes de suscripción para todas las empresas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
                <p className="text-gray-300">
                  <strong className="text-white">Crear/Editar Planes:</strong> Configura nuevos planes o modifica existentes con precios y límites de VetSites
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5"></div>
                <p className="text-gray-300">
                  <strong className="text-white">Gestión Global:</strong> Los cambios aplican a todas las empresas y afectan nuevas suscripciones
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                <p className="text-gray-300">
                  <strong className="text-white">Control de Precios:</strong> Establece precios mensuales y anuales para cada nivel de suscripción
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(EnterpriseSubscriptionAdmin);