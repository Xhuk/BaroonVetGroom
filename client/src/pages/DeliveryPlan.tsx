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
import { DebugControls } from "@/components/DebugControls";
import { BackButton } from "@/components/BackButton";
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
  ArrowLeft,
  Search,
  Star,
  Package,
  Target,
  Timer
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Appointment } from "@shared/schema";

export default function DeliveryPlan() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - NO EARLY RETURNS BEFORE THIS POINT
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2025-08-25"); // Date with pickup appointments
  const [selectedMascots, setSelectedMascots] = useState<string[]>([]);
  const [searchMascots, setSearchMascots] = useState("");
  const [selectedWave, setSelectedWave] = useState("1");
  const [deliveryMode, setDeliveryMode] = useState<"wave" | "free">("wave");
  const [customHour, setCustomHour] = useState("13:00");
  
  // Fast delivery routes query with optimized caching
  const { data: routesResponse, isLoading } = useQuery<{routes: any[], totalRoutes: number}>({
    queryKey: ["/api/delivery-routes-fast", currentTenant?.id, selectedDate],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: fraccionamientos } = useQuery<any[]>({
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
      return apiRequest(`/api/delivery-routes`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      const modeText = deliveryMode === "wave" 
        ? `Wave ${selectedWave}` 
        : `Entrega libre ${customHour}`;
      
      toast({
        title: "Ruta de entrega creada",
        description: `${modeText} creada exitosamente con ${selectedMascots.length} mascotas`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-routes-fast", currentTenant?.id, selectedDate] });
      setShowRouteForm(false);
      setSelectedMascots([]);
      setSearchMascots("");
      setSelectedWave("1");
      setDeliveryMode("wave");
      setCustomHour("13:00");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la ruta",
        variant: "destructive",
      });
    },
  });

  // VRP Route Optimization Mutation for Completed Mascots
  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: { date: string; vanCapacity: string }) => {
      return apiRequest(`/api/delivery-routes/optimize/${currentTenant?.id}`, "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Ruta Optimizada con VRP",
        description: `${data.summary.totalStops} paradas optimizadas • ${data.summary.totalDistance.toFixed(1)}km • ${data.summary.estimatedTime}min`,
      });
      // Refresh routes data
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-routes-fast", currentTenant?.id, selectedDate] });
    },
    onError: (error: any) => {
      toast({
        title: "Error de Optimización",
        description: error.message || "No se pudo optimizar la ruta con algoritmos VRP",
        variant: "destructive",
      });
    },
  });

  // Generate next 7 days for date selection
  const generateNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  // NOW it's safe to have derived state and early returns
  const next7Days = generateNext7Days();
  const routes = (routesResponse as any)?.routes || [];
  const totalRoutes = (routesResponse as any)?.totalRoutes || 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackButton 
              href="/"
              text="Volver al Dashboard"
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              testId="button-back-to-dashboard"
            />
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
    
    const waveSchedules = {
      "1": "13:00", // 1:00 PM
      "2": "14:00", // 2:00 PM
      "3": "15:00", // 3:00 PM
      "4": "16:00", // 4:00 PM
      "5": "17:00", // 5:00 PM
    };
    
    const scheduledTime = deliveryMode === "wave" 
      ? waveSchedules[selectedWave as keyof typeof waveSchedules]
      : customHour;
    
    const routeName = deliveryMode === "wave"
      ? `Wave ${selectedWave} - ${formData.get("name")}`
      : `Libre ${customHour} - ${formData.get("name")}`;
    
    const data = {
      name: routeName,
      scheduledDate: selectedDate,
      driverId: formData.get("driverId"),
      deliveryMode: deliveryMode,
      wave: deliveryMode === "wave" ? selectedWave : null,
      scheduledTime: scheduledTime,
      selectedMascots: selectedMascots,
      estimatedDuration: selectedMascots.length * 15, // 15 minutes per mascot
      notes: deliveryMode === "wave" 
        ? `Wave ${selectedWave} delivery route with ${selectedMascots.length} mascots`
        : `Free-time delivery at ${customHour} with ${selectedMascots.length} mascots`,
    };

    createRouteMutation.mutate(data);
  };

  // Generate mobile driver link for route
  const generateDriverLink = (route: any) => {
    const baseUrl = window.location.origin;
    const driverLink = `${baseUrl}/driver-route/${route.id}`;
    
    // Copy to clipboard and show toast
    navigator.clipboard.writeText(driverLink).then(() => {
      toast({
        title: "Enlace copiado",
        description: `Enlace para conductor: ${driverLink}`,
        duration: 5000,
      });
    }).catch(() => {
      toast({
        title: "Enlace generado",
        description: `Envía este enlace al conductor: ${driverLink}`,
        duration: 8000,
      });
    });
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

  // Remove conflicting query - use existing routes from routesResponse

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
          <BackButton 
            href="/"
            text="Volver al Dashboard"
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
            testId="button-back-to-dashboard"
          />
          <h1 className="text-2xl font-bold text-blue-800">Planificación de Entregas</h1>
        </div>
        <div className="flex gap-3 items-center">
          <DebugControls />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-input bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 dark:border-gray-600"
              data-testid="select-delivery-date"
            >
              <option value="2025-08-25">25 Ago 2025 (Con datos)</option>
              {next7Days.map(date => {
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                return (
                  <option key={date} value={date}>
                    {dayName}, {dateStr}
                  </option>
                );
              })}
            </select>
          </div>
          <Button 
            onClick={() => optimizeRouteMutation.mutate({ 
              date: selectedDate, 
              vanCapacity: 'medium' 
            })}
            disabled={optimizeRouteMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-optimize-route"
          >
            <Route className="w-4 h-4 mr-2" />
            {optimizeRouteMutation.isPending ? "Optimizando..." : "Optimizar VRP"}
          </Button>
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

      {/* Enhanced Wave-Based Route Form */}
      {showRouteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Crear Ruta de Entrega con Mascotas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoute} className="space-y-6">
              {/* Delivery Mode Selection */}
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Modo de Entrega</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      deliveryMode === "wave"
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                    onClick={() => setDeliveryMode("wave")}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        deliveryMode === "wave" ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium">Ondas Programadas</p>
                        <p className="text-sm text-gray-600">Wave 1-5 (1PM-5PM)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      deliveryMode === "free"
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                    onClick={() => setDeliveryMode("free")}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        deliveryMode === "free" ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium">Horario Libre</p>
                        <p className="text-sm text-gray-600">Cualquier hora</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Route Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Nombre de la Ruta</Label>
                  <Input 
                    name="name" 
                    required 
                    placeholder={deliveryMode === "wave" ? "Ej: Wave 1 - Entrega Tarde" : "Ej: Entrega Flexible Norte"} 
                  />
                </div>

                {deliveryMode === "wave" ? (
                  <div>
                    <Label htmlFor="wave">Onda de Entrega</Label>
                    <Select name="wave" value={selectedWave} onValueChange={setSelectedWave}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar onda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Wave 1 - 1:00 PM</SelectItem>
                        <SelectItem value="2">Wave 2 - 2:00 PM</SelectItem>
                        <SelectItem value="3">Wave 3 - 3:00 PM</SelectItem>
                        <SelectItem value="4">Wave 4 - 4:00 PM</SelectItem>
                        <SelectItem value="5">Wave 5 - 5:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="customHour">Hora de Entrega</Label>
                    <Input
                      type="time"
                      value={customHour}
                      onChange={(e) => setCustomHour(e.target.value)}
                      className="w-full"
                      min="08:00"
                      max="20:00"
                    />
                  </div>
                )}

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
              </div>

              {/* Mascot Selection Section */}
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Seleccionar Mascotas para Entrega</h3>
                    <Badge variant="outline">{selectedMascots.length} seleccionadas</Badge>
                  </div>
                  
                  {deliveryMode === "free" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Star className="w-4 h-4" />
                      <span>Sugerencias por peso de fraccionamiento</span>
                    </div>
                  )}
                </div>

                {deliveryMode === "free" && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                      Fraccionamientos Sugeridos (por peso)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {fraccionamientosWithWeights
                        .sort((a, b) => a.weight - b.weight) // Lower weight = higher priority
                        .slice(0, 6)
                        .map((frac, index) => (
                          <div key={frac.id} className="flex items-center gap-2">
                            <Badge 
                              variant={index < 2 ? "default" : "outline"} 
                              className={index < 2 ? "bg-green-600" : ""}
                            >
                              #{index + 1}
                            </Badge>
                            <span className="text-sm">{frac.name}</span>
                            <span className="text-xs text-gray-500">({frac.appointments} mascotas)</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Search Mascots */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar mascotas por nombre, cliente o fraccionamiento..."
                    value={searchMascots}
                    onChange={(e) => setSearchMascots(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Available Mascots List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {appointments
                    ?.filter(apt => 
                      apt.status === 'completed' && 
                      apt.logistics === 'pickup' &&
                      (searchMascots === '' || 
                       apt.petId?.toLowerCase().includes(searchMascots.toLowerCase()) ||
                       apt.clientId?.toLowerCase().includes(searchMascots.toLowerCase()))
                    )
                    .map(apt => (
                      <div
                        key={apt.id}
                        className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedMascots.includes(apt.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => {
                          setSelectedMascots(prev => 
                            prev.includes(apt.id)
                              ? prev.filter(id => id !== apt.id)
                              : [...prev, apt.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            selectedMascots.includes(apt.id) ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          <div>
                            <p className="font-medium">Mascota ID: {apt.petId}</p>
                            <p className="text-sm text-gray-600">Cliente: {apt.clientId}</p>
                            <p className="text-sm text-gray-500">Completado: {apt.scheduledDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedMascots.includes(apt.id) && (
                            <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            Pickup
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>

                {selectedMascots.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No hay mascotas seleccionadas</p>
                    <p className="text-sm">Selecciona mascotas completadas para añadir a esta ruta de entrega</p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createRouteMutation.isPending || selectedMascots.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Timer className="w-4 h-4 mr-2" />
                  {createRouteMutation.isPending 
                    ? "Creando..." 
                    : deliveryMode === "wave"
                      ? `Crear Wave ${selectedWave} (${selectedMascots.length} mascotas)`
                      : `Crear Entrega ${customHour} (${selectedMascots.length} mascotas)`
                  }
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowRouteForm(false);
                    setSelectedMascots([]);
                    setSearchMascots("");
                    setDeliveryMode("wave");
                    setSelectedWave("1");
                    setCustomHour("13:00");
                  }}
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

          {isLoading ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="text-gray-300">Cargando rutas de entrega...</div>
              </CardContent>
            </Card>
          ) : totalRoutes === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas de entrega para {selectedDate}</h3>
                <p className="text-gray-500 mb-4">
                  No se encontraron citas de entrega o servicios de delivery para esta fecha.
                  <br />
                  Selecciona una fecha con citas programadas o crea nuevas citas de entrega.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800">
                  <strong>Busca citas con:</strong> servicios de entrega, delivery o con direcciones de cliente
                </div>
                <Button onClick={() => setShowRouteForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Ruta
                </Button>
              </CardContent>
            </Card>
          ) : (
            routes.map((route: any) => (
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation("/route-map")}
                        data-testid="button-view-map"
                      >
                        <Map className="w-4 h-4 mr-1" />
                        Ver Mapa
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Función en desarrollo",
                            description: "La edición de rutas estará disponible próximamente.",
                          });
                        }}
                        data-testid="button-edit-route"
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateDriverLink(route)}
                        className="bg-green-50 text-green-700 hover:bg-green-100"
                        data-testid="button-share-route"
                      >
                        <User className="w-4 h-4 mr-1" />
                        Conductor
                      </Button>
                    </div>
                  </div>

                  {/* Route Timeline */}
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Paradas de la Ruta</h4>
                    <div className="space-y-2">
                      {/* Mock stops for demonstration */}
                      {["Fraccionamiento A", "Fraccionamiento B", "Fraccionamiento C"].map((stop, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-gray-900 dark:text-gray-100">{stop}</span>
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
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => setLocation("/route-map")}
                    data-testid="button-open-full-map"
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Abrir Mapa Completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Recolecciones Programadas ({pickupAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pickupAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{(appointment as any).client?.name || "Cliente"}</h4>
                        <p className="text-sm text-gray-600">Mascota: {(appointment as any).pet?.name || "Sin nombre"}</p>
                        <p className="text-xs text-gray-500">{(appointment as any).client?.fraccionamiento || "Zona no especificada"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {appointment.scheduledTime}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">${appointment.totalCost}</p>
                    </div>
                  </div>
                ))}

                {pickupAppointments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No hay recolecciones programadas para {new Date(selectedDate).toLocaleDateString()}</p>
                    <p className="text-xs mt-2">Total citas: {appointments?.length || 0}</p>
                    <p className="text-xs">Pruebe con el 25 de Agosto 2025 o cambie la fecha</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setSelectedDate("2025-08-25")}
                    >
                      Ver datos de ejemplo
                    </Button>
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