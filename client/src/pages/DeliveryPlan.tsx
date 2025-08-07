import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Map, 
  Truck, 
  MapPin, 
  Clock, 
  Route,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Package,
  Navigation,
  RefreshCw,
  Settings,
  Activity
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Appointment } from "@shared/schema";

export default function DeliveryPlan() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState("2025-08-25");
  const [activeTab, setActiveTab] = useState("pickup");
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);

  // Generate next 7 days for date selection
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Queries
  const { data: routesResponse, isLoading } = useQuery<{routes: any[], totalRoutes: number}>({
    queryKey: ["/api/delivery-routes-fast", currentTenant?.id, selectedDate],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: staff } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: vans } = useQuery<any[]>({
    queryKey: ["/api/vans", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const routes = routesResponse?.routes || [];

  // Filter appointments by logistics type and date
  const pickupAppointments = appointments?.filter(apt => 
    apt.scheduledDate === selectedDate && apt.logistics === "pickup"
  ) || [];

  const deliveryAppointments = appointments?.filter(apt => 
    apt.scheduledDate === selectedDate && apt.logistics === "delivery"
  ) || [];

  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/delivery-routes`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada exitosamente",
        description: `Nueva ruta de ${activeTab} creada con ${selectedDeliveries.length} entregas`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-routes-fast", currentTenant?.id, selectedDate] });
      setShowCreateRoute(false);
      setSelectedDeliveries([]);
    },
  });

  const handleCreateRoute = (formData: FormData) => {
    const data = {
      name: formData.get("routeName"),
      scheduledDate: selectedDate,
      driverId: formData.get("driverId"),
      routeType: activeTab,
      selectedAppointments: selectedDeliveries,
      estimatedDuration: selectedDeliveries.length * 15,
      notes: `Ruta de ${activeTab} para ${selectedDeliveries.length} entregas`,
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

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  if (!currentTenant) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Selecciona un tenant para continuar
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plan de Entregas</h1>
            <p className="text-muted-foreground">Gestión de rutas de recolección y entrega</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-08-25">25 Ago 2025 (Con datos)</SelectItem>
                  {next7Days.map(date => (
                    <SelectItem key={date} value={date}>
                      {formatDateDisplay(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setShowCreateRoute(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-create-route"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Ruta
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recolecciones</p>
                  <p className="text-2xl font-bold text-blue-600">{pickupAppointments.length}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entregas</p>
                  <p className="text-2xl font-bold text-green-600">{deliveryAppointments.length}</p>
                </div>
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rutas Activas</p>
                  <p className="text-2xl font-bold text-purple-600">{routes.length}</p>
                </div>
                <Route className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vehículos</p>
                  <p className="text-2xl font-bold text-orange-600">{vans?.length || 0}</p>
                </div>
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pickup" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Recolecciones
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Entregas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pickup" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando rutas de recolección...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pickup Appointments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Recolecciones Programadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pickupAppointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay recolecciones programadas para esta fecha
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pickupAppointments.map((apt, index) => (
                            <div 
                              key={apt.id} 
                              className="p-3 border rounded-lg hover:bg-accent transition-colors"
                              data-testid={`pickup-appointment-${index}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{apt.petName || `Mascota ${index + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Cliente: {apt.clientName || "Sin especificar"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Hora: {apt.scheduledTime || "Por definir"}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {apt.status || "programada"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pickup Routes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5" />
                        Rutas de Recolección
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {routes.filter(r => r.routeType === "pickup" || r.type === "inbound").length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay rutas de recolección creadas
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {routes
                            .filter(r => r.routeType === "pickup" || r.type === "inbound")
                            .map((route, index) => (
                            <div 
                              key={route.id || index} 
                              className="p-4 border rounded-lg"
                              data-testid={`pickup-route-${index}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">{route.name || `Ruta ${index + 1}`}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Conductor: {route.driverName || "Sin asignar"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {route.appointments?.length || 0} recolecciones
                                  </p>
                                </div>
                                <Badge className={getStatusColor(route.status || 'scheduled')}>
                                  {getStatusIcon(route.status || 'scheduled')}
                                  {route.status || 'programada'}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1">
                                  <Navigation className="w-4 h-4 mr-1" />
                                  Ver Ruta
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando rutas de entrega...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Delivery Appointments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Entregas Programadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {deliveryAppointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay entregas programadas para esta fecha
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deliveryAppointments.map((apt, index) => (
                            <div 
                              key={apt.id} 
                              className="p-3 border rounded-lg hover:bg-accent transition-colors"
                              data-testid={`delivery-appointment-${index}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{apt.petName || `Mascota ${index + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Cliente: {apt.clientName || "Sin especificar"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Hora: {apt.scheduledTime || "Por definir"}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {apt.status || "programada"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery Routes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5" />
                        Rutas de Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {routes.filter(r => r.routeType === "delivery" || r.type === "outbound").length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay rutas de entrega creadas
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {routes
                            .filter(r => r.routeType === "delivery" || r.type === "outbound")
                            .map((route, index) => (
                            <div 
                              key={route.id || index} 
                              className="p-4 border rounded-lg"
                              data-testid={`delivery-route-${index}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">{route.name || `Ruta ${index + 1}`}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Conductor: {route.driverName || "Sin asignar"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {route.appointments?.length || 0} entregas
                                  </p>
                                </div>
                                <Badge className={getStatusColor(route.status || 'scheduled')}>
                                  {getStatusIcon(route.status || 'scheduled')}
                                  {route.status || 'programada'}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1">
                                  <Navigation className="w-4 h-4 mr-1" />
                                  Ver Ruta
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Route Modal */}
      {showCreateRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Nueva Ruta de {activeTab === "pickup" ? "Recolección" : "Entrega"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateRoute(formData);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="routeName">Nombre de la Ruta</Label>
                  <Input 
                    id="routeName" 
                    name="routeName" 
                    placeholder={`Ruta ${activeTab} ${selectedDate}`}
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="driverId">Conductor</Label>
                  <Select name="driverId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateRoute(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createRouteMutation.isPending}
                  >
                    {createRouteMutation.isPending ? "Creando..." : "Crear Ruta"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}