import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { DebugControls } from "@/components/DebugControls";
import { 
  Settings, 
  CreditCard, 
  Truck, 
  FileText, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface BillingConfig {
  companyId: string;
  autoGenerateMedicalInvoices: boolean;
  autoGenerateGroomingInvoices: boolean;
  allowAdvanceScheduling: boolean;
  autoScheduleDelivery: boolean;
  groomingFollowUpDays: number;
  groomingFollowUpVariance: number;
  enableGroomingFollowUp: boolean;
  // Clinical Intervention Pricing
  clinicalInterventionPricing: 'operation_plus_items' | 'flat_price';
  enableItemizedCharges: boolean;
  allowCashierAddItems: boolean;
  deliverySchedulingRules?: any;
  billingRules?: any;
}

export default function AdminBillingConfig() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAccessAdmin } = useAccessControl();
  const [config, setConfig] = useState<BillingConfig>({
    companyId: '',
    autoGenerateMedicalInvoices: false,
    autoGenerateGroomingInvoices: false,
    allowAdvanceScheduling: true,
    autoScheduleDelivery: false,
    groomingFollowUpDays: 30,
    groomingFollowUpVariance: 7,
    enableGroomingFollowUp: true,
    clinicalInterventionPricing: 'operation_plus_items',
    enableItemizedCharges: true,
    allowCashierAddItems: true
  });

  const { data: billingConfig, isLoading } = useQuery({
    queryKey: ['/api/company-billing-config', currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: BillingConfig) => {
      const response = await fetch(`/api/company-billing-config/${currentTenant?.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) {
        throw new Error('Failed to update billing config');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de facturación y delivery se ha actualizado correctamente.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/company-billing-config', currentTenant?.companyId] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (billingConfig && currentTenant?.companyId) {
      setConfig({
        companyId: currentTenant.companyId,
        autoGenerateMedicalInvoices: (billingConfig as any).autoGenerateMedicalInvoices || false,
        autoGenerateGroomingInvoices: (billingConfig as any).autoGenerateGroomingInvoices || false,
        allowAdvanceScheduling: (billingConfig as any).allowAdvanceScheduling !== false,
        autoScheduleDelivery: (billingConfig as any).autoScheduleDelivery || false,
        groomingFollowUpDays: (billingConfig as any).groomingFollowUpDays || 30,
        groomingFollowUpVariance: (billingConfig as any).groomingFollowUpVariance || 7,
        enableGroomingFollowUp: (billingConfig as any).enableGroomingFollowUp ?? true,
        clinicalInterventionPricing: (billingConfig as any).clinicalInterventionPricing || 'operation_plus_items',
        enableItemizedCharges: (billingConfig as any).enableItemizedCharges ?? true,
        allowCashierAddItems: (billingConfig as any).allowCashierAddItems ?? true,
        deliverySchedulingRules: (billingConfig as any).deliverySchedulingRules,
        billingRules: (billingConfig as any).billingRules
      });
    }
  }, [billingConfig, currentTenant?.companyId]);

  const handleSave = () => {
    if (!currentTenant?.companyId) return;
    updateConfigMutation.mutate(config);
  };

  const updateField = (field: keyof BillingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Check page access
  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-muted-foreground mb-2">
              Acceso Denegado
            </h1>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configuración de Facturación y Delivery</h1>
            <p className="text-muted-foreground">
              Configura la automatización de facturas y programación de entregas
            </p>
          </div>
          <DebugControls />
        </div>

        <div className="grid gap-6">
          {/* Medical Billing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Facturación Médica
              </CardTitle>
              <CardDescription>
                Configuración para la generación automática de facturas en consultas médicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-medical-invoices"
                  checked={config.autoGenerateMedicalInvoices}
                  onCheckedChange={(checked) => updateField('autoGenerateMedicalInvoices', checked)}
                  data-testid="switch-auto-medical-invoices"
                />
                <Label htmlFor="auto-medical-invoices">
                  Generar facturas automáticamente para consultas médicas
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Cuando está habilitado, se creará automáticamente una factura cada vez que se complete una consulta médica,
                incluyendo el costo de insumos y servicios.
              </p>
            </CardContent>
          </Card>

          {/* Grooming Billing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facturación de Grooming
              </CardTitle>
              <CardDescription>
                Configuración para la facturación automática de servicios de grooming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-grooming-invoices"
                  checked={config.autoGenerateGroomingInvoices}
                  onCheckedChange={(checked) => updateField('autoGenerateGroomingInvoices', checked)}
                  data-testid="switch-auto-grooming-invoices"
                />
                <Label htmlFor="auto-grooming-invoices">
                  Generar facturas automáticamente para servicios de grooming
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Se generará una factura automáticamente al completar cada sesión de grooming.
              </p>
            </CardContent>
          </Card>

          {/* Clinical Intervention Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Precios de Intervenciones Clínicas
              </CardTitle>
              <CardDescription>
                Configuración del modelo de precios para intervenciones médicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Modelo de Precios</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="operation-plus-items"
                      name="pricing-model"
                      value="operation_plus_items"
                      checked={config.clinicalInterventionPricing === 'operation_plus_items'}
                      onChange={(e) => updateField('clinicalInterventionPricing', e.target.value)}
                      data-testid="radio-operation-plus-items"
                    />
                    <Label htmlFor="operation-plus-items" className="cursor-pointer">
                      Operación + Ítems Utilizados
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Cobrar el precio de la operación más cada medicamento, material o ítem utilizado
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="flat-price"
                      name="pricing-model"
                      value="flat_price"
                      checked={config.clinicalInterventionPricing === 'flat_price'}
                      onChange={(e) => updateField('clinicalInterventionPricing', e.target.value)}
                      data-testid="radio-flat-price"
                    />
                    <Label htmlFor="flat-price" className="cursor-pointer">
                      Precio Fijo por Intervención
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Cobrar un precio fijo que incluye toda la intervención y materiales utilizados
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-itemized-charges"
                  checked={config.enableItemizedCharges}
                  onCheckedChange={(checked) => updateField('enableItemizedCharges', checked)}
                  data-testid="switch-enable-itemized-charges"
                />
                <Label htmlFor="enable-itemized-charges">
                  Permitir cargos detallados en la caja
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-cashier-add-items"
                  checked={config.allowCashierAddItems}
                  onCheckedChange={(checked) => updateField('allowCashierAddItems', checked)}
                  data-testid="switch-allow-cashier-add-items"
                />
                <Label htmlFor="allow-cashier-add-items">
                  Permitir al cajero agregar productos adicionales
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta configuración afecta cómo la caja puede manejar medicamentos, accesorios, vacunas y desparasitantes
              </p>
            </CardContent>
          </Card>

          {/* Delivery Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Programación de Entregas
              </CardTitle>
              <CardDescription>
                Configuración para la programación automática de entregas de mascotas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-schedule-delivery"
                  checked={config.autoScheduleDelivery}
                  onCheckedChange={(checked) => updateField('autoScheduleDelivery', checked)}
                  data-testid="switch-auto-schedule-delivery"
                />
                <Label htmlFor="auto-schedule-delivery">
                  Programar entregas automáticamente después del grooming
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Cuando está habilitado, se programará automáticamente una entrega para el día siguiente
                después de completar una sesión de grooming.
              </p>
            </CardContent>
          </Card>

          {/* Advance Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Programación Avanzada
              </CardTitle>
              <CardDescription>
                Permite programar citas futuras desde consultas médicas y grooming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-advance-scheduling"
                  checked={config.allowAdvanceScheduling}
                  onCheckedChange={(checked) => updateField('allowAdvanceScheduling', checked)}
                  data-testid="switch-allow-advance-scheduling"
                />
                <Label htmlFor="allow-advance-scheduling">
                  Permitir programación de citas futuras
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Los veterinarios y groomers podrán programar citas de seguimiento directamente
                desde el formulario de consulta o grooming.
              </p>
            </CardContent>
          </Card>

          {/* Configuration JSON */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración Avanzada
              </CardTitle>
              <CardDescription>
                Configuración JSON para reglas personalizadas de facturación y entregas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="billing-rules">Reglas de Facturación (JSON)</Label>
                <Textarea
                  id="billing-rules"
                  placeholder='{"defaultServiceCost": 100, "suppliesMarkup": 0.2}'
                  value={config.billingRules ? JSON.stringify(config.billingRules, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                      updateField('billingRules', parsed);
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  data-testid="textarea-billing-rules"
                />
              </div>
              <div>
                <Label htmlFor="delivery-rules">Reglas de Entrega (JSON)</Label>
                <Textarea
                  id="delivery-rules"
                  placeholder='{"defaultDeliveryDays": 1, "maxDeliveriesPerDay": 20}'
                  value={config.deliverySchedulingRules ? JSON.stringify(config.deliverySchedulingRules, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                      updateField('deliverySchedulingRules', parsed);
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  data-testid="textarea-delivery-rules"
                />
              </div>
            </CardContent>
          </Card>

          {/* Grooming Follow-up Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuración de Seguimiento de Grooming
              </CardTitle>
              <CardDescription>
                Configura las citas de seguimiento automáticas para servicios de grooming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableGroomingFollowUp">Habilitar Seguimiento Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Programa automáticamente citas de seguimiento para grooming
                  </p>
                </div>
                <Switch
                  id="enableGroomingFollowUp"
                  checked={config.enableGroomingFollowUp}
                  onCheckedChange={(checked) => updateField('enableGroomingFollowUp', checked)}
                />
              </div>

              {config.enableGroomingFollowUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="groomingFollowUpDays">Días para Próxima Cita</Label>
                    <Input
                      id="groomingFollowUpDays"
                      type="number"
                      min="1"
                      max="365"
                      value={config.groomingFollowUpDays}
                      onChange={(e) => updateField('groomingFollowUpDays', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Días por defecto entre servicios de grooming
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groomingFollowUpVariance">Margen de Recordatorio (±días)</Label>
                    <Input
                      id="groomingFollowUpVariance"
                      type="number"
                      min="1"
                      max="30"
                      value={config.groomingFollowUpVariance}
                      onChange={(e) => updateField('groomingFollowUpVariance', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recordatorio {config.groomingFollowUpVariance} días antes de la cita sugerida
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Configuración Actual:</p>
                    <p className="text-blue-700">
                      Próxima cita programada cada <strong>{config.groomingFollowUpDays} días</strong>
                    </p>
                    <p className="text-blue-700">
                      Recordatorio enviado <strong>{config.groomingFollowUpVariance} días antes</strong> de la fecha sugerida
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={updateConfigMutation.isPending}
              data-testid="button-save-config"
            >
              {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}