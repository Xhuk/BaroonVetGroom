import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Settings, Trash2, Save, X, ArrowLeft, AlertTriangle, Upload } from 'lucide-react';
import { useLocation } from 'wouter';

interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  minimumTier: string;
  enabled: boolean;
  betaFeature?: boolean;
  requiresConfiguration?: boolean;
  spanishName?: string;
  spanishDescription?: string;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="bg-gray-800 border-gray-700">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-gray-600" />
          <Skeleton className="h-4 w-24 bg-gray-700" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full bg-gray-700" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-6 w-16 bg-gray-700" />
            <Skeleton className="h-6 w-20 bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

function SuperAdminFeaturesAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureDialog, setFeatureDialog] = useState(false);
  const [jsonImportDialog, setJsonImportDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const [newFeatureForm, setNewFeatureForm] = useState({
    id: '',
    name: '',
    description: '',
    category: 'subscription_management',
    minimumTier: 'basic',
    enabled: true,
    betaFeature: false,
    requiresConfiguration: false,
    spanishName: '',
    spanishDescription: ''
  });

  // Categories for feature organization
  const categories = {
    'subscription_management': 'Gestión de Suscripciones',
    'clinic_operations': 'Operaciones de Clínica',
    'reporting_analytics': 'Reportes y Analíticas',
    'integrations': 'Integraciones',
    'support_training': 'Soporte y Capacitación',
    'system_administration': 'Administración del Sistema'
  };

  const tiers = {
    'basic': 'Básico',
    'professional': 'Profesional',
    'enterprise': 'Empresarial',
    'development': 'Desarrollo'
  };

  // JSON Validation function for features
  const validateFeaturesJson = (jsonString: string) => {
    try {
      const parsedJson = JSON.parse(jsonString);
      
      // Check if it's an array
      if (!Array.isArray(parsedJson)) {
        return { isValid: false, error: 'El JSON debe ser un array de características' };
      }
      
      if (parsedJson.length === 0) {
        return { isValid: false, error: 'El array no puede estar vacío' };
      }
      
      // Validate each feature
      for (let i = 0; i < parsedJson.length; i++) {
        const feature = parsedJson[i];
        const featureIndex = i + 1;
        
        // Check required properties
        const requiredProps = ['key', 'nombre', 'descripcion'];
        for (const prop of requiredProps) {
          if (!feature.hasOwnProperty(prop)) {
            return { isValid: false, error: `Característica ${featureIndex}: Propiedad "${prop}" requerida` };
          }
        }
        
        // Validate data types
        if (typeof feature.key !== 'string' || feature.key.trim() === '') {
          return { isValid: false, error: `Característica ${featureIndex}: "key" debe ser un texto no vacío` };
        }
        
        if (typeof feature.nombre !== 'string' || feature.nombre.trim() === '') {
          return { isValid: false, error: `Característica ${featureIndex}: "nombre" debe ser un texto no vacío` };
        }
        
        if (typeof feature.descripcion !== 'string' || feature.descripcion.trim() === '') {
          return { isValid: false, error: `Característica ${featureIndex}: "descripcion" debe ser un texto no vacío` };
        }
        
        // Validate category if present
        if (feature.category && typeof feature.category !== 'string') {
          return { isValid: false, error: `Característica ${featureIndex}: "category" debe ser un texto` };
        }
        
        // Validate minimumTier if present
        if (feature.minimumTier && typeof feature.minimumTier !== 'string') {
          return { isValid: false, error: `Característica ${featureIndex}: "minimumTier" debe ser un texto` };
        }
        
        // Validate enabled if present
        if (feature.enabled !== undefined && typeof feature.enabled !== 'boolean') {
          return { isValid: false, error: `Característica ${featureIndex}: "enabled" debe ser verdadero o falso` };
        }
      }
      
      return { isValid: true, parsedData: parsedJson };
    } catch (error) {
      return { isValid: false, error: `JSON inválido: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
  };

  // Handle JSON input change with real-time validation
  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    
    if (value.trim() === '') {
      setJsonValidationError(null);
      return;
    }
    
    const validation = validateFeaturesJson(value);
    if (!validation.isValid) {
      setJsonValidationError(validation.error || null);
    } else {
      setJsonValidationError(null);
    }
  };

  // Fetch features
  const { data: features, isLoading } = useQuery({
    queryKey: ['/api/superadmin/features'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Create feature
  const createFeature = useMutation({
    mutationFn: async (featureData: Omit<Feature, 'id'> & { id: string }) => {
      const response = await fetch('/api/superadmin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureData),
      });
      if (!response.ok) throw new Error('Failed to create feature');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/features'] });
      setFeatureDialog(false);
      setNewFeatureForm({
        id: '',
        name: '',
        description: '',
        category: 'subscription_management',
        minimumTier: 'basic',
        enabled: true,
        betaFeature: false,
        requiresConfiguration: false,
        spanishName: '',
        spanishDescription: ''
      });
      toast({
        title: "✅ Característica Creada",
        description: "Nueva característica añadida exitosamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al Crear",
        description: error?.message || "Error al crear la característica",
        variant: "destructive",
      });
    },
  });

  // Update feature
  const updateFeature = useMutation({
    mutationFn: async (featureData: Feature) => {
      const response = await fetch(`/api/superadmin/features/${featureData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureData),
      });
      if (!response.ok) throw new Error('Failed to update feature');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/features'] });
      setEditingFeature(null);
      toast({
        title: "✅ Característica Actualizada",
        description: "Cambios guardados exitosamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al Actualizar",
        description: error?.message || "Error al actualizar la característica",
        variant: "destructive",
      });
    },
  });

  // Delete feature
  const deleteFeature = useMutation({
    mutationFn: async (featureId: string) => {
      const response = await fetch(`/api/superadmin/features/${featureId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete feature');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/features'] });
      toast({
        title: "✅ Característica Eliminada",
        description: "Característica removida exitosamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al Eliminar",
        description: error?.message || "Error al eliminar la característica",
        variant: "destructive",
      });
    },
  });

  // Bulk import features from JSON
  const importFeatures = useMutation({
    mutationFn: async (featuresData: any[]) => {
      const response = await fetch('/api/superadmin/features/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: featuresData }),
      });
      if (!response.ok) throw new Error('Failed to import features');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/features'] });
      setJsonImportDialog(false);
      setJsonInput('');
      setJsonValidationError(null);
      
      toast({
        title: "✅ Importación Exitosa",
        description: data.message || "Características importadas correctamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error de Importación",
        description: error?.message || "Error al importar características",
        variant: "destructive",
      });
    },
  });

  const handleJsonImport = () => {
    // Validate JSON before importing
    const validation = validateFeaturesJson(jsonInput);
    
    if (!validation.isValid) {
      toast({
        title: "❌ Error de Validación",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    importFeatures.mutate(validation.parsedData || []);
  };

  const handleCreateFeature = () => {
    if (!newFeatureForm.id || !newFeatureForm.name) {
      toast({
        title: "❌ Campos Requeridos",
        description: "ID y nombre son requeridos",
        variant: "destructive",
      });
      return;
    }
    createFeature.mutate(newFeatureForm);
  };

  const handleDeleteFeature = (featureId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta característica?')) {
      deleteFeature.mutate(featureId);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/superadmin/subscriptions')}
                variant="outline"
                size="sm"
                className="bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Administración de Características
                </h1>
                <p className="text-gray-300">
                  Gestiona las características disponibles para los planes de suscripción
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* JSON Import Button */}
              <Dialog open={jsonImportDialog} onOpenChange={setJsonImportDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white"
                    data-testid="button-json-import"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl bg-gray-800 border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-purple-300 flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Importar Características desde JSON
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Importa múltiples características usando el formato JSON. Las características existentes serán actualizadas si no están asignadas a ningún plan de suscripción.
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
                        placeholder={`[
  {
    "key": "1_vetsite",
    "nombre": "1 Clínica",
    "descripcion": "Permite gestionar una sola clínica veterinaria."
  },
  {
    "key": "3_vetsites", 
    "nombre": "3 Clínicas",
    "descripcion": "Permite gestionar hasta 3 clínicas dentro del mismo sistema."
  },
  {
    "key": "unlimited_appointments",
    "nombre": "Citas ilimitadas", 
    "descripcion": "Sin límite en el número de citas que se pueden agendar."
  }
]`}
                        data-testid="textarea-features-json-input"
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
                        <strong>Formato Requerido:</strong>
                        <ul className="mt-2 space-y-1 text-xs text-blue-200">
                          <li>• <code>key</code>: Identificador único de la característica</li>
                          <li>• <code>nombre</code>: Nombre descriptivo en español</li>
                          <li>• <code>descripcion</code>: Descripción detallada de la característica</li>
                          <li>• <code>category</code> (opcional): Categoría de agrupación</li>
                          <li>• <code>minimumTier</code> (opcional): Nivel mínimo requerido</li>
                          <li>• <code>enabled</code> (opcional): Si está habilitada (true/false)</li>
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
                        disabled={importFeatures.isPending || !jsonInput.trim() || !!jsonValidationError}
                      >
                        {importFeatures.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Características
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            
              <Dialog open={featureDialog} onOpenChange={setFeatureDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Característica
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-purple-300">
                      {editingFeature ? 'Editar Característica' : 'Crear Nueva Característica'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {editingFeature ? 'Modifica la característica' : 'Define una nueva característica para los planes'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="featureId" className="text-gray-300">ID Único</Label>
                        <Input
                          id="featureId"
                          value={editingFeature?.id || newFeatureForm.id}
                          onChange={(e) => editingFeature ? 
                            setEditingFeature({...editingFeature, id: e.target.value}) : 
                            setNewFeatureForm({...newFeatureForm, id: e.target.value})
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="basic_appointments, premium_support..."
                          disabled={!!editingFeature}
                        />
                      </div>
                      <div>
                        <Label htmlFor="featureName" className="text-gray-300">Nombre (Inglés)</Label>
                        <Input
                          id="featureName"
                          value={editingFeature?.name || newFeatureForm.name}
                          onChange={(e) => editingFeature ? 
                            setEditingFeature({...editingFeature, name: e.target.value}) : 
                            setNewFeatureForm({...newFeatureForm, name: e.target.value})
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Basic Appointments"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="spanishName" className="text-gray-300">Nombre (Español)</Label>
                        <Input
                          id="spanishName"
                          value={editingFeature?.spanishName || newFeatureForm.spanishName}
                          onChange={(e) => editingFeature ? 
                            setEditingFeature({...editingFeature, spanishName: e.target.value}) : 
                            setNewFeatureForm({...newFeatureForm, spanishName: e.target.value})
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Citas Básicas"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-gray-300">Categoría</Label>
                        <Select
                          value={editingFeature?.category || newFeatureForm.category}
                          onValueChange={(value) => editingFeature ?
                            setEditingFeature({...editingFeature, category: value}) :
                            setNewFeatureForm({...newFeatureForm, category: value})
                          }
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {Object.entries(categories).map(([key, label]) => (
                              <SelectItem key={key} value={key} className="text-white hover:bg-gray-600">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  
                    <div>
                      <Label htmlFor="description" className="text-gray-300">Descripción (Inglés)</Label>
                      <Textarea
                        id="description"
                        value={editingFeature?.description || newFeatureForm.description}
                        onChange={(e) => editingFeature ? 
                          setEditingFeature({...editingFeature, description: e.target.value}) : 
                          setNewFeatureForm({...newFeatureForm, description: e.target.value})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Feature description in English"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="spanishDescription" className="text-gray-300">Descripción (Español)</Label>
                      <Textarea
                        id="spanishDescription"
                        value={editingFeature?.spanishDescription || newFeatureForm.spanishDescription}
                        onChange={(e) => editingFeature ? 
                          setEditingFeature({...editingFeature, spanishDescription: e.target.value}) : 
                          setNewFeatureForm({...newFeatureForm, spanishDescription: e.target.value})
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Descripción de la característica en español"
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minimumTier" className="text-gray-300">Nivel Mínimo</Label>
                      <Select
                        value={editingFeature?.minimumTier || newFeatureForm.minimumTier}
                        onValueChange={(value) => editingFeature ?
                          setEditingFeature({...editingFeature, minimumTier: value}) :
                          setNewFeatureForm({...newFeatureForm, minimumTier: value})
                        }
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Seleccionar nivel" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {Object.entries(tiers).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-white hover:bg-gray-600">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enabled"
                          checked={editingFeature?.enabled ?? newFeatureForm.enabled}
                          onCheckedChange={(checked) => editingFeature ?
                            setEditingFeature({...editingFeature, enabled: checked}) :
                            setNewFeatureForm({...newFeatureForm, enabled: checked})
                          }
                        />
                        <Label htmlFor="enabled" className="text-gray-300">Habilitado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="betaFeature"
                          checked={editingFeature?.betaFeature ?? newFeatureForm.betaFeature}
                          onCheckedChange={(checked) => editingFeature ?
                            setEditingFeature({...editingFeature, betaFeature: checked}) :
                            setNewFeatureForm({...newFeatureForm, betaFeature: checked})
                          }
                        />
                        <Label htmlFor="betaFeature" className="text-gray-300">Beta</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requiresConfiguration"
                          checked={editingFeature?.requiresConfiguration ?? newFeatureForm.requiresConfiguration}
                          onCheckedChange={(checked) => editingFeature ?
                            setEditingFeature({...editingFeature, requiresConfiguration: checked}) :
                            setNewFeatureForm({...newFeatureForm, requiresConfiguration: checked})
                          }
                        />
                        <Label htmlFor="requiresConfiguration" className="text-gray-300">Requiere Config.</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFeatureDialog(false);
                        setEditingFeature(null);
                      }}
                      className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={editingFeature ? 
                        () => updateFeature.mutate(editingFeature) : 
                        handleCreateFeature
                      }
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={editingFeature ? updateFeature.isPending : createFeature.isPending}
                    >
                      {editingFeature ? 'Actualizar' : 'Crear'} Característica
                    </Button>
                  </div>
                </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(features as Feature[])?.map((feature: Feature) => (
            <Card key={feature.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-all duration-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4 text-purple-400" />
                      {feature.spanishName || feature.name}
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-xs mt-1">
                      {categories[feature.category as keyof typeof categories] || feature.category}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingFeature(feature);
                        setFeatureDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFeature(feature.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-gray-300 text-xs">
                    {feature.spanishDescription || feature.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={feature.enabled ? "default" : "secondary"} className={`text-xs ${feature.enabled ? "bg-green-600" : "bg-gray-600"}`}>
                      {feature.enabled ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-blue-400 text-blue-300">
                      {tiers[feature.minimumTier as keyof typeof tiers] || feature.minimumTier}
                    </Badge>
                    {feature.betaFeature && (
                      <Badge variant="outline" className="text-xs border-orange-400 text-orange-300">
                        Beta
                      </Badge>
                    )}
                    {feature.requiresConfiguration && (
                      <Badge variant="outline" className="text-xs border-purple-400 text-purple-300">
                        Config
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 font-mono">
                    ID: {feature.id}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!features || (features as Feature[])?.length === 0) && !isLoading && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No hay características</h3>
            <p className="text-gray-500 mb-6">Crea la primera característica para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdminFeaturesAdmin;