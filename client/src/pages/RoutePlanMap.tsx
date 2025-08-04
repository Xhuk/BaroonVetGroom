import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, MapPin, Route, Settings, Calculator, Scale } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DebugControls } from "@/components/DebugControls";

// Create numbered customer icons for route order
const createNumberedIcon = (number: number) => {
  return L.divIcon({
    html: `
      <div style="
        width: 30px; 
        height: 30px; 
        background-color: #22c55e; 
        border: 3px solid white; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-weight: bold; 
        font-size: 14px; 
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    className: 'custom-numbered-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Green GPS icon for unordered customer locations
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Clinic location icon (blue)
const clinicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RouteOptimizationRequest {
  appointments: any[];
  vanCapacity: 'small' | 'medium' | 'large';
  fraccionamientoWeights: Record<string, number>;
  clinicLocation: [number, number];
}

export default function RoutePlanMap() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState("2025-08-25");
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedVanCapacity, setSelectedVanCapacity] = useState<'small' | 'medium' | 'large'>('medium');

  // Get tenant data for clinic location
  const { data: tenantData } = useQuery({
    queryKey: ["/api/tenants", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });
  
  // Use tenant's actual GPS coordinates or fallback to Monterrey center
  const clinicLocation: [number, number] = (tenantData?.latitude && tenantData?.longitude) 
    ? [parseFloat(tenantData.latitude), parseFloat(tenantData.longitude)]
    : [25.6866, -100.3161];

  const { data: appointments } = useQuery<any[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: fraccionamientos } = useQuery<any[]>({
    queryKey: ["/api/fraccionamientos", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Get inventory data for cage weights
  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: ["/api/inventory", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Filter pickup appointments for selected date
  const pickupAppointments = useMemo(() => {
    return appointments?.filter(apt => 
      apt.scheduledDate === selectedDate && 
      apt.logistics === "pickup" &&
      apt.client?.latitude && 
      apt.client?.longitude
    ) || [];
  }, [appointments, selectedDate]);

  // Create fraccionamiento weights map
  const fraccionamientoWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    fraccionamientos?.forEach(frac => {
      // Calculate weight based on distance from clinic (simplified)
      const fracLat = parseFloat(frac.latitude || '0');
      const fracLng = parseFloat(frac.longitude || '0');
      const distance = Math.sqrt(
        Math.pow(fracLat - clinicLocation[0], 2) + 
        Math.pow(fracLng - clinicLocation[1], 2)
      );
      weights[frac.name] = Math.min(10.9, Math.max(1.0, distance * 100));
    });
    return weights;
  }, [fraccionamientos]);

  // Calculate cage and weight statistics
  const weightStatistics = useMemo(() => {
    if (!pickupAppointments.length) return { 
      totalPetWeight: 0, 
      averagePetWeight: 0, 
      cageWeights: { small: 0, medium: 0, large: 0 }, 
      cageAllocation: { small: 0, medium: 0, large: 0 },
      totalTareWeight: 0,
      totalWeight: 0
    };

    // Calculate total and average pet weights from actual pet data
    const totalPetWeight = pickupAppointments.reduce((sum, apt) => {
      const petWeight = parseFloat(apt.pet?.weight) || 5; // Default 5kg if no weight specified
      return sum + petWeight;
    }, 0);
    
    const averagePetWeight = totalPetWeight / pickupAppointments.length;

    // Get cage weights from inventory (tare weights)
    const cageWeights = {
      small: parseFloat(inventoryItems?.find(item => item.name?.toLowerCase().includes('jaula pequeña') || item.name?.toLowerCase().includes('cage small'))?.weight) || 2.5,
      medium: parseFloat(inventoryItems?.find(item => item.name?.toLowerCase().includes('jaula mediana') || item.name?.toLowerCase().includes('cage medium'))?.weight) || 4.0,
      large: parseFloat(inventoryItems?.find(item => item.name?.toLowerCase().includes('jaula grande') || item.name?.toLowerCase().includes('cage large'))?.weight) || 6.5
    };

    // Calculate cage allocation based on pet sizes and van capacity
    const cageAllocation = pickupAppointments.reduce((cages, apt) => {
      const petWeight = parseFloat(apt.pet?.weight) || 5;
      if (petWeight <= 8) cages.small++;
      else if (petWeight <= 20) cages.medium++;
      else cages.large++;
      return cages;
    }, { small: 0, medium: 0, large: 0 });

    // Calculate total tare weight for allocated cages
    const totalTareWeight = 
      (cageAllocation.small * cageWeights.small) +
      (cageAllocation.medium * cageWeights.medium) +
      (cageAllocation.large * cageWeights.large);

    return {
      totalPetWeight,
      averagePetWeight,
      cageWeights,
      cageAllocation,
      totalTareWeight,
      totalWeight: totalPetWeight + totalTareWeight
    };
  }, [pickupAppointments, inventoryItems]);

  // Route optimization mutation
  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: RouteOptimizationRequest) => {
      if (!currentTenant?.id) throw new Error("No tenant selected");
      const response = await apiRequest(`/api/optimize-route/${currentTenant.id}`, "POST", data);
      return await response.json();
    },
    onSuccess: (result: any) => {
      setOptimizedRoute(result.optimizedRoute || []);
      toast({
        title: "Ruta Optimizada",
        description: `Se generó una ruta optimizada con ${result.optimizedRoute?.length || 0} paradas`,
      });
    },
    onError: (error) => {
      console.error("Route optimization error:", error);
      toast({
        title: "Error",
        description: "No se pudo optimizar la ruta. Usando orden por peso de fraccionamiento.",
        variant: "destructive",
      });
      // Fallback: sort by fraccionamiento weight
      const sorted = [...pickupAppointments].sort((a, b) => {
        const weightA = fraccionamientoWeights[a.client?.fraccionamiento] || 5;
        const weightB = fraccionamientoWeights[b.client?.fraccionamiento] || 5;
        return weightA - weightB;
      });
      setOptimizedRoute(sorted);
    },
  });

  const handleOptimizeRoute = () => {
    if (pickupAppointments.length === 0) {
      toast({
        title: "Sin Recolecciones",
        description: "No hay recolecciones programadas para optimizar",
        variant: "destructive",
      });
      return;
    }

    if (!currentTenant?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar el tenant",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    optimizeRouteMutation.mutate({
      appointments: pickupAppointments,
      vanCapacity: selectedVanCapacity,
      fraccionamientoWeights,
      clinicLocation,
    });
    setIsOptimizing(false);
  };

  // Generate route polyline coordinates
  const routeCoordinates = useMemo(() => {
    if (optimizedRoute.length === 0) return [];
    
    const coords: [number, number][] = [clinicLocation];
    optimizedRoute.forEach(apt => {
      if (apt.client?.latitude && apt.client?.longitude) {
        coords.push([apt.client.latitude, apt.client.longitude]);
      }
    });
    coords.push(clinicLocation); // Return to clinic
    return coords;
  }, [optimizedRoute]);

  const vanCapacityInfo = {
    small: { capacity: '5-8 mascotas', color: 'bg-yellow-100 text-yellow-800' },
    medium: { capacity: '10-15 mascotas', color: 'bg-blue-100 text-blue-800' },
    large: { capacity: '20-25 mascotas', color: 'bg-green-100 text-green-800' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/delivery-plan")}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-back-to-delivery"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Planificación
          </Button>
          <h1 className="text-2xl font-bold text-blue-800">Mapa de Rutas - {new Date(selectedDate).toLocaleDateString()}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <DebugControls />
          <select
            value={selectedVanCapacity}
            onChange={(e) => setSelectedVanCapacity(e.target.value as 'small' | 'medium' | 'large')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">Van Pequeña (5-8)</option>
            <option value="medium">Van Mediana (10-15)</option>
            <option value="large">Van Grande (20-25)</option>
          </select>
          
          <Button
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || pickupAppointments.length === 0}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-optimize-route"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isOptimizing ? "Optimizando..." : "Optimizar Ruta"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="h-[600px] w-full rounded-lg overflow-hidden">
                <MapContainer
                  center={clinicLocation}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  data-testid="route-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Clinic marker */}
                  <Marker position={clinicLocation} icon={clinicIcon}>
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-semibold">Clínica Veterinaria</h3>
                        <p className="text-sm text-gray-600">Punto de partida y regreso</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Customer markers with route numbers */}
                  {pickupAppointments.map((appointment, index) => {
                    // Check if this appointment is in the optimized route
                    const routeIndex = optimizedRoute.findIndex(apt => apt.id === appointment.id);
                    const isInRoute = routeIndex !== -1;
                    const routeNumber = routeIndex + 1;

                    return (
                      <Marker
                        key={appointment.id}
                        position={[appointment.client.latitude, appointment.client.longitude]}
                        icon={isInRoute ? createNumberedIcon(routeNumber) : customerIcon}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <h3 className="font-semibold">{appointment.client.name}</h3>
                            <p className="text-sm text-gray-600">Mascota: {appointment.pet?.name}</p>
                            <p className="text-sm text-gray-600">Hora: {appointment.scheduledTime}</p>
                            <p className="text-sm text-gray-600">{appointment.client.fraccionamiento}</p>
                            <Badge className="mt-1 text-xs">
                              Peso: {fraccionamientoWeights[appointment.client.fraccionamiento]?.toFixed(1) || 'N/A'}
                            </Badge>
                            {isInRoute && (
                              <Badge className="ml-1 bg-green-100 text-green-800">
                                Parada #{routeNumber}
                              </Badge>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Optimized route line */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      positions={routeCoordinates}
                      color="blue"
                      weight={3}
                      opacity={0.7}
                      dashArray="5, 10"
                    />
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <div>
          <div className="space-y-4">
            {/* Van Capacity Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Capacidad de Van
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={vanCapacityInfo[selectedVanCapacity].color}>
                  {vanCapacityInfo[selectedVanCapacity].capacity}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  Total recolecciones: {pickupAppointments.length}
                </p>
                {pickupAppointments.length > parseInt(vanCapacityInfo[selectedVanCapacity].capacity.split('-')[1]) && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Excede capacidad - considere dividir en múltiples rutas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Route Order */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Orden de Ruta {optimizedRoute.length > 0 && "(Optimizada)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                      0
                    </div>
                    <div>
                      <p className="font-medium">Clínica Veterinaria</p>
                      <p className="text-xs text-gray-600">Punto de partida</p>
                    </div>
                  </div>

                  {(optimizedRoute.length > 0 ? optimizedRoute : pickupAppointments).map((appointment, index) => {
                    const weight = fraccionamientoWeights[appointment.client?.fraccionamiento] || 0;
                    return (
                      <div key={appointment.id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{appointment.client?.name}</p>
                          <p className="text-sm text-gray-600">{appointment.pet?.name} - {appointment.scheduledTime}</p>
                          <p className="text-xs text-gray-500">{appointment.client?.fraccionamiento}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Peso: {weight.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                      {(optimizedRoute.length || pickupAppointments.length) + 1}
                    </div>
                    <div>
                      <p className="font-medium">Clínica Veterinaria</p>
                      <p className="text-xs text-gray-600">Regreso</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weight Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Estadísticas de Peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Peso total mascotas:</p>
                      <p className="font-medium text-lg">{(weightStatistics.totalPetWeight || 0).toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Peso promedio:</p>
                      <p className="font-medium text-lg">{(weightStatistics.averagePetWeight || 0).toFixed(1)} kg</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="font-medium mb-2">Asignación de Jaulas:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Pequeñas (≤8kg):</span>
                        <span className="font-medium">{weightStatistics.cageAllocation?.small || 0} jaulas</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medianas (9-20kg):</span>
                        <span className="font-medium">{weightStatistics.cageAllocation?.medium || 0} jaulas</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grandes (&gt;20kg):</span>
                        <span className="font-medium">{weightStatistics.cageAllocation?.large || 0} jaulas</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span>Peso tara (jaulas):</span>
                      <span className="font-medium">{(weightStatistics.totalTareWeight || 0).toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base">
                      <span>Peso total carga:</span>
                      <span className="text-blue-600">{(weightStatistics.totalWeight || 0).toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Route Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total paradas:</span>
                    <span className="font-medium">{pickupAppointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge variant={optimizedRoute.length > 0 ? "default" : "secondary"}>
                      {optimizedRoute.length > 0 ? "Optimizada" : "Sin optimizar"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}