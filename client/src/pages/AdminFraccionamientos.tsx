import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Header } from "@/components/Header";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit3, 
  Save, 
  X, 
  MapPin, 
  Weight, 
  Star,
  Loader2,
  Trash2,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Fraccionamiento {
  id: string;
  name: string;
  displayName: string;
  latitude: string | null;
  longitude: string | null;
  weight: string;
  priority: number;
  isActive: boolean;
  postalCode: string | null;
  notes: string | null;
  tenantId: string;
}

export default function AdminFraccionamientos() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFraccionamiento, setNewFraccionamiento] = useState({
    name: "",
    displayName: "",
    latitude: "",
    longitude: "",
    weight: "1.0",
    priority: 1,
    isActive: true,
    postalCode: "",
    notes: ""
  });

  // Fetch fraccionamientos
  const { data: fraccionamientos = [], isLoading } = useQuery({
    queryKey: ['/api/admin/fraccionamientos', currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/fraccionamientos/${currentTenant?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create fraccionamiento');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fraccionamiento creado",
        description: "El fraccionamiento ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fraccionamientos'] });
      setShowAddDialog(false);
      setNewFraccionamiento({
        name: "",
        displayName: "",
        latitude: "",
        longitude: "",
        weight: "1.0",
        priority: 1,
        isActive: true,
        postalCode: "",
        notes: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el fraccionamiento",
        variant: "destructive",
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/admin/fraccionamientos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update fraccionamiento');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fraccionamiento actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fraccionamientos'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el fraccionamiento",
        variant: "destructive",
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/fraccionamientos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete fraccionamiento');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fraccionamiento eliminado",
        description: "El fraccionamiento ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fraccionamientos'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el fraccionamiento",
        variant: "destructive",
      });
    }
  });

  const handleSave = (fraccionamiento: Fraccionamiento) => {
    const { id, tenantId, ...updateData } = fraccionamiento;
    updateMutation.mutate({ id, data: updateData });
  };

  const handleCreate = () => {
    if (!newFraccionamiento.name || !newFraccionamiento.displayName) {
      toast({
        title: "Error",
        description: "El nombre y nombre para mostrar son requeridos",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newFraccionamiento);
  };

  const filteredFraccionamientos = Array.isArray(fraccionamientos) ? fraccionamientos.filter((frac: Fraccionamiento) =>
    frac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    frac.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Cargando fraccionamientos...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MapPin className="h-8 w-8 text-blue-600" />
                Gestión de Fraccionamientos
              </h1>
              <p className="text-gray-600 mt-2">Administra pesos y prioridades para optimización de rutas</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Agregar Fraccionamiento
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar fraccionamientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Array.isArray(fraccionamientos) ? fraccionamientos.length : 0}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Array.isArray(fraccionamientos) ? fraccionamientos.filter((f: Fraccionamiento) => f.isActive).length : 0}
                </div>
                <div className="text-sm text-gray-600">Activos</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fraccionamientos List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFraccionamientos.map((fraccionamiento: Fraccionamiento) => (
            <Card key={fraccionamiento.id} className={`${!fraccionamiento.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {fraccionamiento.displayName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">P{fraccionamiento.priority}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(editingId === fraccionamiento.id ? null : fraccionamiento.id)}
                      data-testid={`button-edit-${fraccionamiento.id}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(fraccionamiento.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${fraccionamiento.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {editingId === fraccionamiento.id ? (
                  <FraccionamientoEditForm
                    fraccionamiento={fraccionamiento}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                    isSaving={updateMutation.isPending}
                  />
                ) : (
                  <FraccionamientoDisplay fraccionamiento={fraccionamiento} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFraccionamientos.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No se encontraron fraccionamientos' : 'No hay fraccionamientos configurados'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Agrega fraccionamientos para optimizar las rutas de entrega'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    Agregar Primer Fraccionamiento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add New Fraccionamiento Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Fraccionamiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre (ID)</Label>
                <Input
                  id="name"
                  value={newFraccionamiento.name}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, name: e.target.value})}
                  placeholder="ej: lomas_del_valle"
                  data-testid="input-new-name"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Nombre para Mostrar</Label>
                <Input
                  id="displayName"
                  value={newFraccionamiento.displayName}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, displayName: e.target.value})}
                  placeholder="ej: Lomas del Valle"
                  data-testid="input-new-display-name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitud</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.00000001"
                  value={newFraccionamiento.latitude}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, latitude: e.target.value})}
                  placeholder="25.686614"
                  data-testid="input-new-latitude"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitud</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.00000001"
                  value={newFraccionamiento.longitude}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, longitude: e.target.value})}
                  placeholder="-100.316116"
                  data-testid="input-new-longitude"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">Peso de Ruta</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  value={newFraccionamiento.weight}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, weight: e.target.value})}
                  data-testid="input-new-weight"
                />
                <p className="text-xs text-gray-500 mt-1">1.0 = normal, mayor = prioridad</p>
              </div>
              <div>
                <Label htmlFor="priority">Prioridad</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="5"
                  value={newFraccionamiento.priority}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, priority: parseInt(e.target.value) || 1})}
                  data-testid="input-new-priority"
                />
                <p className="text-xs text-gray-500 mt-1">1 = máxima, 5 = mínima</p>
              </div>
              <div>
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  value={newFraccionamiento.postalCode}
                  onChange={(e) => setNewFraccionamiento({...newFraccionamiento, postalCode: e.target.value})}
                  placeholder="64920"
                  data-testid="input-new-postal-code"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={newFraccionamiento.notes}
                onChange={(e) => setNewFraccionamiento({...newFraccionamiento, notes: e.target.value})}
                placeholder="Notas adicionales sobre este fraccionamiento..."
                data-testid="textarea-new-notes"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={newFraccionamiento.isActive}
                onCheckedChange={(checked) => setNewFraccionamiento({...newFraccionamiento, isActive: checked})}
                data-testid="switch-new-active"
              />
              <Label htmlFor="isActive">Activo</Label>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                data-testid="button-create-fraccionamiento"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  'Crear Fraccionamiento'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fraccionamiento Display Component
function FraccionamientoDisplay({ fraccionamiento }: { fraccionamiento: Fraccionamiento }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Nombre:</span>
          <div className="font-mono text-gray-900">{fraccionamiento.name}</div>
        </div>
        <div>
          <span className="text-gray-600">Código Postal:</span>
          <div className="font-medium">{fraccionamiento.postalCode || 'N/A'}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600 flex items-center gap-1">
            <Weight className="w-3 h-3" />
            Peso:
          </span>
          <div className="font-bold text-blue-600">{fraccionamiento.weight}</div>
        </div>
        <div>
          <span className="text-gray-600">Estado:</span>
          <div className={`font-medium ${fraccionamiento.isActive ? 'text-green-600' : 'text-gray-500'}`}>
            {fraccionamiento.isActive ? 'Activo' : 'Inactivo'}
          </div>
        </div>
      </div>
      
      {(fraccionamiento.latitude && fraccionamiento.longitude) && (
        <div className="text-sm">
          <span className="text-gray-600">Coordenadas:</span>
          <div className="font-mono text-xs">{fraccionamiento.latitude}, {fraccionamiento.longitude}</div>
        </div>
      )}
      
      {fraccionamiento.notes && (
        <div className="text-sm">
          <span className="text-gray-600">Notas:</span>
          <div className="text-gray-700">{fraccionamiento.notes}</div>
        </div>
      )}
    </div>
  );
}

// Fraccionamiento Edit Form Component
function FraccionamientoEditForm({ 
  fraccionamiento, 
  onSave, 
  onCancel, 
  isSaving 
}: { 
  fraccionamiento: Fraccionamiento;
  onSave: (frac: Fraccionamiento) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(fraccionamiento);
  
  const handleSave = () => {
    onSave(formData);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`name-${fraccionamiento.id}`}>Nombre (ID)</Label>
          <Input
            id={`name-${fraccionamiento.id}`}
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor={`displayName-${fraccionamiento.id}`}>Nombre para Mostrar</Label>
          <Input
            id={`displayName-${fraccionamiento.id}`}
            value={formData.displayName}
            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            className="h-8"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor={`weight-${fraccionamiento.id}`}>Peso</Label>
          <Input
            id={`weight-${fraccionamiento.id}`}
            type="number"
            step="0.1"
            min="0.1"
            max="10.0"
            value={formData.weight}
            onChange={(e) => setFormData({...formData, weight: e.target.value})}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor={`priority-${fraccionamiento.id}`}>Prioridad</Label>
          <Input
            id={`priority-${fraccionamiento.id}`}
            type="number"
            min="1"
            max="5"
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor={`postalCode-${fraccionamiento.id}`}>C.P.</Label>
          <Input
            id={`postalCode-${fraccionamiento.id}`}
            value={formData.postalCode || ''}
            onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
            className="h-8"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`latitude-${fraccionamiento.id}`}>Latitud</Label>
          <Input
            id={`latitude-${fraccionamiento.id}`}
            type="number"
            step="0.00000001"
            value={formData.latitude || ''}
            onChange={(e) => setFormData({...formData, latitude: e.target.value})}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor={`longitude-${fraccionamiento.id}`}>Longitud</Label>
          <Input
            id={`longitude-${fraccionamiento.id}`}
            type="number"
            step="0.00000001"
            value={formData.longitude || ''}
            onChange={(e) => setFormData({...formData, longitude: e.target.value})}
            className="h-8"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor={`notes-${fraccionamiento.id}`}>Notas</Label>
        <Textarea
          id={`notes-${fraccionamiento.id}`}
          value={formData.notes || ''}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="min-h-16"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id={`isActive-${fraccionamiento.id}`}
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
        />
        <Label htmlFor={`isActive-${fraccionamiento.id}`}>Activo</Label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-3 h-3 mr-1" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}