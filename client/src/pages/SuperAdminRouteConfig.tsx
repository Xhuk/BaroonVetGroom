import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Settings, MapPin, DollarSign, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { BackButton } from "@/components/BackButton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RouteOptimizationConfig {
  id: string;
  companyId: string;
  provider: 'mapbox' | 'google' | 'here' | 'none';
  isEnabled: boolean;
  apiKey?: string;
  monthlyUsageLimit: number;
  currentUsage: number;
  pricePerRequest: number;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  config?: RouteOptimizationConfig;
}

export default function SuperAdminRouteConfig() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: 'none' as const,
    isEnabled: false,
    apiKey: '',
    monthlyUsageLimit: 1000,
    pricePerRequest: 0.005
  });

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/superadmin/companies-route-config"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ companyId, config }: { companyId: string, config: any }) => {
      return await apiRequest(`/api/superadmin/route-config/${companyId}`, {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/companies-route-config"] });
      setEditingCompany(null);
      toast({
        title: "Configuración Actualizada",
        description: "La configuración de optimización de rutas se ha actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (company: Company) => {
    setEditingCompany(company.id);
    setFormData({
      provider: company.config?.provider || 'none',
      isEnabled: company.config?.isEnabled || false,
      apiKey: company.config?.apiKey || '',
      monthlyUsageLimit: company.config?.monthlyUsageLimit || 1000,
      pricePerRequest: company.config?.pricePerRequest || 0.005
    });
  };

  const handleSave = () => {
    if (!editingCompany) return;
    
    updateConfigMutation.mutate({
      companyId: editingCompany,
      config: formData
    });
  };

  const providerInfo = {
    none: { name: 'Sin Optimización', color: 'bg-gray-100 text-gray-800', icon: '⭕' },
    mapbox: { name: 'Mapbox', color: 'bg-blue-100 text-blue-800', icon: '🗺️' },
    google: { name: 'Google Maps', color: 'bg-green-100 text-green-800', icon: '🌍' },
    here: { name: 'HERE Maps', color: 'bg-purple-100 text-purple-800', icon: '📍' }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton 
            href="/superadmin"
            text="Volver a Super Admin"
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
            testId="button-back-to-superadmin"
          />
          <h1 className="text-2xl font-bold text-blue-800">Configuración de Optimización de Rutas</h1>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Proveedores Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Simple Weight-Based</h3>
                <p className="text-sm text-gray-600">Gratuito - Basado en pesos de fraccionamientos</p>
                <Badge className="mt-2 bg-green-100 text-green-800">Gratuito</Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Mapbox Optimization</h3>
                <p className="text-sm text-gray-600">$0.005 por solicitud - Optimización avanzada</p>
                <Badge className="mt-2 bg-blue-100 text-blue-800">Premium</Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Google Routes API</h3>
                <p className="text-sm text-gray-600">$0.005 por solicitud - Datos de tráfico real</p>
                <Badge className="mt-2 bg-green-100 text-green-800">Premium</Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">HERE Routing</h3>
                <p className="text-sm text-gray-600">$0.004 por solicitud - Optimización empresarial</p>
                <Badge className="mt-2 bg-purple-100 text-purple-800">Premium</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {companies?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5" />
                  <span>{company.name}</span>
                  <Badge className={providerInfo[company.config?.provider || 'none'].color}>
                    {providerInfo[company.config?.provider || 'none'].icon} {providerInfo[company.config?.provider || 'none'].name}
                  </Badge>
                  {company.config?.isEnabled && (
                    <Badge className="bg-green-100 text-green-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(company)}
                  data-testid={`button-edit-config-${company.id}`}
                >
                  Configurar
                </Button>
              </CardTitle>
            </CardHeader>
            
            {editingCompany === company.id && (
              <CardContent className="border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="provider">Proveedor de Optimización</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData({ ...formData, provider: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin Optimización (Gratuito)</SelectItem>
                          <SelectItem value="mapbox">Mapbox Optimization</SelectItem>
                          <SelectItem value="google">Google Routes API</SelectItem>
                          <SelectItem value="here">HERE Routing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isEnabled"
                        checked={formData.isEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                      />
                      <Label htmlFor="isEnabled">Habilitar Optimización Avanzada</Label>
                    </div>

                    {formData.provider !== 'none' && (
                      <div>
                        <Label htmlFor="apiKey">API Key del Proveedor</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          value={formData.apiKey}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="Ingrese la API key del proveedor"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="monthlyLimit">Límite Mensual de Solicitudes</Label>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        value={formData.monthlyUsageLimit}
                        onChange={(e) => setFormData({ ...formData, monthlyUsageLimit: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="pricePerRequest">Precio por Solicitud (USD)</Label>
                      <Input
                        id="pricePerRequest"
                        type="number"
                        step="0.001"
                        value={formData.pricePerRequest}
                        onChange={(e) => setFormData({ ...formData, pricePerRequest: parseFloat(e.target.value) })}
                      />
                    </div>

                    {company.config && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Uso Actual
                        </h4>
                        <p className="text-sm text-gray-600">
                          {company.config.currentUsage} / {company.config.monthlyUsageLimit} solicitudes este mes
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(company.config.currentUsage / company.config.monthlyUsageLimit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditingCompany(null)}
                    data-testid="button-cancel-edit"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateConfigMutation.isPending}
                    data-testid="button-save-config"
                  >
                    {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                </div>
              </CardContent>
            )}
            
            {company.config && editingCompany !== company.id && (
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Límite: {company.config.monthlyUsageLimit} solicitudes/mes
                    </div>
                    <div className="text-sm text-gray-600">
                      Usado: {company.config.currentUsage}
                    </div>
                    <div className="text-sm text-gray-600">
                      Precio: ${company.config.pricePerRequest} / solicitud
                    </div>
                  </div>
                  <Badge variant={company.config.isEnabled ? "default" : "secondary"}>
                    {company.config.isEnabled ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}