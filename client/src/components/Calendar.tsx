import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";

interface CalendarProps {
  className?: string;
}

export function Calendar({ className }: CalendarProps) {
  const { currentTenant } = useTenant();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get current day only
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Generate 30-minute time slots for the entire day (like your reference)
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
      // Check if appointment has the expected date fields
      const appointmentDate = appointment.scheduledDate || appointment.date;
      const appointmentTime = appointment.scheduledTime || appointment.startTime;
      
      if (!appointmentDate || !appointmentTime) {
        console.log("Missing date/time for appointment:", appointment.id, { appointmentDate, appointmentTime });
        return false;
      }
      
      const appDate = new Date(appointmentDate);
      const todayDate = new Date(today.toDateString()); // Normalize to start of day
      
      // More robust date comparison - check if same date
      const isSameDate = appDate.toDateString() === todayDate.toDateString();
      
      // Extract time in HH:MM format
      const timeMatch = appointmentTime.substring(0, 5) === timeSlot;
      
      // Debug logging
      if (isSameDate) {
        console.log("Found appointment for today:", {
          id: appointment.id,
          date: appointmentDate,
          time: appointmentTime,
          timeSlot,
          timeMatch
        });
      }
      
      return isSameDate && timeMatch;
    });
  };

  // Check if appointment is currently ongoing
  const isOngoing = (appointment: Appointment) => {
    const appointmentTime = appointment.scheduledTime || appointment.startTime;
    if (!appointment || !appointmentTime) return false;
    
    const appStart = new Date(`${today.toLocaleDateString('en-CA')}T${appointmentTime}`);
    const duration = 60; // Default 60 minutes duration
    const appEnd = new Date(appStart.getTime() + duration * 60 * 1000);
    const now = new Date();
    
    return now >= appStart && now < appEnd;
  };

  // Check if current time slot is active
  const isCurrentSlot = (timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const now = currentTime;
    return (
      now.getHours() === hour &&
      now.getMinutes() >= minute &&
      now.getMinutes() < minute + 30
    );
  };

  const getCurrentTimeLine = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours >= 8 && hours <= 18) {
      const slotIndex = hours - 8;
      const minuteOffset = (minutes / 60) * 60; // 60px per hour slot
      return {
        top: `${slotIndex * 60 + minuteOffset + 40}px`, // 40px for header
        show: true
      };
    }
    return { top: "0px", show: false };
  };

  const currentTimeLine = getCurrentTimeLine();

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const todayName = dayNames[today.getDay()];
  const todayMonth = monthNames[today.getMonth()];

  if (isLoading) {
    return (
      <div className={cn("h-full w-full", className)}>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <div className="bg-blue-100 dark:bg-slate-800 text-blue-800 dark:text-slate-200 p-4 border-b border-blue-200 dark:border-slate-600 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Calendario de Hoy - {todayName}, {today.getDate()} de {todayMonth} {today.getFullYear()}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Vista Diaria</span>
            <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
              {appointments.length} citas cargadas
            </span>
          </div>
        </div>
      </div>
      
      <div className="w-full">
        <div className="bg-white dark:bg-slate-900 relative w-full" style={{ height: "600px", overflow: "auto" }}>
          {/* Time slots in single column layout like your reference */}
          <div className="w-full h-full overflow-y-auto pr-2">
            {timeSlots.map((timeSlot) => {
              const slotAppointments = getAppointmentsForSlot(timeSlot);
              const isActive = isCurrentSlot(timeSlot);
              
              return (
                <div 
                  key={timeSlot} 
                  className={cn(
                    "flex items-start py-3 border-b border-gray-200 dark:border-slate-600 last:border-b-0 w-full",
                    isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  )}
                >
                  {/* Time label - fixed width */}
                  <div className="w-20 text-right pr-4 text-sm text-gray-500 dark:text-slate-400 font-medium flex-shrink-0">
                    {new Date(`2000-01-01T${timeSlot}`).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: true 
                    })}
                  </div>
                  
                  {/* Appointments section - takes remaining width */}
                  <div className="flex-1 pl-4 w-full">
                    {slotAppointments.length > 0 ? (
                      <div className="grid gap-2 w-full" style={{
                        gridTemplateColumns: slotAppointments.length === 1 
                          ? '1fr' 
                          : slotAppointments.length === 2 
                          ? '1fr 1fr' 
                          : slotAppointments.length === 3
                          ? '1fr 1fr 1fr'
                          : 'repeat(auto-fit, minmax(250px, 1fr))'
                      }}>
                        {slotAppointments.map((appointment: Appointment) => (
                          <div
                            key={appointment.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg shadow-sm cursor-pointer transition duration-200 ease-in-out border-l-4 w-full",
                              appointment.type === 'grooming' 
                                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30" 
                                : appointment.type === 'medical'
                                ? "bg-green-50 dark:bg-green-900/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
                                : "bg-blue-50 dark:bg-blue-900/20 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30",
                              isOngoing(appointment) ? "ring-2 ring-red-500 ring-offset-2" : ""
                            )}
                          >
                            <div className="flex items-center flex-1">
                              <span className="mr-3 text-xl">
                                {appointment.type === 'grooming' ? '🐾' : appointment.type === 'medical' ? '🩺' : '💉'}
                              </span>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                  {appointment.type === 'grooming' && 'Estética'}
                                  {appointment.type === 'medical' && 'Consulta Médica'}
                                  {appointment.type === 'vaccination' && 'Vacunación'}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">
                                  {appointment.roomId ? `Sala ${appointment.roomId.slice(-2)}` : 'Sin sala'} • 
                                  Staff: {appointment.staffId?.slice(-2) || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Programada
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">Disponible</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current time line - positioned within scrollable area */}
          {currentTimeLine.show && (
            <div
              className="absolute left-20 right-4 h-0.5 bg-rose-400 dark:bg-rose-500 z-10 pointer-events-none shadow-sm"
              style={{ top: currentTimeLine.top }}
            />
          )}
        </div>
      </div>
    </div>
  );
}