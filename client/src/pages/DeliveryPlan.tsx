import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Plus, 
  Map, 
  Truck, 
  MapPin, 
  Clock, 
  Weight, 
  Route,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DeliveryRoute, DeliveryStop, Fraccionamiento, Staff, Appointment } from "@shared/schema";

export default function DeliveryPlan() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: routes, isLoading } = useQuery<DeliveryRoute[]>({
    queryKey: ["/api/delivery-routes", currentTenant?.id, selectedDate],
    enabled: !!currentTenant?.id,
  });

  const { data: fraccionamientos } = useQuery<Fraccionamiento[]>({
    queryKey: ["/api/fraccionamientos", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: staff } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/delivery-routes`, {
        method: "POST",
        body: JSON.stringify({ ...data, tenantId: currentTenant?.id }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta de entrega se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-routes"] });
      setShowRouteForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la ruta",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-blue-800">Planificación de Entregas</h1>
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleCreateRoute = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      scheduledDate: formData.get("scheduledDate"),
      driverId: formData.get("driverId"),
      estimatedDuration: parseInt(formData.get("estimatedDuration") as string) || null,
    };

    createRouteMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Mock data for fraccionamientos with weights for demonstration
  const fraccionamientosWithWeights = fraccionamientos?.map(f => ({
    ...f,
    weight: Math.floor(Math.random() * 10) + 1, // Mock weight 1-10
    appointments: appointments?.filter(apt => 
      apt.scheduledDate === selectedDate && 
      apt.logistics === "pickup"
    ).length || 0
  })) || [];

  const pickupAppointments = appointments?.filter(apt => 
    apt.scheduledDate === selectedDate && 
    apt.logistics === "pickup"
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-blue-800">Planificación de Entregas</h1>
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button 
            onClick={() => setShowRouteForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ruta
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rutas Programadas</p>
                <p className="text-2xl font-bold text-blue-600">{routes?.length || 0}</p>
              </div>
              <Route className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recolecciones</p>
                <p className="text-2xl font-bold text-green-600">{pickupAppointments.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fraccionamientos</p>
                <p className="text-2xl font-bold text-purple-600">{fraccionamientos?.length || 0}</p>
              </div>
              <Map className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conductores</p>
                <p className="text-2xl font-bold text-orange-600">
                  {staff?.filter(s => s.role === "driver").length || 0}
                </p>
              </div>
              <User className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Route Form */}
      {showRouteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Crear Nueva Ruta de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre de la Ruta</Label>
                <Input name="name" required placeholder="Ej: Ruta Norte Matutina" />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Fecha Programada</Label>
                <Input 
                  name="scheduledDate" 
                  type="date" 
                  required 
                  defaultValue={selectedDate}
                />
              </div>

              <div>
                <Label htmlFor="driverId">Conductor Asignado</Label>
                <Select name="driverId">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff?.filter(s => s.role === "driver" || s.role === "technician").map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estimatedDuration">Duración Estimada (minutos)</Label>
                <Input name="estimatedDuration" type="number" min="0" placeholder="240" />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createRouteMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createRouteMutation.isPending ? "Creando..." : "Crear Ruta"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRouteForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Routes Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Rutas del {new Date(selectedDate).toLocaleDateString()}
          </h2>

          {routes?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas programadas</h3>
                <p className="text-gray-500 mb-4">Crea rutas para organizar las entregas y recolecciones.</p>
                <Button onClick={() => setShowRouteForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Ruta
                </Button>
              </CardContent>
            </Card>
          ) : (
            routes?.map((route) => (
              <Card key={route.id} className="border-l-4 border-l-blue-400">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{route.name}</h3>
                        <Badge className={getStatusColor(route.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(route.status)}
                            <span>
                              {route.status === "planned" && "Planeada"}
                              {route.status === "in_progress" && "En Progreso"}
                              {route.status === "completed" && "Completada"}
                            </span>
                          </div>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(route.scheduledDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>
                            {staff?.find(s => s.id === route.driverId)?.name || "Sin asignar"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{route.estimatedDuration || 0} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Weight className="w-4 h-4" />
                          <span>{route.totalWeight || 0} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Mapa
                      </Button>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>

                  {/* Route Timeline */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Paradas de la Ruta</h4>
                    <div className="space-y-2">
                      {/* Mock stops for demonstration */}
                      {["Fraccionamiento A", "Fraccionamiento B", "Fraccionamiento C"].map((stop, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span>{stop}</span>
                          <Badge variant="secondary" className="ml-auto">Pendiente</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Map View & Fraccionamientos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Map className="w-5 h-5" />
            Vista de Mapa y Fraccionamientos
          </h2>

          {/* Map Placeholder */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-700 mb-2">Vista de Mapa</h3>
                  <p className="text-sm text-gray-500">
                    Aquí se mostraría un mapa interactivo con las ubicaciones de los fraccionamientos
                    <br />
                    y las rutas de entrega optimizadas.
                  </p>
                  <Button variant="outline" className="mt-3">
                    <Map className="w-4 h-4 mr-2" />
                    Abrir Mapa Completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fraccionamientos List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Fraccionamientos con Recolecciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fraccionamientosWithWeights.filter(f => f.appointments > 0).map((fracciona) => (
                  <div key={fracciona.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                        {fracciona.weight}
                      </div>
                      <div>
                        <h4 className="font-medium">{fracciona.name}</h4>
                        <p className="text-sm text-gray-600">{fracciona.zone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {fracciona.appointments} recolecciones
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Peso: {fracciona.weight}</p>
                    </div>
                  </div>
                ))}

                {fraccionamientosWithWeights.filter(f => f.appointments > 0).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No hay recolecciones programadas para {new Date(selectedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Leyenda</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>Peso del fraccionamiento (1-10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Ruta completada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Ruta en progreso</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span>Ruta planeada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}