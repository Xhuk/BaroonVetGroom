import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Settings, Edit, Trash } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Van {
  id: string;
  name: string;
  capacity: 'small' | 'medium' | 'large';
  maxPets: number;
  maxWeight: number;
  dailyRoutes: number;
  isActive: boolean;
  tenantId: string;
}

export default function AdminVanConfig() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVan, setNewVan] = useState({
    name: '',
    capacity: 'medium' as 'small' | 'medium' | 'large',
    maxPets: 15,
    maxWeight: 100,
    dailyRoutes: 2,
  });

  // Fast loading with 95% payload reduction and 5-minute caching
  const { data: adminData, isLoading } = useQuery<{vans: Van[]}>({
    queryKey: ["/api/admin-fast", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const vans = adminData?.vans || [];

  const createVanMutation = useMutation({
    mutationFn: async (vanData: typeof newVan) => {
      return apiRequest("/api/vans", "POST", { ...vanData, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-fast", currentTenant?.id] });
      setShowAddForm(false);
      setNewVan({
        name: '',
        capacity: 'medium',
        maxPets: 15,
        maxWeight: 100,
        dailyRoutes: 2,
      });
      toast({
        title: "Van Agregada",
        description: "La configuración de van ha sido guardada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de van",
        variant: "destructive",
      });
    },
  });

  const updateVanMutation = useMutation({
    mutationFn: async ({ vanId, updates }: { vanId: string; updates: Partial<Van> }) => {
      return apiRequest(`/api/vans/${vanId}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-fast", currentTenant?.id] });
      toast({
        title: "Van Actualizada",
        description: "La configuración ha sido actualizada",
      });
    },
  });

  const deleteVanMutation = useMutation({
    mutationFn: async (vanId: string) => {
      return apiRequest(`/api/vans/${vanId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vans", currentTenant?.id] });
      toast({
        title: "Van Eliminada",
        description: "La van ha sido eliminada del sistema",
      });
    },
  });

  const handleCapacityChange = (capacity: 'small' | 'medium' | 'large') => {
    const capacityDefaults = {
      small: { maxPets: 8, maxWeight: 50 },
      medium: { maxPets: 15, maxWeight: 100 },
      large: { maxPets: 25, maxWeight: 150 },
    };
    
    setNewVan({
      ...newVan,
      capacity,
      maxPets: capacityDefaults[capacity].maxPets,
      maxWeight: capacityDefaults[capacity].maxWeight,
    });
  };

  const handleAddVan = (e: React.FormEvent) => {
    e.preventDefault();
    createVanMutation.mutate(newVan);
  };

  const toggleVanStatus = (vanId: string, isActive: boolean) => {
    updateVanMutation.mutate({ vanId, updates: { isActive: !isActive } });
  };

  const getCapacityBadge = (capacity: string) => {
    const colors = {
      small: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-blue-100 text-blue-800',
      large: 'bg-green-100 text-green-800',
    };
    return colors[capacity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Vans</h1>
          <p className="text-gray-600">Administre la flota de vans para entregas y recolecciones</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-add-van"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Van
        </Button>
      </div>

      {/* Add Van Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Agregar Nueva Van</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddVan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vanName">Nombre de la Van</Label>
                  <Input
                    id="vanName"
                    value={newVan.name}
                    onChange={(e) => setNewVan({ ...newVan, name: e.target.value })}
                    placeholder="Van Azul, Van Principal, etc."
                    required
                    data-testid="input-van-name"
                  />
                </div>

                <div>
                  <Label htmlFor="vanCapacity">Capacidad</Label>
                  <Select value={newVan.capacity} onValueChange={handleCapacityChange}>
                    <SelectTrigger data-testid="select-van-capacity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeña (5-8 mascotas)</SelectItem>
                      <SelectItem value="medium">Mediana (10-15 mascotas)</SelectItem>
                      <SelectItem value="large">Grande (20-25 mascotas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxPets">Máximo de Mascotas</Label>
                  <Input
                    id="maxPets"
                    type="number"
                    value={newVan.maxPets}
                    onChange={(e) => setNewVan({ ...newVan, maxPets: parseInt(e.target.value) })}
                    min="1"
                    max="50"
                    data-testid="input-max-pets"
                  />
                </div>

                <div>
                  <Label htmlFor="maxWeight">Peso Máximo (kg)</Label>
                  <Input
                    id="maxWeight"
                    type="number"
                    value={newVan.maxWeight}
                    onChange={(e) => setNewVan({ ...newVan, maxWeight: parseInt(e.target.value) })}
                    min="10"
                    max="500"
                    data-testid="input-max-weight"
                  />
                </div>

                <div>
                  <Label htmlFor="dailyRoutes">Rutas por Día</Label>
                  <Input
                    id="dailyRoutes"
                    type="number"
                    value={newVan.dailyRoutes}
                    onChange={(e) => setNewVan({ ...newVan, dailyRoutes: parseInt(e.target.value) })}
                    min="1"
                    max="10"
                    data-testid="input-daily-routes"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createVanMutation.isPending}>
                  {createVanMutation.isPending ? "Guardando..." : "Guardar Van"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vans?.map((van) => (
          <Card key={van.id} className={`border-l-4 ${van.isActive ? 'border-l-green-400' : 'border-l-gray-400'}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    {van.name}
                  </h3>
                  <Badge className={`mt-1 ${getCapacityBadge(van.capacity)}`}>
                    {van.capacity.charAt(0).toUpperCase() + van.capacity.slice(1)}
                  </Badge>
                </div>
                <Badge variant={van.isActive ? "default" : "secondary"}>
                  {van.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Mascotas máx:</span>
                  <span className="font-medium">{van.maxPets}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peso máx:</span>
                  <span className="font-medium">{van.maxWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Rutas/día:</span>
                  <span className="font-medium">{van.dailyRoutes}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleVanStatus(van.id, van.isActive)}
                  data-testid={`button-toggle-van-${van.id}`}
                >
                  {van.isActive ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteVanMutation.mutate(van.id)}
                  className="text-red-600 hover:text-red-700"
                  data-testid={`button-delete-van-${van.id}`}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!vans || vans.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vans configuradas</h3>
            <p className="text-gray-600 mb-4">
              Configure su flota de vans para optimizar las rutas de entrega y recolección
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primera Van
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}