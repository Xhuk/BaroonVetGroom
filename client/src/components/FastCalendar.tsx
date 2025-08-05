import { useState, useEffect, useRef } from "react";
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
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

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
    const slotHeight = 80; // Each 30-minute slot is now 80px tall
    const position = (totalMinutes / 30) * slotHeight; // Position in pixels
    
    return position;
  };

  // Auto-scroll to current time after 30 seconds of inactivity
  const handleScroll = () => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      scrollToCurrentTime();
    }, 30000); // 30 seconds
  };

  const scrollToCurrentTime = () => {
    if (!scrollContainerRef.current) return;
    
    const now = getCurrentTimeInUserTimezone();
    const hours = now.getHours();
    
    if (hours < 6 || hours >= 22) return;
    
    // Find current time slot and scroll to it
    const currentSlotIndex = timeSlots.findIndex(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      const slotMinute = parseInt(slot.split(':')[1]);
      return hours === slotHour && now.getMinutes() >= slotMinute && now.getMinutes() < slotMinute + 30;
    });
    
    if (currentSlotIndex !== -1) {
      const slotHeight = 80; // Each slot is now 80px
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollPosition = (currentSlotIndex * slotHeight) - (containerHeight / 2) + (slotHeight / 2);
      
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  };

  // Initial scroll to current time
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentTime();
    }, 500); // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timer);
  }, [currentTime]);

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
        <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 220px - 96px - 32px)' }}>

          
          {/* Time slots container with auto-scroll */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto h-full scroll-smooth"
            onScroll={handleScroll}
          >
          
          {timeSlots.map((slot, index) => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getHours() === parseInt(slot.split(':')[0]) &&
                                  currentTime.getMinutes() >= parseInt(slot.split(':')[1]) &&
                                  currentTime.getMinutes() < parseInt(slot.split(':')[1]) + 30;
            
            const isFirstSlot = index === 0;
            const isLastSlot = index === timeSlots.length - 1;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-center border-b border-gray-100 last:border-b-0 relative",
                  "h-[80px]" // Bigger container height for all slots to end at same pixel
                )}
              >
                {/* Current time slot indicator - positioned in the middle */}
                {isCurrentSlot && (
                  <div className={cn(
                    "absolute left-0 right-0 bg-red-100 border border-red-300 rounded-md transition-all duration-300",
                    // Position in middle for normal slots
                    !isFirstSlot && !isLastSlot && "top-1/2 transform -translate-y-1/2 h-[50px]",
                    // Show only bottom half for first slot
                    isFirstSlot && "top-1/2 h-[40px]",
                    // Show only top half for last slot  
                    isLastSlot && "bottom-1/2 h-[40px]"
                  )}
                />)}
                
                {/* Time label */}
                <div className="w-20 text-right pr-4 text-sm text-gray-500 font-medium z-10 relative">
                  {new Date(`2000-01-01T${slot}`).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: true 
                  })}
                </div>
                
                {/* Appointment content */}
                <div className="flex-1 pl-4 z-10 relative">
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