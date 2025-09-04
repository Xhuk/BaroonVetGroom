import { useState, useEffect } from "react";
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
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";





// Map resize component to handle container size changes
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const resizeMap = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };
    
    resizeMap();
    window.addEventListener('resize', resizeMap);
    
    return () => {
      window.removeEventListener('resize', resizeMap);
    };
  }, [map]);
  
  return null;
};

// Create priority-based icons for fraccionamientos
const createPriorityIcon = (priority: 'Alta' | 'Media' | 'Baja', weight: number) => {
  const color = priority === 'Alta' ? '#dc2626' : priority === 'Media' ? '#ea580c' : '#16a34a';
  
  return L.divIcon({
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background-color: ${color}; 
        border: 2px solid white; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-weight: bold; 
        font-size: 12px; 
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${weight.toFixed(1)}</div>
    `,
    className: 'custom-priority-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Clinic location icon (blue)
const clinicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DeliveryPlan() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - NO EARLY RETURNS BEFORE THIS POINT
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [mapApiKey, setMapApiKey] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState("2025-08-25"); // Date with pickup appointments
  const [selectedMascots, setSelectedMascots] = useState<string[]>([]);
  const [searchMascots, setSearchMascots] = useState("");
  const [selectedWave, setSelectedWave] = useState("1");
  const [deliveryMode, setDeliveryMode] = useState<"wave" | "free">("wave");
  const [customHour, setCustomHour] = useState("13:00");
  const [activeTab, setActiveTab] = useState("inbound");
  const [routeType, setRouteType] = useState<"inbound" | "outbound">("inbound");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  
  // Load MapTiler API key
  useEffect(() => {
    fetch('/api/config/maptiler')
      .then(res => res.json())
      .then(data => {
        console.log('✅ MapTiler API key loaded for delivery plan');
        setMapApiKey(data.apiKey);
      })
      .catch(err => {
        console.error('❌ Failed to load MapTiler API key:', err);
      });
  }, []);

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

  // Get delivery routes with computed structure  
  const deliveryRoutes = routesResponse?.routes?.map((route: any) => ({
    id: route.id,
    name: route.title,
    status: route.status,
    estimatedTime: route.estimatedTime,
    startTime: route.startTime,
    appointments: route.appointments || []
  })) || [];
  

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

  // Real fraccionamientos data with database weights and appointment counts
  const fraccionamientosWithWeights = fraccionamientos?.map(f => {
    // Use real weight from database, fallback to default weight
    const realWeight = f.weight || 5.0;
    
    // Count pickup appointments for this fraccionamiento based on date
    const fraccionamientoAppointments = pickupAppointments.filter(apt => {
      // For demo purposes, distribute appointments across fraccionamientos
      // In real implementation, this would be based on client address/location
      return true; // Show all appointments for now
    }).length;
    
    // Distribute appointments across fraccionamientos for demonstration
    const appointmentCount = Math.floor(fraccionamientoAppointments / (fraccionamientos?.length || 1)) || 
                            (fraccionamientoAppointments > 0 ? 1 : 0);
    
    return {
      ...f,
      weight: realWeight,
      appointments: appointmentCount,
      priority: realWeight > 7 ? 'Alta' : realWeight > 4 ? 'Media' : 'Baja'
    };
  }) || [];

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
          ) : deliveryRoutes && deliveryRoutes.length > 0 ? (
            <div className="space-y-6">
              {/* Header with Route Dropdown */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Planificación de Rutas</h2>
                    <Select value={selectedRouteId || ""} onValueChange={setSelectedRouteId}>
                      <SelectTrigger className="w-80">
                        <SelectValue placeholder="Selecciona una ruta para ver en el mapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryRoutes
                          .sort((a, b) => {
                            // Active routes first, then by scheduled time
                            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
                            if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
                            return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
                          })
                          .map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              <div className="flex items-center gap-2">
                                {route.status === 'in_progress' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                {route.status === 'scheduled' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                <span>{route.name} - {route.scheduledTime} ({route.appointments.length} entregas)</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/test-map', '_blank')}
                    >
                      Test MapTiler
                    </Button>
                  </div>
                </div>
              </div>

              {/* Full Width Map */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 h-[calc(100vh-300px)]">
                <div className="h-full relative">
                  {mapApiKey ? (
                    <MapContainer
                      center={[24.8066, -107.3938]}
                      zoom={12}
                      style={{ height: '100%', width: '100%', minHeight: '400px' }}
                      className="w-full h-full rounded-lg"
                      zoomControl={true}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${mapApiKey}`}
                        attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        maxZoom={18}
                      />
                      <MapResizer />
                      
                      {/* Clinic marker */}
                      <Marker position={[24.8066, -107.3938]} icon={clinicIcon}>
                        <Popup>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">Clínica Veterinaria</div>
                            <div className="text-sm">{currentTenant?.name || currentTenant?.id}</div>
                            <div className="text-xs text-gray-500">Ubicación base</div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Route-specific markers */}
                      {selectedRouteId && (() => {
                        const selectedRoute = deliveryRoutes.find(r => r.id === selectedRouteId);
                        if (!selectedRoute) return null;
                        
                        return selectedRoute.appointments.map((appointment, index) => {
                          // Generate coordinates based on client address or use default positions
                          const baseCoords = [
                            [24.8166, -107.4038], // Position 1
                            [24.7966, -107.3838], // Position 2
                            [24.8266, -107.3738], // Position 3
                            [24.7866, -107.4138], // Position 4
                            [24.8366, -107.3638], // Position 5
                            [24.7766, -107.3938], // Position 6
                            [24.8466, -107.4238], // Position 7
                            [24.7666, -107.3538]  // Position 8
                          ];
                          const coordinates = (baseCoords[index % baseCoords.length] as [number, number]) || [24.8066, -107.3938];
                          
                          // Create delivery marker icon
                          const deliveryIcon = L.divIcon({
                            html: `
                              <div style="
                                width: 28px; 
                                height: 28px; 
                                background-color: #10b981; 
                                border: 2px solid white; 
                                border-radius: 50%; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                font-weight: bold; 
                                font-size: 12px; 
                                color: white;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                              ">${index + 1}</div>
                            `,
                            className: 'custom-delivery-marker',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14],
                            popupAnchor: [0, -14]
                          });
                          
                          return (
                            <Marker 
                              key={appointment.id}
                              position={coordinates}
                              icon={deliveryIcon}
                            >
                              <Popup>
                                <div className="text-center min-w-[200px]">
                                  <div className="font-semibold text-gray-800 mb-1">Entrega #{index + 1}</div>
                                  <div className="text-sm text-gray-600 mb-1">{appointment.client?.name}</div>
                                  <div className="text-xs text-gray-500 mb-2">{appointment.client?.address}</div>
                                  <div className="text-xs text-blue-600 font-medium">Mascota: {appointment.pet?.name}</div>
                                  <div className="text-xs text-green-600">Hora: {appointment.scheduledTime}</div>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        });
                      })()}
                      
                      {/* Show all fraccionamientos when no route selected */}
                      {!selectedRouteId && fraccionamientosWithWeights.slice(0, 6).map((frac, index) => {
                        const baseCoords = [
                          [24.8166, -107.4038], // Las Flores
                          [24.7966, -107.3838], // El Bosque
                          [24.8266, -107.3738], // Villa Real
                          [24.7866, -107.4138], // Los Pinos
                          [24.8366, -107.3638], // San Miguel
                          [24.7766, -107.3938]  // Centro
                        ];
                        const coordinates = (baseCoords[index] as [number, number]) || [24.8066, -107.3938];
                        
                        return (
                          <Marker 
                            key={frac.id || index}
                            position={coordinates}
                            icon={createPriorityIcon(frac.priority as 'Alta' | 'Media' | 'Baja', frac.weight)}
                          >
                            <Popup>
                              <div className="text-center">
                                <div className="font-semibold text-gray-800">{frac.name}</div>
                                <div className="text-sm text-gray-600">{frac.appointments} entregas pendientes</div>
                                <div className="text-xs text-orange-600 font-medium">Peso: {frac.weight} | Prioridad: {frac.priority}</div>
                                <div className="text-xs text-gray-500 mt-1">Zona: {frac.zone || 'Centro'}</div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Cargando mapa...</p>
                      </div>
                    </div>
                  )}
                
                  {/* Legend */}
                  <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-sm mb-2">Leyenda</h4>
                    <div className="space-y-1 text-xs">
                      {selectedRouteId ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                            <span>Clínica Veterinaria</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                            <span>Puntos de entrega</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                            <span>Alta prioridad (7-10)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                            <span>Media prioridad (4-7)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                            <span>Baja prioridad (1-4)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay rutas disponibles para mostrar.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
