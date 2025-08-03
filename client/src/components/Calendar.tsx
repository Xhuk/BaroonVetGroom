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
    queryKey: [`/api/appointments/${currentTenant?.id}`, todayStr],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${currentTenant?.id}?startDate=${todayStr}&endDate=${todayStr}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!currentTenant?.id,
    refetchInterval: 30000,
  });

  // Generate time slots (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

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
      const appointmentDate = new Date(appointment.date);
      const appointmentTime = appointment.startTime;
      
      return (
        appointmentDate.toDateString() === today.toDateString() &&
        appointmentTime === timeSlot
      );
    });
  };

  // Calculate dynamic row height based on appointments
  const getRowHeight = (timeSlot: string) => {
    const slotAppointments = getAppointmentsForSlot(timeSlot);
    const minHeight = 60; // Minimum height for empty slots
    const appointmentHeight = 35; // Height per appointment
    const padding = 10; // Extra padding
    
    if (slotAppointments.length === 0) return minHeight;
    return Math.max(minHeight, slotAppointments.length * appointmentHeight + padding);
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
          </div>
        </div>
      </div>
      
      <div className="w-full">
        <div className="calendar-grid bg-white dark:bg-slate-900 relative w-full" style={{ height: "600px", overflow: "auto" }}>
          {/* Header row */}
          <div className="grid w-full sticky top-0 bg-white dark:bg-slate-900 z-10 border-b-2 border-blue-200 dark:border-slate-600" style={{ gridTemplateColumns: "80px 1fr" }}>
            <div className="bg-blue-50 dark:bg-slate-800 border-r border-blue-200 dark:border-slate-600 h-10 flex items-center justify-center font-medium text-blue-600 dark:text-slate-300">
              Hora
            </div>
            <div className="bg-blue-100 dark:bg-slate-700 text-blue-700 dark:text-slate-200 h-10 flex items-center justify-center font-medium">
              {todayName} {today.getDate()}
            </div>
          </div>

          {/* Time slots and calendar cells */}
          <div className="w-full">
            {timeSlots.map((timeSlot, timeIndex) => {
              const slotAppointments = getAppointmentsForSlot(timeSlot);
              const rowHeight = getRowHeight(timeSlot);
              
              return (
                <div key={timeSlot} className="grid w-full" style={{ gridTemplateColumns: "80px 1fr", minHeight: `${rowHeight}px` }}>
                  {/* Time label */}
                  <div 
                    className="bg-blue-50 dark:bg-slate-800 border-r border-b border-blue-200 dark:border-slate-600 flex items-center justify-center text-xs text-blue-600 dark:text-slate-300 font-medium"
                    style={{ minHeight: `${rowHeight}px` }}
                  >
                    <span className="transform -rotate-0 font-semibold">{timeSlot}</span>
                  </div>
                  
                  {/* Day cell with flexible layout */}
                  <div 
                    className="border-r border-b border-blue-200 dark:border-slate-600 relative cursor-pointer hover:bg-blue-25 dark:hover:bg-slate-800 bg-blue-25 dark:bg-slate-900 w-full p-2"
                    style={{ minHeight: `${rowHeight}px` }}
                  >
                    {slotAppointments.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm">
                        Disponible
                      </div>
                    ) : (
                      <div className="grid gap-2 h-full" style={{ 
                        gridTemplateColumns: slotAppointments.length > 3 ? 'repeat(auto-fit, minmax(200px, 1fr))' : `repeat(${Math.min(slotAppointments.length, 3)}, 1fr)`,
                        alignContent: 'start'
                      }}>
                        {slotAppointments.map((appointment: Appointment, aptIndex: number) => (
                          <div
                            key={appointment.id}
                            className={cn(
                              "rounded text-xs p-2 shadow-sm border min-h-[30px] flex flex-col justify-center",
                              getAppointmentStyle(appointment)
                            )}
                          >
                            <div className="font-bold text-center mb-1">
                              {appointment.type === 'grooming' && 'ESTÉTICA'}
                              {appointment.type === 'medical' && 'CONSULTA'}
                              {appointment.type === 'vaccination' && 'VACUNA'}
                            </div>
                            <div className="text-center text-xs opacity-90">
                              {appointment.roomId ? `Sala ${appointment.roomId.slice(-2)}` : 'Sin sala'}
                            </div>
                            <div className="text-center text-xs font-medium mt-1">
                              Staff: {appointment.staffId?.slice(-2) || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current time line */}
          {currentTimeLine.show && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-rose-400 dark:bg-rose-500 z-10 pointer-events-none shadow-sm"
              style={{ top: currentTimeLine.top }}
            />
          )}
        </div>
      </div>
    </div>
  );
}