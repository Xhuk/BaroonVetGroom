import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SimpleSlotBookingDialog } from "./SimpleSlotBookingDialog";
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";
import { getCurrentTimeInUserTimezone } from "@shared/userPreferences";
import { getTodayCST1, addDaysCST1, formatCST1Date } from "@shared/timeUtils";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  tenantId?: string;
}

export function FastCalendar({ appointments, className, selectedDate, onDateChange, tenantId }: FastCalendarProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInUserTimezone());
  const [isScrolling, setIsScrolling] = useState(false);
  const [displayDate, setDisplayDate] = useState(selectedDate || getTodayCST1());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Update displayDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setDisplayDate(selectedDate);
    }
  }, [selectedDate]);

  // Handle slot click for booking
  const handleSlotClick = (time: string) => {
    if (!tenantId) return;
    
    setSelectedSlot({
      date: displayDate,
      time: time
    });
    setShowBookingDialog(true);
  };

  // Handle booking completion
  const handleBookingComplete = () => {
    setShowBookingDialog(false);
    setSelectedSlot(null);
    // Trigger parent refresh to update appointment data
    if (onDateChange) {
      onDateChange(displayDate);
    }
  };

  // Update current time every minute using user's timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeInUserTimezone());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get display day (could be different from today)
  const todayStr = displayDate;

  // Generate 30-minute time slots for the entire day
  const generateTimeSlots = () => {
    // Generate full day time slots (24 hours) for comprehensive coverage
    const allSlots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = String(h).padStart(2, '0');
        const minute = String(m).padStart(2, '0');
        allSlots.push(`${hour}:${minute}`);
      }
    }
    
    // Filter to clinic hours for display (6 AM to 10 PM)
    const visibleSlots = allSlots.filter(slot => {
      const hour = parseInt(slot.split(':')[0]);
      return hour >= 6 && hour < 22;
    });
    
    return { allSlots, visibleSlots };
  };

  const { allSlots: timeSlots, visibleSlots: visibleTimeSlots } = generateTimeSlots();

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

  // Fixed marker doesn't need position calculation - it's always centered
  const getCurrentTimeSlotInfo = () => {
    const now = getCurrentTimeInUserTimezone();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    console.log(`Current time: ${hours}:${minutes.toString().padStart(2, '0')}`);
    
    // Return null if outside visible hours (6 AM - 10 PM)
    if (hours < 6 || hours >= 22) {
      console.log('Current time outside visible hours');
      return null;
    }
    
    return { hours, minutes };
  };

  // Determine if an appointment is currently ongoing
  const isOngoing = (appointment: Appointment) => {
    const now = getCurrentTimeInUserTimezone();
    const appointmentTime = appointment.scheduledTime; // Using correct property name from schema
    if (!appointmentTime) return false;
    
    // Create date objects for comparison
    const todayStr = now.toISOString().split('T')[0];
    const appStart = new Date(`${todayStr}T${appointmentTime}`);
    const duration = appointment.duration || 60; // Use appointment duration or default 60 minutes
    const appEnd = new Date(appStart.getTime() + duration * 60 * 1000);
    
    return now >= appStart && now < appEnd;
  };

  const isTimeMarkerInOccupiedSlot = () => {
    const now = getCurrentTimeInUserTimezone();
    
    // Check all appointments to see if current time falls within an in-progress appointment
    const currentlyActiveAppointments = appointments.filter(appointment => {
      if (appointment.status !== 'in_progress') return false;
      
      // Check if current time is within this appointment's scheduled time
      const appointmentTime = appointment.scheduledTime;
      if (!appointmentTime) return false;
      
      const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
      const appointmentStart = new Date(now);
      appointmentStart.setHours(appointmentHour, appointmentMinute, 0, 0);
      
      const duration = appointment.duration || 30; // Use appointment duration or default 30 minutes
      const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000);
      
      return now >= appointmentStart && now < appointmentEnd;
    });
    
    console.log(`Current time ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}: ${currentlyActiveAppointments.length} currently active appointments found`);
    
    return currentlyActiveAppointments.length > 0;
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
    
    // Find current time slot in visible slots and scroll to it
    const currentSlotIndex = visibleTimeSlots.findIndex(slot => {
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
      
      console.log(`Auto-scrolled to current time slot at index ${currentSlotIndex}, position ${scrollPosition}px`);
    }
  };

  // Initial scroll to current time and periodic updates
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentTime();
    }, 500); // Small delay to ensure DOM is ready
    
    // Also scroll to current time every minute to keep marker visible
    const intervalTimer = setInterval(() => {
      if (!isScrolling) {
        scrollToCurrentTime();
      }
    }, 60000); // Every minute
    
    return () => {
      clearTimeout(timer);
      clearInterval(intervalTimer);
    };
  }, [currentTime, isScrolling]);

  // Navigation functions
  const handlePreviousDay = () => {
    const newDate = addDaysCST1(displayDate, -1);
    setDisplayDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    const newDate = addDaysCST1(displayDate, 1);
    setDisplayDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const goToToday = () => {
    const today = getTodayCST1();
    setDisplayDate(today);
    if (onDateChange) {
      onDateChange(today);
    }
  };

  const getAppointmentCount = () => {
    return appointments.filter(appointment => {
      const appointmentDate = appointment.scheduledDate;
      if (!appointmentDate) return false;
      const normalizedDate = appointmentDate.split('T')[0];
      return normalizedDate === displayDate;
    }).length;
  };

  const currentTimeInfo = getCurrentTimeSlotInfo();
  const isMarkerInOccupiedSlot = isTimeMarkerInOccupiedSlot();

  return (
    <Card className={cn("fixed flex flex-col", className)} style={{ top: '140px', bottom: 'calc(10px + 96px)', right: '24px', left: '298px', marginLeft: '0px' }}>
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handlePreviousDay}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition duration-300 text-sm"
          >
            ← Día Anterior
          </button>
          <h2 className="text-xl font-semibold text-gray-800 flex-1 text-center mx-2">
            {formatCST1Date(displayDate)} - {getAppointmentCount()} citas
          </h2>
          <div className="flex gap-2">
            {displayDate !== getTodayCST1() && (
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-blue-200 text-blue-800 rounded-lg shadow hover:bg-blue-300 transition duration-300 text-sm"
              >
                Hoy
              </button>
            )}
            <button
              onClick={handleNextDay}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition duration-300 text-sm"
            >
              Día Siguiente →
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-6">
        <div className="relative h-full overflow-hidden">
          
          {/* Current time indicator - always visible when in visible hours */}
          {currentTimeInfo && displayDate === getTodayCST1() && (
            <div
              className={cn(
                "absolute z-10 pointer-events-none transition-all duration-700 ease-in-out left-0 right-0",
                isMarkerInOccupiedSlot ? "bg-red-500/15" : "bg-red-500/8"
              )}
              style={{ 
                top: '50%',
                transform: 'translateY(-50%)',
                height: isMarkerInOccupiedSlot ? '60px' : '40px',
                borderRadius: '6px',
                background: isMarkerInOccupiedSlot 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.08) 50%, rgba(239, 68, 68, 0.12) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.04) 50%, rgba(239, 68, 68, 0.06) 100%)',
                boxShadow: isMarkerInOccupiedSlot 
                  ? 'inset 0 0 20px rgba(239, 68, 68, 0.1), 0 0 10px rgba(239, 68, 68, 0.05)'
                  : 'inset 0 0 10px rgba(239, 68, 68, 0.05), 0 0 5px rgba(239, 68, 68, 0.03)',
                animation: isMarkerInOccupiedSlot ? 'time-container-glow 3s ease-in-out infinite' : 'none',
              }}
            >
              {/* Time indicator line - always visible */}
              <div
                className={cn(
                  "absolute top-1/2 transform -translate-y-1/2 left-0 right-0 transition-all duration-700 ease-in-out",
                  isMarkerInOccupiedSlot ? "h-[2px] bg-red-500/60" : "h-[1px] bg-red-500/50"
                )}
                style={{
                  borderRadius: '1px',
                  boxShadow: isMarkerInOccupiedSlot 
                    ? '0 0 4px rgba(239, 68, 68, 0.3)'
                    : '0 0 2px rgba(239, 68, 68, 0.2)'
                }}
              />
              
              {/* Current time indicators */}
              <div className={cn(
                "absolute top-1/2 left-2 transform -translate-y-1/2 bg-red-600 rounded-full shadow-sm transition-all duration-700 ease-in-out",
                isMarkerInOccupiedSlot ? "w-2 h-2" : "w-1.5 h-1.5"
              )}></div>
              <div className={cn(
                "absolute top-1/2 right-2 transform -translate-y-1/2 bg-red-600 rounded-full shadow-sm",
                isMarkerInOccupiedSlot ? "w-2 h-2 animate-pulse" : "w-1.5 h-1.5"
              )}></div>
            </div>
          )}
          
          {/* Time slots container with auto-scroll */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto h-full scroll-smooth"
            onScroll={handleScroll}
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
          
          {visibleTimeSlots.map((slot, index) => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getHours() === parseInt(slot.split(':')[0]) &&
                                  currentTime.getMinutes() >= parseInt(slot.split(':')[1]) &&
                                  currentTime.getMinutes() < parseInt(slot.split(':')[1]) + 30;
            
            const isFirstSlot = index === 0;
            const isLastSlot = index === visibleTimeSlots.length - 1;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-center border-b border-gray-100 last:border-b-0 relative",
                  "h-[80px]" // Bigger container height for all slots to end at same pixel
                )}
              >

                
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
                                {isOngoing(appointment) && <span className="ml-2 text-red-600 font-bold">🔴 EN CURSO</span>}
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
                    <button
                      onClick={() => handleSlotClick(slot)}
                      className="text-gray-400 text-sm italic hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors w-full text-left"
                      data-testid={`button-book-slot-${slot.replace(':', '-')}`}
                    >
                      Libre - Click para reservar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </CardContent>

      {/* Simple Slot Booking Dialog */}
      {selectedSlot && tenantId && (
        <SimpleSlotBookingDialog
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          tenantId={tenantId}
          selectedDate={selectedSlot.date}
          selectedTime={selectedSlot.time}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </Card>
  );
}