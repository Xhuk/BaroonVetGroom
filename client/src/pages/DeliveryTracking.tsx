import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Phone, 
  Users,
  Navigation,
  Timer,
  Bell,
  ArrowLeft,
  Settings
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { BackButton } from "@/components/BackButton";

interface DeliveryTracker {
  id: string;
  vanId: string;
  vanName: string;
  driverId: string;
  driverName: string;
  status: "preparing" | "en_route" | "delayed" | "completed" | "emergency";
  departureTime?: string;
  estimatedReturnTime?: string;
  actualReturnTime?: string;
  delayMinutes: number;
  currentLocation?: { lat: number; lng: number; timestamp: string };
  lastCheckIn?: string;
  nextCheckInDue?: string;
  alertsSent: number;
  route: {
    id: string;
    name: string;
    totalStops: number;
    completedStops: number;
  };
}

interface DeliveryAlert {
  id: string;
  alertType: "delay_warning" | "delay_critical" | "missed_checkin" | "emergency" | "route_complete";
  severity: "low" | "medium" | "high" | "critical";
  recipientType: "admin" | "owner" | "driver" | "backup_driver";
  message: string;
  whatsappSent: boolean;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  vanName: string;
  driverName: string;
}

export default function DeliveryTracking() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);

  // BETA: Delivery tracking enabled for all tenants during testing
  const tenantConfig = { deliveryTrackingEnabled: true };

  // Fetch active delivery tracking
  const { data: activeDeliveries, refetch: refetchDeliveries } = useQuery<DeliveryTracker[]>({
    queryKey: ["/api/delivery-tracking", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch delivery alerts
  const { data: deliveryAlerts, refetch: refetchAlerts } = useQuery<DeliveryAlert[]>({
    queryKey: ["/api/delivery-alerts", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Send emergency alert
  const sendEmergencyAlert = useMutation({
    mutationFn: async (trackingId: string) => {
      return await apiRequest(`/api/delivery-tracking/${trackingId}/emergency`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Alerta de Emergencia Enviada",
        description: "Se ha notificado a todos los contactos de emergencia",
      });
      refetchAlerts();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la alerta de emergencia",
        variant: "destructive",
      });
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      return await apiRequest(`/api/delivery-alerts/${alertId}/resolve`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      toast({
        title: "Alerta Resuelta",
        description: "La alerta ha sido marcada como resuelta",
      });
      refetchAlerts();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing": return "bg-blue-100 text-blue-800";
      case "en_route": return "bg-green-100 text-green-800";
      case "delayed": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "emergency": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const unreadAlerts = deliveryAlerts?.filter(alert => !alert.isRead) || [];
  const criticalAlerts = deliveryAlerts?.filter(alert => alert.severity === "critical" && !alert.isResolved) || [];

  // Check if feature is enabled
  if (!tenantConfig?.deliveryTrackingEnabled) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton 
            href="/dashboard"
            text="Volver al Dashboard"
            variant="ghost"
            size="sm"
            testId="button-back"
          />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Seguimiento de Entregas - BETA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Esta funcionalidad está en fase BETA y no está habilitada para su cuenta. 
                Contacte al administrador del sistema para activar el seguimiento de entregas.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton 
            href="/dashboard"
            text="Dashboard"
            variant="ghost"
            size="sm"
            testId="button-back"
          />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Seguimiento de Entregas
              <Badge variant="secondary" className="text-xs">BETA</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo en tiempo real de rutas de entrega y conductores
            </p>
          </div>
        </div>
        
        {criticalAlerts.length > 0 && (
          <Alert className="w-auto border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? 's' : ''} crítica{criticalAlerts.length > 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Entregas Activas ({activeDeliveries?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas ({unreadAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {!activeDeliveries?.length ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-gray-500">No hay entregas activas en este momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        {delivery.vanName}
                      </CardTitle>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status === "preparing" && "Preparando"}
                        {delivery.status === "en_route" && "En Ruta"}
                        {delivery.status === "delayed" && "Retrasado"}
                        {delivery.status === "completed" && "Completado"}
                        {delivery.status === "emergency" && "Emergencia"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Conductor:</p>
                        <p className="font-medium">{delivery.driverName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ruta:</p>
                        <p className="font-medium">{delivery.route.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Paradas:</p>
                        <p className="font-medium">
                          {delivery.route.completedStops}/{delivery.route.totalStops}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Retraso:</p>
                        <p className={`font-medium ${delivery.delayMinutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {delivery.delayMinutes > 0 ? `+${delivery.delayMinutes} min` : "A tiempo"}
                        </p>
                      </div>
                    </div>

                    {delivery.lastCheckIn && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Último check-in: {format(new Date(delivery.lastCheckIn), "HH:mm")}</span>
                      </div>
                    )}

                    {delivery.nextCheckInDue && (
                      <div className="flex items-center gap-2 text-sm">
                        <Timer className="w-4 h-4 text-blue-600" />
                        <span>Próximo check-in: {format(new Date(delivery.nextCheckInDue), "HH:mm")}</span>
                      </div>
                    )}

                    {delivery.currentLocation && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <span>Última ubicación: {format(new Date(delivery.currentLocation.timestamp), "HH:mm")}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTrackerId(delivery.id)}
                        className="flex-1"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Ver en Mapa
                      </Button>
                      
                      {delivery.status !== "emergency" && delivery.delayMinutes > 30 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => sendEmergencyAlert.mutate(delivery.id)}
                          disabled={sendEmergencyAlert.isPending}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Emergencia
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {!deliveryAlerts?.length ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-gray-500">No hay alertas en este momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {deliveryAlerts.map((alert) => (
                <Card key={alert.id} className={`${!alert.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity === "low" && "Baja"}
                            {alert.severity === "medium" && "Media"}
                            {alert.severity === "high" && "Alta"}
                            {alert.severity === "critical" && "Crítica"}
                          </Badge>
                          <Badge variant="outline">
                            {alert.alertType === "delay_warning" && "Advertencia de Retraso"}
                            {alert.alertType === "delay_critical" && "Retraso Crítico"}
                            {alert.alertType === "missed_checkin" && "Check-in Perdido"}
                            {alert.alertType === "emergency" && "Emergencia"}
                            {alert.alertType === "route_complete" && "Ruta Completada"}
                          </Badge>
                          {alert.whatsappSent && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Phone className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium mb-1">
                          {alert.vanName} - {alert.driverName}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {!alert.isResolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert.mutate(alert.id)}
                            disabled={resolveAlert.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}