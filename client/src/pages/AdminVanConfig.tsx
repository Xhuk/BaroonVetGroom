import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Truck, Plus, Settings, Edit, Trash, Grid3x3, PawPrint, Dog, Cat, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VanCage {
  id: string;
  vanId: string;
  cageNumber: number;
  size: 'small' | 'medium' | 'large';
  type: 'cat' | 'dog' | 'mixed';
  position: CagePosition;
  maxWeight: number;
  isOccupied: boolean;
  occupantPetId?: string;
  notes?: string;
  isActive: boolean;
}

interface Van {
  id: string;
  name: string;
  capacity: 'small' | 'medium' | 'large';
  maxPets: number;
  maxWeight: number;
  dailyRoutes: number;
  isActive: boolean;
  tenantId: string;
  cageLayout?: any;
  totalCages: number;
  layoutWidth: number;
  layoutHeight: number;
  cages?: VanCage[];
}

export default function AdminVanConfig() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const [isDesigningLayout, setIsDesigningLayout] = useState(false);
  const [newVan, setNewVan] = useState({
    name: '',
    capacity: 'medium' as 'small' | 'medium' | 'large',
    maxPets: 15,
    maxWeight: 100,
    dailyRoutes: 2,
    layoutWidth: 3,
    layoutHeight: 5,
  });
  const [cageLayout, setCageLayout] = useState<VanCage[]>([]);
  const [selectedCage, setSelectedCage] = useState<VanCage | null>(null);

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

  // Load van cages for selected van
  const { data: vanCages, isLoading: isLoadingCages } = useQuery<VanCage[]>({
    queryKey: ["/api/van-cages", selectedVanId],
    enabled: !!selectedVanId,
    staleTime: 5 * 60 * 1000,
  });

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

  // Cage management mutations
  const createCageMutation = useMutation({
    mutationFn: async (cageData: Partial<VanCage>) => {
      return apiRequest("/api/van-cages", "POST", cageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/van-cages", selectedVanId] });
      toast({
        title: "Jaula Agregada",
        description: "La jaula ha sido configurada exitosamente",
      });
    },
  });

  const updateCageMutation = useMutation({
    mutationFn: async ({ cageId, updates }: { cageId: string; updates: Partial<VanCage> }) => {
      return apiRequest(`/api/van-cages/${cageId}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/van-cages", selectedVanId] });
      toast({
        title: "Jaula Actualizada",
        description: "La configuración de la jaula ha sido actualizada",
      });
    },
  });

  const deleteCageMutation = useMutation({
    mutationFn: async (cageId: string) => {
      return apiRequest(`/api/van-cages/${cageId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/van-cages", selectedVanId] });
      toast({
        title: "Jaula Eliminada",
        description: "La jaula ha sido eliminada del layout",
      });
    },
  });

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

  const getCageTypeIcon = (type: string) => {
    switch (type) {
      case 'cat':
        return <Cat className="w-4 h-4" />;
      case 'dog':
        return <Dog className="w-4 h-4" />;
      default:
        return <PawPrint className="w-4 h-4" />;
    }
  };

  const getCageSizeColor = (size: string) => {
    const colors = {
      small: 'bg-yellow-200 border-yellow-400',
      medium: 'bg-blue-200 border-blue-400',
      large: 'bg-green-200 border-green-400',
    };
    return colors[size as keyof typeof colors] || 'bg-gray-200 border-gray-400';
  };

  const addCageToLayout = (x: number, y: number) => {
    if (!selectedVanId) return;
    
    const newCage: Partial<VanCage> = {
      vanId: selectedVanId,
      cageNumber: (vanCages?.length || 0) + 1,
      size: 'medium',
      type: 'mixed',
      position: { x, y, width: 1, height: 1 },
      maxWeight: 25,
      isOccupied: false,
      isActive: true,
    };
    
    createCageMutation.mutate(newCage);
  };

  const isCagePosition = (x: number, y: number): VanCage | null => {
    if (!vanCages) return null;
    return vanCages.find(cage => 
      cage.position.x === x && cage.position.y === y && cage.isActive
    ) || null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      <div className="p-6 max-w-6xl mx-auto">
        <BackButton className="mb-4" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuración de Vans</h1>
            <p className="text-gray-600 dark:text-gray-400">Administre la flota de vans y configure el layout de jaulas</p>
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

                <Separator className="my-4" />
                <h4 className="font-medium mb-3">Configuración de Layout de Jaulas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="layoutWidth">Ancho (columnas)</Label>
                    <Input
                      id="layoutWidth"
                      type="number"
                      value={newVan.layoutWidth}
                      onChange={(e) => setNewVan({ ...newVan, layoutWidth: parseInt(e.target.value) })}
                      min="2"
                      max="6"
                      data-testid="input-layout-width"
                    />
                  </div>
                  <div>
                    <Label htmlFor="layoutHeight">Alto (filas)</Label>
                    <Input
                      id="layoutHeight"
                      type="number"
                      value={newVan.layoutHeight}
                      onChange={(e) => setNewVan({ ...newVan, layoutHeight: parseInt(e.target.value) })}
                      min="3"
                      max="8"
                      data-testid="input-layout-height"
                    />
                  </div>
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedVanId(van.id)}
                      data-testid={`button-config-cage-${van.id}`}
                    >
                      <Grid3x3 className="w-4 h-4 mr-1" />
                      Jaulas ({van.totalCages || 0})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Configurar Jaulas - {van.name}</DialogTitle>
                    </DialogHeader>
                    <CageLayoutDesigner 
                      van={van}
                      cages={vanCages}
                      isLoading={isLoadingCages}
                      onAddCage={addCageToLayout}
                      onUpdateCage={(cageId, updates) => updateCageMutation.mutate({ cageId, updates })}
                      onDeleteCage={(cageId) => deleteCageMutation.mutate(cageId)}
                    />
                  </DialogContent>
                </Dialog>
                
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
    </div>
  );
}

// Cage Layout Designer Component
interface CageLayoutDesignerProps {
  van: Van;
  cages?: VanCage[];
  isLoading: boolean;
  onAddCage: (x: number, y: number) => void;
  onUpdateCage: (cageId: string, updates: Partial<VanCage>) => void;
  onDeleteCage: (cageId: string) => void;
}

function CageLayoutDesigner({ van, cages = [], isLoading, onAddCage, onUpdateCage, onDeleteCage }: CageLayoutDesignerProps) {
  const [selectedCage, setSelectedCage] = useState<VanCage | null>(null);
  const [newCageSize, setNewCageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [newCageType, setNewCageType] = useState<'cat' | 'dog' | 'mixed'>('mixed');

  const getCageTypeIcon = (type: string) => {
    switch (type) {
      case 'cat':
        return <Cat className="w-4 h-4" />;
      case 'dog':
        return <Dog className="w-4 h-4" />;
      default:
        return <PawPrint className="w-4 h-4" />;
    }
  };

  const getCageSizeColor = (size: string) => {
    const colors = {
      small: 'bg-yellow-200 border-yellow-400 text-yellow-800',
      medium: 'bg-blue-200 border-blue-400 text-blue-800',
      large: 'bg-green-200 border-green-400 text-green-800',
    };
    return colors[size as keyof typeof colors] || 'bg-gray-200 border-gray-400 text-gray-800';
  };

  const findCageAtPosition = (x: number, y: number): VanCage | null => {
    return cages.find(cage => 
      cage.position.x === x && cage.position.y === y && cage.isActive
    ) || null;
  };

  const handleCellClick = (x: number, y: number) => {
    const existingCage = findCageAtPosition(x, y);
    if (existingCage) {
      setSelectedCage(existingCage);
    } else {
      onAddCage(x, y);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="designer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="designer">Diseñador Visual</TabsTrigger>
          <TabsTrigger value="list">Lista de Jaulas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="designer" className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Label>Nueva Jaula:</Label>
              <Select value={newCageSize} onValueChange={(value: 'small' | 'medium' | 'large') => setNewCageSize(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeña</SelectItem>
                  <SelectItem value="medium">Mediana</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={newCageType} onValueChange={(value: 'cat' | 'dog' | 'mixed') => setNewCageType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cat">
                    <div className="flex items-center gap-2">
                      <Cat className="w-4 h-4" />
                      Gatos
                    </div>
                  </SelectItem>
                  <SelectItem value="dog">
                    <div className="flex items-center gap-2">
                      <Dog className="w-4 h-4" />
                      Perros
                    </div>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4" />
                      Mixta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Haz clic en una celda vacía para agregar jaula
            </div>
          </div>

          {/* Van Layout Grid */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
            <div className="grid gap-2" 
                 style={{ 
                   gridTemplateColumns: `repeat(${van.layoutWidth}, 1fr)`,
                   gridTemplateRows: `repeat(${van.layoutHeight}, 1fr)`
                 }}>
              {Array.from({ length: van.layoutWidth * van.layoutHeight }).map((_, index) => {
                const x = index % van.layoutWidth;
                const y = Math.floor(index / van.layoutWidth);
                const cage = findCageAtPosition(x, y);
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`
                      h-16 w-16 border-2 border-dashed border-gray-300 dark:border-gray-600 
                      rounded-lg flex items-center justify-center cursor-pointer
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${cage ? getCageSizeColor(cage.size) + ' border-solid' : ''}
                      ${selectedCage?.id === cage?.id ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => handleCellClick(x, y)}
                    data-testid={`cage-cell-${x}-${y}`}
                  >
                    {cage ? (
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          {getCageTypeIcon(cage.type)}
                        </div>
                        <div className="text-xs font-semibold">#{cage.cageNumber}</div>
                      </div>
                    ) : (
                      <Plus className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Cage Details */}
          {selectedCage && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Jaula #{selectedCage.cageNumber}</h4>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onDeleteCage(selectedCage.id);
                      setSelectedCage(null);
                    }}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tamaño</Label>
                    <Select 
                      value={selectedCage.size} 
                      onValueChange={(size: 'small' | 'medium' | 'large') => 
                        onUpdateCage(selectedCage.id, { size })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeña</SelectItem>
                        <SelectItem value="medium">Mediana</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Tipo</Label>
                    <Select 
                      value={selectedCage.type} 
                      onValueChange={(type: 'cat' | 'dog' | 'mixed') => 
                        onUpdateCage(selectedCage.id, { type })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cat">Gatos</SelectItem>
                        <SelectItem value="dog">Perros</SelectItem>
                        <SelectItem value="mixed">Mixta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Peso Máximo (kg)</Label>
                    <Input
                      type="number"
                      value={selectedCage.maxWeight}
                      onChange={(e) => onUpdateCage(selectedCage.id, { maxWeight: parseInt(e.target.value) })}
                      min="5"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label>Notas</Label>
                  <Input
                    value={selectedCage.notes || ''}
                    onChange={(e) => onUpdateCage(selectedCage.id, { notes: e.target.value })}
                    placeholder="Instrucciones especiales..."
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cages.filter(cage => cage.isActive).map((cage) => (
              <Card key={cage.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getCageSizeColor(cage.size)}>
                        #{cage.cageNumber}
                      </Badge>
                      {getCageTypeIcon(cage.type)}
                    </div>
                    <Badge variant={cage.isOccupied ? "destructive" : "default"}>
                      {cage.isOccupied ? "Ocupada" : "Disponible"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div>Tamaño: <span className="font-medium capitalize">{cage.size}</span></div>
                    <div>Tipo: <span className="font-medium capitalize">{cage.type}</span></div>
                    <div>Peso máx: <span className="font-medium">{cage.maxWeight} kg</span></div>
                    <div>Posición: <span className="font-medium">({cage.position.x}, {cage.position.y})</span></div>
                    {cage.notes && (
                      <div className="text-gray-600 dark:text-gray-400">
                        Notas: {cage.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {cages.filter(cage => cage.isActive).length === 0 && (
            <div className="text-center py-8">
              <Grid3x3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No hay jaulas configuradas
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Use el diseñador visual para agregar jaulas a la van
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}