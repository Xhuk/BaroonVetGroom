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
import { Plus, Building2, Users, DollarSign, Settings, AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [planConfigDialog, setPlanConfigDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [jsonImportDialog, setJsonImportDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
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

  // Definiciones de características para planes de suscripción
  const availableFeatures = {
    // Gestión de VetSites
    '1_vetsite': 'Acceso a 1 clínica veterinaria',
    '3_vetsites': 'Acceso a hasta 3 clínicas veterinarias',
    '5_vetsites': 'Acceso a hasta 5 clínicas veterinarias',
    '7_vetsites': 'Acceso a hasta 7 clínicas veterinarias',
    '10_vetsites': 'Acceso a hasta 10 clínicas veterinarias',
    'unlimited_vetsites': 'Clínicas veterinarias ilimitadas',
    
    // Características de Citas
    'basic_appointments': 'Sistema básico de reservas (sin asignación de personal/recursos)',
    'unlimited_appointments': 'Citas ilimitadas por clínica con programación completa',
    
    // Características de Reportes
    'basic_reporting': 'Acceso a reportes básicos: clientes, citas, ventas',
    'advanced_reporting': 'Analíticas detalladas: uso de servicios, seguimiento de ingresos, rendimiento de clínica',
    
    // Características de Soporte
    'email_support': 'Soporte proporcionado por correo electrónico (tiempo de respuesta estándar)',
    'priority_support': 'Tiempo de respuesta más rápido por correo o WhatsApp (cola premium)',
    'phone_support': 'Línea de soporte telefónico incluida',
    'dedicated_support': 'Gerente de éxito asignado o capacitación premium',
    
    // Características de Integración
    'whatsapp_integration': 'Envío de recordatorios, confirmaciones y seguimientos de citas por WhatsApp',
    'grooming_module': 'Características específicas de peluquería: programación de baños, notas, historial',
    'delivery_tracking': 'Seguimiento de entregas de medicinas/productos desde clínica hasta cliente',
    'api_access': 'Acceso a API pública para integraciones externas',
    'custom_integrations': 'Servicio de integración para ERP/CRM/pagos por caso empresarial',
    'multi_location_dashboard': 'Panel centralizado para monitorear todas las clínicas (para cadenas/franquicias)'
  };

  // JSON Validation function
  const validateJsonConfiguration = (jsonString: string) => {
    try {
      const parsedJson = JSON.parse(jsonString);
      
      // Check required top-level properties
      if (!parsedJson.hasOwnProperty('plans') || !Array.isArray(parsedJson.plans)) {
        return { isValid: false, error: 'Propiedad "plans" requerida y debe ser un array' };
      }
      
      if (parsedJson.plans.length === 0) {
        return { isValid: false, error: 'El array "plans" no puede estar vacío' };
      }
      
      // Validate each plan
      for (let i = 0; i < parsedJson.plans.length; i++) {
        const plan = parsedJson.plans[i];
        const planIndex = i + 1;
        
        // Check required plan properties
        const requiredProps = ['name', 'description', 'monthly_price_mxn', 'yearly_price_mxn', 'max_vetsites'];
        for (const prop of requiredProps) {
          if (!plan.hasOwnProperty(prop)) {
            return { isValid: false, error: `Plan ${planIndex}: Propiedad "${prop}" requerida` };
          }
        }
        
        // Validate data types
        if (typeof plan.name !== 'string' || plan.name.trim() === '') {
          return { isValid: false, error: `Plan ${planIndex}: "name" debe ser un texto no vacío` };
        }
        
        if (typeof plan.description !== 'string' || plan.description.trim() === '') {
          return { isValid: false, error: `Plan ${planIndex}: "description" debe ser un texto no vacío` };
        }
        
        if (typeof plan.monthly_price_mxn !== 'number' || plan.monthly_price_mxn < 0) {
          return { isValid: false, error: `Plan ${planIndex}: "monthly_price_mxn" debe ser un número positivo` };
        }
        
        if (typeof plan.yearly_price_mxn !== 'number' || plan.yearly_price_mxn < 0) {
          return { isValid: false, error: `Plan ${planIndex}: "yearly_price_mxn" debe ser un número positivo` };
        }
        
        if (typeof plan.max_vetsites !== 'number' || plan.max_vetsites < 1) {
          return { isValid: false, error: `Plan ${planIndex}: "max_vetsites" debe ser un número mayor a 0` };
        }
        
        // Validate features array if present
        if (plan.features && !Array.isArray(plan.features)) {
          return { isValid: false, error: `Plan ${planIndex}: "features" debe ser un array` };
        }
        
        // Validate status if present
        if (plan.status && typeof plan.status !== 'string') {
          return { isValid: false, error: `Plan ${planIndex}: "status" debe ser un texto` };
        }
      }
      
      return { isValid: true, parsedData: parsedJson };
    } catch (error) {
      return { isValid: false, error: `JSON inválido: ${error.message}` };
    }
  };

  // Handle JSON input change with real-time validation
  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    
    if (value.trim() === '') {
      setJsonValidationError(null);
      return;
    }
    
    const validation = validateJsonConfiguration(value);
    if (!validation.isValid) {
      setJsonValidationError(validation.error);
    } else {
      setJsonValidationError(null);
    }
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

  // Delete subscription plan
  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/superadmin/subscription-plans/${planId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/subscription-plans'] });
      toast({
        title: "✅ Plan Eliminado",
        description: "El plan de suscripción ha sido eliminado correctamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al Eliminar",
        description: error?.message || "Error al eliminar el plan de suscripción",
        variant: "destructive",
      });
    },
  });

  const handleDeletePlan = (planId: string, planName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el plan "${planName}"? Esta acción no se puede deshacer.`)) {
      deletePlan.mutate(planId);
    }
  };

  // Bulk import subscription plans from JSON
  const importPlans = useMutation({
    mutationFn: async (jsonData: any) => {
      const response = await fetch('/api/superadmin/subscription-plans/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });
      if (!response.ok) throw new Error('Failed to import plans');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/subscription-plans'] });
      setJsonImportDialog(false);
      setJsonInput('');
      setJsonValidationError(null);
      
      toast({
        title: "✅ Importación Exitosa",
        description: data.message || "Planes de suscripción importados correctamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error de Importación",
        description: error?.message || "Error al importar planes de suscripción",
        variant: "destructive",
      });
    },
  });

  const handleJsonImport = () => {
    // Validate JSON before importing
    const validation = validateJsonConfiguration(jsonInput);
    
    if (!validation.isValid) {
      toast({
        title: "❌ Error de Validación",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    importPlans.mutate(validation.parsedData);
  };

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
            {/* JSON Import Button */}
            <Dialog open={jsonImportDialog} onOpenChange={setJsonImportDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                  data-testid="button-json-import"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Importar JSON
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-purple-300 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Importar Configuración de Planes
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Pega el JSON con la configuración de planes para importar o reconfigurar todos los planes de suscripción
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Configuración JSON</Label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => handleJsonInputChange(e.target.value)}
                      className={`w-full h-96 bg-gray-700 text-white p-3 rounded-lg font-mono text-sm resize-none ${
                        jsonValidationError 
                          ? 'border-2 border-red-500' 
                          : jsonInput.trim() && !jsonValidationError
                          ? 'border-2 border-green-500'
                          : 'border border-gray-600'
                      }`}
                      placeholder={`{
  "trial_days": 10,
  "monthly_multiplier": 1.5,
  "plans": [
    {
      "name": "Básico",
      "description": "Perfecto para operaciones de clínica única",
      "status": "Activo",
      "monthly_price_mxn": 299,
      "yearly_price_mxn": 2990,
      "max_vetsites": 1,
      "features": [
        "1_vetsite",
        "unlimited_appointments",
        "basic_reporting",
        "email_support",
        "whatsapp_integration"
      ]
    },
    {
      "name": "Mediano",
      "description": "Ideal para prácticas veterinarias en crecimiento",
      "status": "Activo",
      "monthly_price_mxn": 699,
      "yearly_price_mxn": 6990,
      "max_vetsites": 3,
      "features": [
        "3_vetsites",
        "unlimited_appointments",
        "advanced_reporting",
        "priority_support",
        "whatsapp_integration",
        "grooming_module"
      ]
    }
  ]
}`}
                      data-testid="textarea-json-input"
                    />
                    
                    {/* Validation Error Display */}
                    {jsonValidationError && (
                      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-300">Error de Validación</span>
                        </div>
                        <p className="mt-2 text-sm text-red-200">{jsonValidationError}</p>
                      </div>
                    )}
                    
                    {/* Success Validation Display */}
                    {jsonInput.trim() && !jsonValidationError && (
                      <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium text-green-300">JSON Válido</span>
                        </div>
                        <p className="mt-2 text-sm text-green-200">La configuración JSON es válida y está lista para importar</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                    <div className="text-sm text-blue-300">
                      <strong>Formato Esperado:</strong>
                      <ul className="mt-2 space-y-1 text-xs text-blue-200">
                        <li>• <code>trial_days</code>: Días de prueba gratuita</li>
                        <li>• <code>monthly_multiplier</code>: Multiplicador para cálculo de precios</li>
                        <li>• <code>plans</code>: Array de planes con name, description, status, precios, max_vetsites, features</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setJsonImportDialog(false);
                        setJsonInput('');
                        setJsonValidationError(null);
                      }}
                      className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleJsonImport}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={importPlans.isPending || !jsonInput.trim() || !!jsonValidationError}
                    >
                      {importPlans.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          Importar Planes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Features Admin Button */}
            <Button 
              onClick={() => window.open('/superadmin/features', '_blank')}
              variant="outline"
              className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              data-testid="button-features-admin"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Características
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
                  
                  <div className="space-y-2">
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
                    <Button
                      onClick={() => handleDeletePlan(plan.id, plan.displayName || plan.name)}
                      className="w-full bg-red-600 hover:bg-red-700"
                      size="sm"
                      disabled={deletePlan.isPending}
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deletePlan.isPending ? "Eliminando..." : "Eliminar Plan"}
                    </Button>
                  </div>
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