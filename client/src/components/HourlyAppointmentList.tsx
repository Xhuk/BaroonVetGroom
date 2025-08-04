import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, User, Phone, Calendar, MapPin, Scissors, Stethoscope, Syringe, Plus } from "lucide-react";
import type { Appointment, Client, Pet, Room, Staff } from "@shared/schema";
import { FastLoadingSpinner } from "./FastLoadingSpinner";

import { useLocation } from "wouter";

export function HourlyAppointmentList() {
  const { currentTenant } = useTenant();
  const [, setLocation] = useLocation();
  
  // Get today's appointments
  const today = new Date().toISOString().split('T')[0];
  
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments`, currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Get all related data to show names instead of IDs
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes cache
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes cache
  });

  // Filter appointments for today and sort by time
  const todayAppointments = appointments
    .filter(apt => apt.scheduledDate && apt.scheduledDate.startsWith(today))
    .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

  // Group appointments by hour
  const appointmentsByHour = todayAppointments.reduce((acc, appointment) => {
    if (appointment.scheduledTime) {
      const hour = appointment.scheduledTime.split(':')[0];
      if (!acc[hour]) {
        acc[hour] = [];
      }
      acc[hour].push(appointment);
    }
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Generate hours from 6 AM to 10 PM
  const businessHours = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 6;
    return hour.toString().padStart(2, '0');
  });

  // Helper functions to get names from IDs
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `Cliente #${clientId}`;
  };

  const getPetName = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    return pet ? pet.name : `Mascota #${petId}`;
  };

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return null;
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : `Sala #${roomId}`;
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return 'Sin asignar';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : `Staff #${staffId}`;
  };

  const handleCreateAppointment = (hour: string) => {
    const timeSlot = `${hour}:00`;
    setLocation(`/appointments?date=${today}&time=${timeSlot}&new=true`);
  };

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'grooming': return <Scissors className="w-4 h-4 text-green-600" />;
      case 'medical': return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'vaccination': return <Syringe className="w-4 h-4 text-purple-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAppointmentColors = (type: string) => {
    switch (type) {
      case 'grooming': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'medical': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'vaccination': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  if (isLoading) {
    return <FastLoadingSpinner text="Cargando citas..." />;
  }

  return (
    <div className="px-6">
      <Card className="shadow-lg h-96 flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Citas de Hoy - {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {todayAppointments.length} citas programadas
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <div className="h-full overflow-y-auto">
            {businessHours.map(hour => {
              const hourAppointments = appointmentsByHour[hour] || [];
              const displayHour = parseInt(hour);
              const timeLabel = displayHour === 12 ? '12:00 PM' : 
                               displayHour > 12 ? `${displayHour - 12}:00 PM` : 
                               `${displayHour}:00 AM`;
              
              return (
                <div key={hour} className="border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start p-4">
                    {/* Time Column */}
                    <div className="flex items-center w-20 flex-shrink-0">
                      <Clock className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{timeLabel}</span>
                    </div>
                    
                    {/* Appointments Column */}
                    <div className="flex-1 ml-4">
                      {hourAppointments.length === 0 ? (
                        <div className="flex items-center justify-between py-2">
                          <div className="text-gray-400 text-sm italic">Sin citas programadas</div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCreateAppointment(hour)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Nueva Cita
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {hourAppointments.map(appointment => (
                            <div 
                              key={appointment.id}
                              className={`p-3 rounded-lg border transition-colors duration-150 ${getAppointmentColors(appointment.type)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getAppointmentIcon(appointment.type)}
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">
                                      {appointment.scheduledTime} - {getClientName(appointment.clientId)}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      <span className="inline-flex items-center">
                                        <User className="w-3 h-3 mr-1" />
                                        {getPetName(appointment.petId)}
                                      </span>
                                      {appointment.roomId && (
                                        <span className="inline-flex items-center ml-3">
                                          <MapPin className="w-3 h-3 mr-1" />
                                          {getRoomName(appointment.roomId)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-medium text-gray-700 capitalize">
                                    {appointment.type === 'grooming' ? 'Estética' :
                                     appointment.type === 'medical' ? 'Médica' :
                                     appointment.type === 'vaccination' ? 'Vacunación' : appointment.type}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {getStaffName(appointment.staffId)}
                                  </div>
                                </div>
                              </div>
                              {appointment.notes && (
                                <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                                  {appointment.notes}
                                </div>
                              )}
                            </div>
                          ))}
                          {/* Add new appointment button for time slots with existing appointments */}
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCreateAppointment(hour)}
                              className="text-xs px-2 py-1 h-6 w-full"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Agregar otra cita en esta hora
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}