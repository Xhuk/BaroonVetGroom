import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";
import { getCurrentTimeCST1, getTodayCST1 } from "@shared/timeUtils";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
}

export function FastCalendar({ appointments, className }: FastCalendarProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeCST1());

  // Update current time every minute using CST-1 timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeCST1());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get current day in CST-1 timezone
  const todayStr = getTodayCST1();

  // Generate 30-minute time slots for the entire day
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 6; h < 22; h++) { // 6 AM to 10 PM for veterinary clinic
      for (let m = 0; m < 60; m += 30) {
        const hour = String(h).padStart(2, '0');
        const minute = String(m).padStart(2, '0');
        slots.push(`${hour}:${minute}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getAppointmentStyle = (appointment: Appointment) => {
    const typeStyles = {
      grooming: "bg-green-200 text-green-800 border border-green-300",
      medical: "bg-blue-200 text-blue-800 border border-blue-300", 
      vaccination: "bg-purple-200 text-purple-800 border border-purple-300",
    };
    return typeStyles[appointment.type as keyof typeof typeStyles] || "bg-gray-200 text-gray-800 border border-gray-300";
  };

  const getAppointmentsForSlot = (timeSlot: string) => {
    return appointments.filter((appointment: Appointment) => {
      const appointmentDate = appointment.scheduledDate || appointment.date;
      const appointmentTime = appointment.scheduledTime || appointment.startTime;
      
      if (!appointmentDate || !appointmentTime) {
        return false;
      }

      const normalizedAppointmentDate = appointmentDate.split('T')[0];
      const appointmentTimeStr = typeof appointmentTime === 'string' 
        ? appointmentTime.substring(0, 5) 
        : appointmentTime;

      return normalizedAppointmentDate === todayStr && appointmentTimeStr === timeSlot;
    });
  };

  const getCurrentTimePosition = () => {
    const now = getCurrentTimeCST1();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours < 6 || hours >= 22) return null; // Outside visible hours
    
    const totalMinutes = (hours - 6) * 60 + minutes; // Minutes since 6 AM
    const totalVisibleMinutes = 16 * 60; // 6 AM to 10 PM = 16 hours
    return (totalMinutes / totalVisibleMinutes) * 100;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <Card className={cn("mx-6", className)}>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-800">
          Calendario de Hoy - {currentTime.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-96 overflow-y-auto">
          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div 
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full"></div>
              <div className="absolute -right-16 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
                {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
          
          {timeSlots.map(slot => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getHours() === parseInt(slot.split(':')[0]) &&
                                  currentTime.getMinutes() >= parseInt(slot.split(':')[1]) &&
                                  currentTime.getMinutes() < parseInt(slot.split(':')[1]) + 30;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-start py-3 border-b border-gray-100 last:border-b-0",
                  isCurrentSlot && "bg-blue-50"
                )}
              >
                <div className="w-20 text-right pr-4 text-sm text-gray-500 font-medium">
                  {new Date(`2000-01-01T${slot}`).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: true 
                  })}
                </div>
                <div className="flex-1 pl-4">
                  {slotAppointments.length > 0 ? (
                    slotAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        className={cn(
                          "p-3 mb-2 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                          getAppointmentStyle(appointment)
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="mr-3 text-xl">
                              {appointment.type === 'grooming' ? '🐾' : '🩺'}
                            </span>
                            <div>
                              <p className="font-semibold text-sm">
                                {appointment.clientName || 'Cliente'} - {appointment.type}
                              </p>
                              <p className="text-xs text-gray-600">
                                {appointment.petName || 'Mascota'}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            appointment.status === 'confirmed' && "bg-green-100 text-green-800",
                            appointment.status === 'pending' && "bg-yellow-100 text-yellow-800",
                            appointment.status === 'scheduled' && "bg-blue-100 text-blue-800"
                          )}>
                            {appointment.status || 'Programada'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic">Libre</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}