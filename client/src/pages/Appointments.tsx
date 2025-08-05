import { useState, Suspense, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BackButton } from "@/components/BackButton";
import { InstantAppointmentsSkeleton } from "@/components/InstantSkeletonUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, User, Phone, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // SINGLE API CALL: Prevent multiple redundant requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['appointments-data', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/appointments-data/vetgroom1?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
    enabled: !!selectedDate
  });

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

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

      {/* ULTRA-FAST DAY NAVIGATION */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateDay('prev')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {new Date(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-sm text-gray-500">
                {data?.appointments?.length || 0} citas programadas
              </div>
            </div>
            
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className="text-blue-600 hover:text-blue-700"
              >
                Hoy
              </Button>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateDay('next')}
            className="flex items-center gap-2"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Suspense fallback={INSTANT_SKELETON}>
        <div className="grid gap-4">
          {isLoading ? (
            // Instant skeleton - shows immediately
            <InstantAppointmentsSkeleton />
          ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600 mb-4">Failed to load appointments. Please try again.</p>
              <Button 
                onClick={() => refetch()}
                className="bg-blue-600 hover:bg-blue-700"
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