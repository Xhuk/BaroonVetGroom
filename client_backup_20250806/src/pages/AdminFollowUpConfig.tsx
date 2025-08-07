import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Heart, Save, Settings, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { FollowUpNotification } from "@/components/FollowUpNotification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface FollowUpConfig {
  followUpNormalThreshold: number;
  followUpUrgentThreshold: number;
  followUpHeartBeatEnabled: boolean;
  followUpShowCount: boolean;
}

export default function AdminFollowUpConfig() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get follow-up configuration
  const { data: config, isLoading } = useQuery<FollowUpConfig>({
    queryKey: ["/api/company/follow-up-config", currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  const [formData, setFormData] = useState<FollowUpConfig>({
    followUpNormalThreshold: 10,
    followUpUrgentThreshold: 20,
    followUpHeartBeatEnabled: true,
    followUpShowCount: true,
  });

  // Update form data when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: FollowUpConfig) => {
      return await apiRequest(`/api/company/follow-up-config/${currentTenant?.companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/company/follow-up-config", currentTenant?.companyId] 
      });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de seguimientos ha sido guardada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.followUpNormalThreshold >= formData.followUpUrgentThreshold) {
      toast({
        title: "Error de validación",
        description: "El umbral normal debe ser menor que el umbral urgente.",
        variant: "destructive",
      });
      return;
    }

    if (formData.followUpNormalThreshold < 1 || formData.followUpUrgentThreshold < 1) {
      toast({
        title: "Error de validación",
        description: "Los umbrales deben ser números positivos.",
        variant: "destructive",
      });
      return;
    }

    updateConfigMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Configuración de Seguimientos</h1>
            <p className="text-muted-foreground">
              Configura las notificaciones del corazón palpitante para seguimientos médicos
            </p>
          </div>
        </div>
        
        {/* Preview of current notification */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground">Vista previa:</span>
          <FollowUpNotification />
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta configuración afecta a todos los usuarios de la empresa. El corazón palpitará lentamente cuando 
          se alcance el umbral normal y rápidamente cuando se alcance el umbral urgente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuración de Umbrales</span>
          </CardTitle>
          <CardDescription>
            Define cuándo el corazón debe empezar a palpitar y a qué velocidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="normalThreshold">Umbral Normal (Palpitación Lenta)</Label>
                <Input
                  id="normalThreshold"
                  type="number"
                  min="1"
                  value={formData.followUpNormalThreshold}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      followUpNormalThreshold: parseInt(e.target.value) || 1,
                    }))
                  }
                  data-testid="input-normal-threshold"
                />
                <p className="text-sm text-muted-foreground">
                  Número de seguimientos pendientes para iniciar palpitación lenta
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgentThreshold">Umbral Urgente (Palpitación Rápida)</Label>
                <Input
                  id="urgentThreshold"
                  type="number"
                  min="1"
                  value={formData.followUpUrgentThreshold}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      followUpUrgentThreshold: parseInt(e.target.value) || 1,
                    }))
                  }
                  data-testid="input-urgent-threshold"
                />
                <p className="text-sm text-muted-foreground">
                  Número de seguimientos pendientes para palpitación rápida
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Opciones de Visualización</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar Palpitación del Corazón</Label>
                    <p className="text-sm text-muted-foreground">
                      Activar o desactivar la animación de palpitación
                    </p>
                  </div>
                  <Switch
                    checked={formData.followUpHeartBeatEnabled}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, followUpHeartBeatEnabled: checked }))
                    }
                    data-testid="switch-heartbeat-enabled"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar Contador de Seguimientos</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar badge con el número de seguimientos pendientes
                    </p>
                  </div>
                  <Switch
                    checked={formData.followUpShowCount}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, followUpShowCount: checked }))
                    }
                    data-testid="switch-show-count"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateConfigMutation.isPending}
                className="flex items-center space-x-2"
                data-testid="button-save-config"
              >
                <Save className="h-4 w-4" />
                <span>
                  {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Usuario:</span> {user?.email}
            </div>
            <div>
              <span className="font-medium">Empresa:</span> {currentTenant?.companyId}
            </div>
            <div>
              <span className="font-medium">Tenant:</span> {currentTenant?.subdomain}
            </div>
            <div>
              <span className="font-medium">Configuración actual:</span> 
              Normal: {config?.followUpNormalThreshold || "N/A"}, 
              Urgente: {config?.followUpUrgentThreshold || "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}