import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";

interface CalendarProps {
  className?: string;
}

export function Calendar({ className }: CalendarProps) {
  const { currentTenant } = useTenant();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate week dates
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      dates.push(day);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeek);
  const startDate = weekDates[0].toISOString().split('T')[0];
  const endDate = weekDates[6].toISOString().split('T')[0];

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/${currentTenant?.id}`, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${currentTenant?.id}?startDate=${startDate}&endDate=${endDate}`, {
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

  const getAppointmentsForSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter((apt: Appointment) => {
      const aptDate = apt.scheduledDate;
      const aptTime = apt.scheduledTime;
      return aptDate === dateStr && aptTime?.substring(0, 5) === timeSlot;
    });
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="p-0">
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="bg-blue-100 text-blue-800 p-4 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Calendario de Citas - Semana del {weekDates[0].getDate()} al {weekDates[6].getDate()} de {monthNames[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
          </h2>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">Vista Semanal</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="calendar-grid bg-white relative" style={{ height: "600px", overflow: "auto" }}>
          {/* Header row */}
          <div className="grid grid-cols-8 sticky top-0 bg-white z-10 border-b-2 border-blue-200">
            <div className="bg-blue-50 border-r border-blue-200 h-10"></div>
            {weekDates.map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={index}
                  className={cn(
                    "border-r border-blue-200 h-10 flex items-center justify-center font-medium",
                    isToday ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-600"
                  )}
                >
                  {dayNames[index]} {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* Time slots and calendar cells */}
          <div className="grid grid-cols-8" style={{ gridTemplateRows: `repeat(${timeSlots.length}, 60px)` }}>
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeSlot} className="contents">
                {/* Time label */}
                <div className="bg-blue-50 border-r border-b border-blue-200 flex items-center justify-center text-xs text-blue-600 font-medium">
                  {timeSlot}
                </div>
                
                {/* Day cells */}
                {weekDates.map((date, dayIndex) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const slotAppointments = getAppointmentsForSlot(date, timeSlot);
                  
                  return (
                    <div
                      key={`${timeIndex}-${dayIndex}`}
                      className={cn(
                        "border-r border-b border-blue-200 relative cursor-pointer hover:bg-blue-25",
                        isToday ? "bg-blue-25" : "bg-white"
                      )}
                    >
                      {slotAppointments.map((appointment: Appointment, aptIndex: number) => (
                        <div
                          key={appointment.id}
                          className={cn(
                            "absolute left-1 right-1 rounded text-xs p-1 overflow-hidden shadow-sm",
                            getAppointmentStyle(appointment)
                          )}
                          style={{
                            top: `${aptIndex * 15 + 2}px`,
                            height: "20px"
                          }}
                        >
                          <div className="font-medium truncate">
                            {appointment.type === 'grooming' && 'Estética'}
                            {appointment.type === 'medical' && 'Consulta'}
                            {appointment.type === 'vaccination' && 'Vacuna'}
                          </div>
                          <div className="text-xs opacity-90 truncate">
                            {appointment.roomId ? `Sala ${appointment.roomId.slice(-2)}` : 'Sin sala'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Current time line */}
          {currentTimeLine.show && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-rose-300 z-10 pointer-events-none shadow-sm"
              style={{ top: currentTimeLine.top }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
