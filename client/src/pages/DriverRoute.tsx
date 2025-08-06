import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  Route,
  Calendar,
  User,
  Phone,
  Home
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RouteStop {
  id: string;
  address: string;
  clientName: string;
  phone?: string;
  estimatedTime?: string;
  actualArrivalTime?: string;
  actualCompletionTime?: string;
  status: 'pending' | 'in_progress' | 'completed';
  services: string[];
}

interface DeliveryRoute {
  id: string;
  name: string;
  driverName: string;
  scheduledDate: string;
  estimatedDuration: number;
  status: string;
  stops: RouteStop[];
}

export default function DriverRoute() {
  const { routeId } = useParams();
  const { toast } = useToast();
  const [currentStop, setCurrentStop] = useState<number>(0);

  // Fetch real route data from API
  const { data: route, isLoading } = useQuery<DeliveryRoute>({
    queryKey: [`/api/driver-routes/${routeId}`],
    enabled: !!routeId,
  });

  const updateStopMutation = useMutation({
    mutationFn: async ({ stopId, status }: { stopId: string; status: string }) => {
      return apiRequest(`/api/driver-routes/${routeId}/stops/${stopId}`, "PATCH", { status });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver-routes/${routeId}`] });
      const statusMessage = {
        'in_progress': 'Parada marcada como en progreso',
        'completed': `Parada completada a las ${data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'ahora'}`,
        'pending': 'Parada marcada como pendiente'
      };
      
      toast({
        title: "Estado actualizado",
        description: statusMessage[status as keyof typeof statusMessage] || "El estado de la parada se ha actualizado correctamente.",
      });
    },
  });

  const completeRouteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/driver-routes/${routeId}/complete`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver-routes/${routeId}`] });
      toast({
        title: "Ruta completada",
        description: "La ruta se ha marcado como completada exitosamente.",
      });
    },
  });

  const openInMaps = (address: string, app: 'google' | 'waze') => {
    const encodedAddress = encodeURIComponent(address);
    
    if (app === 'google') {
      const googleUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
      window.open(googleUrl, '_blank');
    } else if (app === 'waze') {
      const wazeUrl = `https://waze.com/ul?q=${encodedAddress}`;
      window.open(wazeUrl, '_blank');
    }
  };

  const markStopComplete = (stopId: string) => {
    updateStopMutation.mutate({ stopId, status: 'completed' });
  };

  const markStopInProgress = (stopId: string) => {
    updateStopMutation.mutate({ stopId, status: 'in_progress' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ruta no encontrada
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              La ruta solicitada no existe o ha expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedStops = route.stops.filter(stop => stop.status === 'completed').length;
  const totalStops = route.stops.length;
  const progress = (completedStops / totalStops) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Route Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{route.name}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {route.driverName}
                </p>
              </div>
              <Badge className={getStatusColor(route.status)}>
                {route.status === 'in_progress' ? 'En Progreso' : route.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(route.scheduledDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {route.estimatedDuration} min
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{completedStops}/{totalStops} paradas</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Stops */}
        <div className="space-y-3">
          {route.stops.map((stop, index) => (
            <Card key={stop.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    stop.status === 'completed' ? 'bg-green-100 text-green-600' :
                    stop.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getStatusIcon(stop.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {stop.clientName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {stop.address}
                        </p>
                        {stop.phone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${stop.phone}`} className="text-blue-600 hover:underline">
                              {stop.phone}
                            </a>
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {stop.actualCompletionTime ? 
                          new Date(stop.actualCompletionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                          stop.estimatedTime || 'Pendiente'
                        }
                      </Badge>
                    </div>
                    
                    {/* Services */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {stop.services.map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openInMaps(stop.address, 'google')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Google Maps
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openInMaps(stop.address, 'waze')}
                        className="text-xs"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Waze
                      </Button>
                    </div>
                    
                    {/* Status Actions */}
                    <div className="mt-3 flex gap-2">
                      {stop.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => markStopInProgress(stop.id)}
                          className="flex-1"
                        >
                          Iniciar
                        </Button>
                      )}
                      {stop.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          onClick={() => markStopComplete(stop.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completar
                        </Button>
                      )}
                      {stop.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-800 px-3 py-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Route Button */}
        {completedStops === totalStops && route.status !== 'completed' && (
          <Card>
            <CardContent className="p-4">
              <Button 
                onClick={() => completeRouteMutation.mutate()}
                disabled={completeRouteMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {completeRouteMutation.isPending ? 'Finalizando...' : 'Finalizar Ruta'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Back to Dashboard */}
        <Card>
          <CardContent className="p-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}