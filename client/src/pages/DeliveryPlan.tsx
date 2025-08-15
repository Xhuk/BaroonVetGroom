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
  Timer,
  Settings,
  Activity,
  TrendingUp,
  Navigation,
  RefreshCw
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
  const [activeTab, setActiveTab] = useState("inbound");
  const [routeType, setRouteType] = useState<"inbound" | "outbound">("inbound");
  
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

  // Delivery tracking query for real-time monitoring
  const { data: deliveryTracking } = useQuery<any[]>({
    queryKey: ["/api/delivery-tracking", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Delivery schedules query
  const { data: deliverySchedules } = useQuery<any[]>({
    queryKey: ["/api/delivery-schedule", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Get vans/vehicles from inventory
  const { data: vans } = useQuery<any[]>({
    queryKey: ["/api/vans", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Alternative: Get vehicles from inventory items
  const { data: inventoryVehicles } = useQuery<any[]>({
    queryKey: ["/api/inventory", currentTenant?.id, "vehicle"],
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
    onSuccess: (data: any) => {
      toast({
        title: "Ruta Optimizada con VRP",
        description: `${data.summary?.totalStops || 0} paradas optimizadas • ${data.summary?.totalDistance?.toFixed(1) || 0}km • ${data.summary?.estimatedTime || 0}min`,
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
      routeType: routeType, // Add route type for inbound/outbound
      notes: deliveryMode === "wave" 
        ? `${routeType === "inbound" ? "Pickup" : "Delivery"} Wave ${selectedWave} route with ${selectedMascots.length} pets`
        : `${routeType === "inbound" ? "Pickup" : "Delivery"} free-time at ${customHour} with ${selectedMascots.length} pets`,
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
      {/* Professional Header with Clean White Background */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Top Row: Title and Action Buttons */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: Title and Description */}
          <div className="flex items-start gap-4">
            <BackButton 
              href="/"
              text="Volver al Dashboard"
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white mt-1"
              testId="button-back-to-dashboard"
            />
            <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
              <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300 mb-1">
                Planificador de Entregas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                Gestión de recolección y entrega de mascotas con ondas programadas
              </p>
            </div>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <DebugControls />
            
            {/* Route Creation Dropdown */}
            <Select onValueChange={(value) => {
              setRouteType(value as "inbound" | "outbound");
              setShowRouteForm(true);
            }}>
              <SelectTrigger className="w-[140px] bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-md transition-colors [&>span]:text-white">
                <SelectValue placeholder="Crear Ruta" className="text-white" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound" className="text-green-600 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ruta Inbound
                  </div>
                </SelectItem>
                <SelectItem value="outbound" className="text-orange-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Ruta Outbound
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Optimize VRP Button */}
            <Button 
              onClick={() => optimizeRouteMutation.mutate({ 
                date: selectedDate, 
                vanCapacity: 'medium' 
              })}
              disabled={optimizeRouteMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md"
              data-testid="button-optimize-route"
            >
              <Route className="w-4 h-4 mr-2" />
              {optimizeRouteMutation.isPending ? "Optimizando..." : "Optimizar VRP"}
            </Button>
          </div>
        </div>
        

      </div>

      {/* Date Filter Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 w-fit">
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por fecha:</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-2 bg-transparent border-0 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 cursor-pointer"
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
      </div>

      {/* Pickup & Delivery Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbound" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Inbound (Pickup)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Outbound (Delivery)
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Driver Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="space-y-6">
          {/* Inbound Pickup Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Pickups Programados</p>
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
                    <p className="text-sm text-gray-600">Clientes Registrados</p>
                    <p className="text-2xl font-bold text-blue-600">{appointments?.filter(apt => apt.logistics === "pickup").length || 0}</p>
                  </div>
                  <User className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rutas Inbound</p>
                    <p className="text-2xl font-bold text-purple-600">{routes?.filter((r: any) => r.type === "inbound").length || 0}</p>
                  </div>
                  <Route className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Vans Disponibles</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(() => {
                        const activeVans = vans?.filter(v => v.isActive).length || 0;
                        const inventoryVans = inventoryVehicles?.filter(iv => iv.category === 'vehicle' && iv.isActive).length || 0;
                        return activeVans + inventoryVans;
                      })()}
                    </p>
                  </div>
                  <Truck className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Planning Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2">Cargando rutas...</span>
            </div>
          ) : routes && routes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Route List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="w-5 h-5" />
                    Rutas Optimizadas VRP
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {routes.map((route: any, index: number) => (
                      <div 
                        key={route.id || index} 
                        className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
                        data-testid={`route-card-${index}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-blue-800">
                                {route.name || `Ruta ${index + 1}`}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{route.startTime || "Programada"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{route.driverName || "Por asignar"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span>{route.appointments?.length || 0} entregas</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusColor(route.status || 'scheduled')}>
                              {getStatusIcon(route.status || 'scheduled')}
                              {route.status || 'scheduled'}
                            </Badge>
                            <div className="text-right text-sm">
                              <p className="font-medium text-green-600">
                                {route.efficiency ? `${route.efficiency}% eficiencia` : 'VRP optimizado'}
                              </p>
                              <p className="text-gray-500">
                                {route.totalDistance ? `${route.totalDistance.toFixed(1)} km` : 'Calculando...'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateDriverLink(route)}
                            className="flex-1"
                            data-testid={`button-generate-driver-link-${index}`}
                          >
                            <Navigation className="w-4 h-4 mr-1" />
                            Conductor
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setLocation('/route-map')}
                            className="flex-1"
                          >
                            <Map className="w-4 h-4 mr-1" />
                            Mapa
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Neighborhood Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Optimización por Fraccionamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {fraccionamientosWithWeights.slice(0, 6).map((frac, index) => (
                      <div 
                        key={frac.id || index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {frac.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {frac.appointments} entregas pendientes
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Weight className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600">
                              Peso {frac.weight}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Prioridad {frac.weight > 7 ? 'Alta' : frac.weight > 4 ? 'Media' : 'Baja'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No hay pickups inbound programados para {selectedDate}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Crea una nueva ruta de recolección para mascotas de clientes registrados
                </p>
                <Button 
                  onClick={() => {
                    setRouteType("inbound");
                    setShowRouteForm(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Ruta Inbound
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driver Tracking Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Driver Tracking Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryTracking?.length ? (
                  <div className="space-y-4">
                    {deliveryTracking.map((tracking: any) => (
                      <div key={tracking.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              tracking.status === 'active' ? 'bg-green-500' : 
                              tracking.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <p className="font-medium">{tracking.driverName}</p>
                              <p className="text-sm text-gray-600">{tracking.vanName}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(tracking.status)}>
                            {tracking.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Tipo de Ruta</p>
                            <p className="font-medium">{tracking.routeType || 'Mixed'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Paradas</p>
                            <p className="font-medium">{tracking.route?.completedStops || 0}/{tracking.route?.totalStops || 0}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Generate driver-specific mobile link
                              const driverLink = `/driver-dashboard/${tracking.id}`;
                              navigator.clipboard.writeText(`${window.location.origin}${driverLink}`);
                              toast({
                                title: "Enlace copiado",
                                description: "Link del dashboard móvil copiado para el conductor",
                              });
                            }}
                            className="flex-1"
                          >
                            <Navigation className="w-4 h-4 mr-1" />
                            Mobile Link
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Generate Waze/Google Maps export
                              const wazeUrl = `https://waze.com/ul?navigate=yes&ll=${tracking.currentLocation?.lat || 25.6866},${tracking.currentLocation?.lng || -100.3161}`;
                              window.open(wazeUrl, '_blank');
                            }}
                            className="flex-1"
                          >
                            <Map className="w-4 h-4 mr-1" />
                            Waze
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay conductores activos en este momento</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Route Export Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Route Export Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-medium mb-2">Inbound Routes (Pickup)</h4>
                  <p className="text-sm text-gray-600 mb-3">Export pickup routes to driver mobile apps</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      Google Maps
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Navigation className="w-4 h-4 mr-1" />
                      Waze
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <h4 className="font-medium mb-2">Outbound Routes (Delivery)</h4>
                  <p className="text-sm text-gray-600 mb-3">Export delivery routes to driver mobile apps</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      Google Maps
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Navigation className="w-4 h-4 mr-1" />
                      Waze
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Driver Mobile Dashboard</h4>
                  <p className="text-sm text-gray-600 mb-3">Generate mobile-friendly tracking links for drivers</p>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      const mobileUrl = `/driver-mobile`;
                      navigator.clipboard.writeText(`${window.location.origin}${mobileUrl}`);
                      toast({
                        title: "Link móvil copiado",
                        description: "Dashboard móvil para conductores copiado al clipboard",
                      });
                    }}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Generate Mobile Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Programación de Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliverySchedules?.length ? (
                <div className="space-y-4">
                  {deliverySchedules.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium">{schedule.name}</p>
                          <p className="text-sm text-gray-600">{schedule.scheduledDate}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay programaciones de entrega disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Rendimiento de Entregas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Entregas completadas hoy</span>
                    <span className="font-bold text-green-600">{deliveryTracking?.filter((d: any) => d.status === 'completed').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entregas en progreso</span>
                    <span className="font-bold text-blue-600">{deliveryTracking?.filter((d: any) => d.status === 'in_progress').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eficiencia promedio</span>
                    <span className="font-bold text-purple-600">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Optimización VRP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Distancia ahorrada</span>
                    <span className="font-bold text-green-600">23.4 km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiempo ahorrado</span>
                    <span className="font-bold text-blue-600">45 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costos reducidos</span>
                    <span className="font-bold text-purple-600">$180</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración de Entregas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Capacidad de Van por Defecto</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeña (8 mascotas)</SelectItem>
                      <SelectItem value="medium">Mediana (15 mascotas)</SelectItem>
                      <SelectItem value="large">Grande (25 mascotas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Zona de Cobertura</Label>
                  <Select defaultValue="monterrey">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monterrey">Monterrey Metro</SelectItem>
                      <SelectItem value="extended">Área Extendida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-4">
                <Button className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Wave-Based Route Form */}
      {showRouteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {routeType === "inbound" ? (
                <>
                  <MapPin className="w-5 h-5 text-green-600" />
                  Crear Ruta Inbound (Pickup)
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5 text-orange-600" />
                  Crear Ruta Outbound (Delivery)
                </>
              )}
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
                    placeholder={
                      routeType === "inbound" 
                        ? (deliveryMode === "wave" ? "Ej: Wave 1 - Pickup Tarde" : "Ej: Pickup Flexible Norte")
                        : (deliveryMode === "wave" ? "Ej: Wave 1 - Entrega Tarde" : "Ej: Entrega Flexible Centro")
                    } 
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



    </div>
  );
}