import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Clock, User, Phone, Calendar, MapPin, Scissors, Stethoscope, Syringe } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { FastLoadingSpinner } from "./FastLoadingSpinner";

export function HourlyAppointmentList() {
  const { currentTenant } = useTenant();
  
  // Get today's appointments
  const today = new Date().toISOString().split('T')[0];
  
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments`, currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Filter appointments for today and sort by time
  const todayAppointments = appointments
    .filter(apt => apt.appointmentDate.startsWith(today))
    .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));

  // Group appointments by hour
  const appointmentsByHour = todayAppointments.reduce((acc, appointment) => {
    const hour = appointment.appointmentTime.split(':')[0];
    if (!acc[hour]) {
      acc[hour] = [];
    }
    acc[hour].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Generate hours from 6 AM to 10 PM
  const businessHours = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 6;
    return hour.toString().padStart(2, '0');
  });

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
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
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
                        <div className="text-gray-400 text-sm italic py-2">Sin citas programadas</div>
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
                                      {appointment.appointmentTime} - {appointment.clientName}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      <span className="inline-flex items-center">
                                        <User className="w-3 h-3 mr-1" />
                                        {appointment.petName}
                                      </span>
                                      {appointment.roomName && (
                                        <span className="inline-flex items-center ml-3">
                                          <MapPin className="w-3 h-3 mr-1" />
                                          {appointment.roomName}
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
                                    {appointment.staffName}
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