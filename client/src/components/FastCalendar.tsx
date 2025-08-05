import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";
import { getCurrentTimeInUserTimezone } from "@shared/userPreferences";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
}

export function FastCalendar({ appointments, className }: FastCalendarProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInUserTimezone());

  // Update current time every minute using user's timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeInUserTimezone());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get current day in user's timezone
  const todayStr = currentTime.toISOString().split('T')[0];

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
      const appointmentDate = appointment.scheduledDate;
      const appointmentTime = appointment.scheduledTime;
      
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
    const now = getCurrentTimeInUserTimezone();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours < 6 || hours >= 22) {
      return null; // Outside visible hours
    }
    
    // Calculate position within visible slots
    const totalMinutes = (hours - 6) * 60 + minutes; // Minutes since 6 AM
    const slotHeight = 60; // Each 30-minute slot is 60px tall
    const position = (totalMinutes / 30) * slotHeight; // Position in pixels
    
    return position;
  };

  const getContainerOffset = () => {
    const now = getCurrentTimeInUserTimezone();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours < 6 || hours >= 22) return 0;
    
    // Move container every 15 minutes to keep indicator centered
    const quarterHour = Math.floor(minutes / 15) * 15; // 0, 15, 30, 45
    return quarterHour * 0.5; // Slight movement offset
  };

  const currentTimePosition = getCurrentTimePosition();
  const containerOffset = getContainerOffset();

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
        <div className="relative max-h-96 overflow-hidden">
          {/* Floating Radio Dial Time Indicator */}
          {currentTimePosition !== null && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <div className="relative w-full h-full">
                {/* Radio dial background */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-black/80 rounded-full border-4 border-red-500 shadow-2xl">
                  {/* Inner dial */}
                  <div className="absolute inset-2 bg-gray-900 rounded-full">
                    {/* Time display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-red-400 text-lg font-mono font-bold">
                          {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-gray-400 text-xs font-mono">
                          EN VIVO
                        </div>
                      </div>
                    </div>
                    {/* Needle pointing down */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-red-500 rounded-full shadow-lg"></div>
                  </div>
                </div>
                
                {/* Precise time line extending to slots */}
                <div 
                  className="absolute left-0 right-0 h-1 bg-red-500/60 shadow-lg z-20"
                  style={{ 
                    top: `${(currentTimePosition / (timeSlots.length * 60)) * 100}%`,
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  <div className="absolute -left-1 -top-1 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                  <div className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Time slots container with dynamic offset */}
          <div 
            className="transition-transform duration-500 ease-in-out overflow-y-auto max-h-80"
            style={{ 
              transform: `translateY(${containerOffset}px)`,
              paddingTop: currentTimePosition !== null ? '40px' : '0'
            }}
          >
          
          {timeSlots.map(slot => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getHours() === parseInt(slot.split(':')[0]) &&
                                  currentTime.getMinutes() >= parseInt(slot.split(':')[1]) &&
                                  currentTime.getMinutes() < parseInt(slot.split(':')[1]) + 30;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-start py-3 border-b border-gray-100 last:border-b-0 transition-all duration-300",
                  isCurrentSlot && "bg-red-50 border-red-200 shadow-sm",
                  "min-h-[60px]" // Fixed height for consistent positioning
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
                                Cliente - {appointment.type}
                              </p>
                              <p className="text-xs text-gray-600">
                                Mascota #{appointment.petId}
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
        </div>
      </CardContent>
    </Card>
  );
}