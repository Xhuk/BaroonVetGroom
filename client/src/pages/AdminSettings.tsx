import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, MapPin, Users, Clock } from "lucide-react";

export default function AdminSettings() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [mapSettings, setMapSettings] = useState({
    diameterKm: 8,
    defaultZoom: 15,
    showStaffTracking: true,
    autoRefreshInterval: 30
  });

  const handleSaveMapSettings = () => {
    // In a real app, this would save to the database
    localStorage.setItem(`mapSettings_${currentTenant?.id}`, JSON.stringify(mapSettings));
    
    toast({
      title: "Configuración guardada",
      description: "Las configuraciones del mapa han sido actualizadas.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Configuración de Administrador</h1>
        </div>
      </div>

      {/* Map Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Configuración del Mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diameterKm">Diámetro del Mapa (km)</Label>
              <Input
                id="diameterKm"
                type="number"
                min="1"
                max="50"
                value={mapSettings.diameterKm}
                onChange={(e) => setMapSettings(prev => ({ 
                  ...prev, 
                  diameterKm: parseInt(e.target.value) || 8 
                }))}
                data-testid="input-map-diameter"
              />
              <p className="text-xs text-gray-500 mt-1">
                Define el área visible en el mapa centrada en la clínica
              </p>
            </div>

            <div>
              <Label htmlFor="defaultZoom">Zoom Predeterminado</Label>
              <Input
                id="defaultZoom"
                type="number"
                min="10"
                max="20"
                value={mapSettings.defaultZoom}
                onChange={(e) => setMapSettings(prev => ({ 
                  ...prev, 
                  defaultZoom: parseInt(e.target.value) || 15 
                }))}
                data-testid="input-default-zoom"
              />
            </div>

            <div>
              <Label htmlFor="autoRefresh">Intervalo de Actualización (segundos)</Label>
              <Input
                id="autoRefresh"
                type="number"
                min="10"
                max="300"
                value={mapSettings.autoRefreshInterval}
                onChange={(e) => setMapSettings(prev => ({ 
                  ...prev, 
                  autoRefreshInterval: parseInt(e.target.value) || 30 
                }))}
                data-testid="input-refresh-interval"
              />
              <p className="text-xs text-gray-500 mt-1">
                Frecuencia de actualización de ubicaciones del personal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showStaffTracking"
              checked={mapSettings.showStaffTracking}
              onChange={(e) => setMapSettings(prev => ({ 
                ...prev, 
                showStaffTracking: e.target.checked 
              }))}
              className="rounded border-gray-300"
              data-testid="checkbox-staff-tracking"
            />
            <Label htmlFor="showStaffTracking" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mostrar seguimiento de personal en tiempo real
            </Label>
          </div>

          <Button 
            onClick={handleSaveMapSettings}
            className="w-full md:w-auto"
            data-testid="button-save-map-settings"
          >
            Guardar Configuración del Mapa
          </Button>
        </CardContent>
      </Card>

      {/* Current Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa de Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold text-blue-700">Área del Mapa</div>
              <div className="text-blue-600">{mapSettings.diameterKm} km de radio</div>
              <div className="text-xs text-blue-500">
                {((mapSettings.diameterKm * 2) ** 2 * Math.PI / 4).toFixed(1)} km² de cobertura
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-semibold text-green-700">Personal</div>
              <div className="text-green-600">
                {mapSettings.showStaffTracking ? 'Seguimiento activo' : 'Seguimiento desactivado'}
              </div>
              <div className="text-xs text-green-500">
                Actualización cada {mapSettings.autoRefreshInterval}s
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-semibold text-purple-700">Zoom</div>
              <div className="text-purple-600">Nivel {mapSettings.defaultZoom}</div>
              <div className="text-xs text-purple-500">
                {mapSettings.defaultZoom >= 16 ? 'Detalle alto' : 
                 mapSettings.defaultZoom >= 14 ? 'Detalle medio' : 'Vista general'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}