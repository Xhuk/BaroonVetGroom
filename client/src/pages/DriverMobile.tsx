import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Navigation, 
  Package, 
  CheckCircle, 
  Clock, 
  Route,
  Activity,
  Map,
  Phone,
  Star
} from "lucide-react";

export default function DriverMobile() {
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get driver dashboard data
  const { data: driverData, refetch: refetchDriver } = useQuery<any>({
    queryKey: ["/api/driver/dashboard", selectedDriverId],
    enabled: !!selectedDriverId,
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Get driver progress
  const { data: progressData } = useQuery<any>({
    queryKey: ["/api/driver/progress", selectedDriverId, driverData?.driver?.tenantId],
    enabled: !!selectedDriverId && !!driverData?.driver?.tenantId,
    refetchInterval: 30000,
  });

  // Location update mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location: {latitude: number, longitude: number}) => {
      return apiRequest(`/api/driver/location/${selectedDriverId}`, "POST", {
        ...location,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      console.log("Location updated successfully");
    }
  });

  // Complete appointment mutation
  const completeAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest(`/api/driver/appointment/${appointmentId}/complete`, "POST", {
        driverId: selectedDriverId,
        completedAt: new Date().toISOString(),
        notes: "Completed via mobile driver app"
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita completada",
        description: "La cita ha sido marcada como completada exitosamente"
      });
      refetchDriver();
    }
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation && selectedDriverId) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          updateLocationMutation.mutate({
            latitude: location.lat,
            longitude: location.lng
          });
        },
        (error) => console.warn("Geolocation error:", error)
      );
    }
  }, [selectedDriverId]);

  const openInWaze = (route: any) => {
    if (!route.appointments || route.appointments.length === 0) return;
    
    // Get the first appointment as destination
    const firstStop = route.appointments[0];
    const lat = firstStop.latitude || 25.6866;
    const lng = firstStop.longitude || -100.3161;
    
    const wazeUrl = `https://waze.com/ul?navigate=yes&ll=${lat},${lng}`;
    window.open(wazeUrl, '_blank');
  };

  const openInGoogleMaps = (route: any) => {
    if (!route.appointments || route.appointments.length === 0) return;
    
    const firstStop = route.appointments[0];
    const lat = firstStop.latitude || 25.6866;
    const lng = firstStop.longitude || -100.3161;
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  };

  if (!selectedDriverId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Driver Mobile Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Ingresa tu ID de conductor para acceder al dashboard móvil
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="ID del Conductor"
                  className="w-full p-3 border rounded-lg"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => selectedDriverId && refetchDriver()}
                  disabled={!selectedDriverId}
                >
                  Acceder al Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Driver Info */}
        {driverData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {driverData.driver.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {driverData.stats.totalPickups}
                  </p>
                  <p className="text-sm text-gray-600">Pickups</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {driverData.stats.totalDeliveries}
                  </p>
                  <p className="text-sm text-gray-600">Deliveries</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {driverData.stats.completed}
                  </p>
                  <p className="text-sm text-gray-600">Completadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {driverData.stats.pending}
                  </p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Routes */}
        {driverData?.activeRoutes?.map((route: any) => (
          <Card key={route.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Route className="w-5 h-5" />
                {route.name}
                <Badge className={
                  route.type === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }>
                  {route.type === 'inbound' ? 'Pickup' : 'Delivery'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Progreso:</span>
                <span className="font-bold">
                  {route.completedStops}/{route.totalStops} paradas
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((route.completedStops || 0) / (route.totalStops || 1)) * 100}%` 
                  }}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  onClick={() => openInWaze(route)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Navigation className="w-4 h-4 mr-1" />
                  Waze
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openInGoogleMaps(route)}
                >
                  <Map className="w-4 h-4 mr-1" />
                  Maps
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Today's Appointments */}
        {driverData?.appointments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Citas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driverData.appointments.slice(0, 5).map((apt: any) => (
                  <div 
                    key={apt.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        apt.status === 'completed' ? 'bg-green-500' : 
                        apt.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium">{apt.petName || apt.petId}</p>
                        <p className="text-sm text-gray-600">{apt.clientName || apt.clientId}</p>
                        <div className="flex items-center gap-1 text-xs">
                          {apt.logistics === 'pickup' ? (
                            <MapPin className="w-3 h-3 text-green-600" />
                          ) : (
                            <Navigation className="w-3 h-3 text-orange-600" />
                          )}
                          <span>{apt.logistics === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{apt.scheduledTime}</span>
                        </div>
                      </div>
                    </div>
                    
                    {apt.status !== 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => completeAppointmentMutation.mutate(apt.id)}
                        disabled={completeAppointmentMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Progress */}
        {progressData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Progreso General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {progressData.summary.overallProgress}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressData.summary.overallProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {progressData.summary.completedStops} de {progressData.summary.totalStops} paradas completadas
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Status */}
        {currentLocation && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Ubicación actualizada</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}