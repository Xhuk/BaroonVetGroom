import { useState, useEffect, useMemo, Suspense, memo } from "react";
import { BackButton } from "@/components/BackButton";
import { InstantAppointmentsSkeleton } from "@/components/InstantSkeletonUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, User, Phone, Edit, Trash2 } from "lucide-react";
import type { Appointment, Client, Pet, Room, Staff, Service } from "@shared/schema";

interface AppointmentData {
  appointments: Appointment[];
  clients: Client[];
  pets: Pet[];
  rooms: Room[];
  staff: Staff[];
  services: Service[];
  timestamp: number;
}

// Pre-initialize skeleton for instant rendering
const INSTANT_SKELETON = <InstantAppointmentsSkeleton />;

const Appointments = memo(function Appointments() {
  const [data, setData] = useState<AppointmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OPTIMIZED FETCH - Cache-first approach
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Check if we have cached data first
        const cachedData = sessionStorage.getItem('appointments-cache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (Date.now() - parsed.timestamp < 60000) { // 1 minute cache
            if (isMounted) {
              setData(parsed.data);
              setIsLoading(false);
            }
            return;
          }
        }

        const response = await fetch('/api/appointments-data/vetgroom1', {
          headers: { 'Cache-Control': 'max-age=60' }
        });
        
        if (response.ok && isMounted) {
          const result = await response.json();
          setData(result);
          // Cache the result
          sessionStorage.setItem('appointments-cache', JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } else if (isMounted) {
          setError('Failed to load appointments');
        }
      } catch (err) {
        if (isMounted) setError('Network error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    
    return () => { isMounted = false; };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-300";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed": return "bg-green-100 text-green-800 border-green-300";
      case "cancelled": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // INSTANT UI - Always render immediately with skeleton
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <BackButton href="/" text="Volver al Dashboard" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Gestión de Citas</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      <Suspense fallback={INSTANT_SKELETON}>
        <div className="grid gap-4">
          {isLoading ? (
            // Instant skeleton - shows immediately
            <InstantAppointmentsSkeleton />
          ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : data?.appointments?.map((appointment) => {
          const client = data.clients?.find(c => c.id === appointment.clientId);
          const pet = data.pets?.find(p => p.id === appointment.petId);
          
          return (
            <Card key={appointment.id} className="border-l-4 border-l-blue-400">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status || 'scheduled')}`}>
                        {appointment.status === "scheduled" && "Programada"}
                        {appointment.status === "in_progress" && "En Proceso"}
                        {appointment.status === "completed" && "Completada"}
                        {appointment.status === "cancelled" && "Cancelada"}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span>
                          {appointment.logistics === "pickup" ? "🚐 Recogemos" : "🏠 Cliente trae"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>{appointment.scheduledDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.scheduledTime}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <User className="w-4 h-4" />
                          <span>Cliente: {client?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{client?.phone || 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Mascota:</span> {pet?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Tipo:</span> {appointment.type}
                        </div>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{appointment.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && !error && (!data?.appointments || data.appointments.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas programadas</h3>
              <p className="text-gray-500 mb-4">Comienza creando tu primera cita para una mascota.</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Cita
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </Suspense>
    </div>
  );
});

export default Appointments;