// BACKUP of FastCalendar.tsx - 2025-08-06 18:11
// Contains working ethereal pulse effect implementation

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
// Removed SimpleSlotBookingDialog - using existing booking page instead
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";
import { getTodayCST1, addDaysCST1, formatCST1Date, getCurrentTimeCST1, getCurrentTimeInUserTimezone, getTodayInUserTimezone, addDaysInUserTimezone } from "@shared/timeUtils";
import { useTimezone } from "@/contexts/TimezoneContext";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  tenantId?: string;

}

export function FastCalendar({ appointments, className, selectedDate, onDateChange, tenantId }: FastCalendarProps) {
  const [, setLocation] = useLocation();
  const { timezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInUserTimezone(timezone));
  const [isScrolling, setIsScrolling] = useState(false);
  const [displayDate, setDisplayDate] = useState(() => {
    // Always start with today in user's timezone
    const today = getTodayInUserTimezone();
    console.log(`FastCalendar initialized with today: ${today}`);
    return today;
  });
  
  // Force display date to be correct on load and keep it updated (using user timezone)
  useEffect(() => {
    const todayUserTZ = getTodayInUserTimezone();
    if (displayDate !== todayUserTZ && !selectedDate) {
      console.log(`Forcing displayDate from ${displayDate} to ${todayUserTZ} (user timezone)`);
      setDisplayDate(todayUserTZ);
    }
  }, [displayDate, selectedDate]);
  
  // Removed booking dialog state - using navigation instead
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync with selectedDate prop when provided
  useEffect(() => {
    if (selectedDate) {
      console.log(`Calendar useEffect: selectedDate=${selectedDate}, displayDate=${displayDate}, todayUserTZ=${getTodayInUserTimezone()}`);
      setDisplayDate(selectedDate);
    }
  }, [selectedDate, displayDate]);

  // Update current time every minute (using user timezone)
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = getCurrentTimeInUserTimezone(timezone);
      setCurrentTime(newTime);
      console.log(`Timezone changed to ${timezone}, new time: ${newTime.toISOString()}`);
    }, 60000);

    return () => clearInterval(interval);
  }, [timezone]);

  // Generate time slots from 6:00 to 22:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  };

  const visibleTimeSlots = generateTimeSlots();

  const getAppointmentsForSlot = (slot: string) => {
    return appointments.filter(appointment => {
      if (!appointment.scheduledDate || !appointment.scheduledTime) return false;
      
      // Normalize the appointment date to compare with displayDate
      const appointmentDate = appointment.scheduledDate.split('T')[0];
      if (appointmentDate !== displayDate) return false;
      
      return appointment.scheduledTime === slot;
    });
  };

  const getAppointmentStyle = (appointment: Appointment) => {
    const baseClasses = "bg-card text-card-foreground";
    
    switch (appointment.status) {
      case 'confirmed':
        return `${baseClasses} border-l-green-500`;
      case 'pending':
        return `${baseClasses} border-l-yellow-500`;
      case 'completed':
        return `${baseClasses} border-l-gray-500`;
      case 'cancelled':
        return `${baseClasses} border-l-red-500`;
      case 'in_progress':
        return `${baseClasses} border-l-blue-500 bg-blue-50 dark:bg-blue-900/20`;
      default:
        return `${baseClasses} border-l-blue-400`;
    }
  };

  const handleSlotClick = (slot: string) => {
    // Navigate to booking page with pre-filled time and date
    setLocation(`/booking?date=${displayDate}&time=${slot}&tenant=${tenantId}`);
  };

  // Get current time slot info for red line positioning
  const getCurrentTimeSlotInfo = () => {
    const now = getCurrentTimeInUserTimezone(timezone);
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    
    console.log(`getCurrentTimeSlotInfo: User timezone time -> ${hours}:${minutes.toString().padStart(2, '0')}`);
    
    // Only show during business hours (6 AM to 10 PM)
    if (hours < 6 || hours >= 22) {
      return null;
    }
    
    return {
      hours,
      minutes,
      timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
  };

  // Check if an appointment is currently ongoing
  const isOngoing = (appointment: Appointment) => {
    if (appointment.status !== 'in_progress') return false;
    
    const now = getCurrentTimeInUserTimezone(timezone);
    const appointmentTime = appointment.scheduledTime;
    if (!appointmentTime) return false;
    
    const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
    const appointmentStart = new Date(now);
    appointmentStart.setUTCHours(appointmentHour, appointmentMinute, 0, 0);
    
    const duration = appointment.duration || 30; // Use appointment duration or default 30 minutes
    const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000);
    
    return now >= appointmentStart && now < appointmentEnd;
  };

  const isTimeMarkerInOccupiedSlot = () => {
    const now = getCurrentTimeInUserTimezone(timezone);
    
    // Check all appointments to see if current time falls within an in-progress appointment
    const currentlyActiveAppointments = appointments.filter(appointment => {
      if (appointment.status !== 'in_progress') return false;
      
      // Check if current time is within this appointment's scheduled time
      const appointmentTime = appointment.scheduledTime;
      if (!appointmentTime) return false;
      
      const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
      const appointmentStart = new Date(now);
      appointmentStart.setUTCHours(appointmentHour, appointmentMinute, 0, 0);
      
      const duration = appointment.duration || 30; // Use appointment duration or default 30 minutes
      const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000);
      
      return now >= appointmentStart && now < appointmentEnd;
    });
    
    console.log(`Current time ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}: ${currentlyActiveAppointments.length} currently active appointments found`);
    
    return currentlyActiveAppointments.length > 0;
  };

  // Auto-scroll to current time after 10 seconds of inactivity (reduced from 30s)
  const handleScroll = () => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      scrollToCurrentTime();
    }, 10000); // Reduced to 10 seconds for faster timezone adjustments
  };

  const scrollToCurrentTime = () => {
    if (!scrollContainerRef.current) return;
    
    const now = getCurrentTimeInUserTimezone(timezone);
    const hours = now.getUTCHours();
    
    if (hours < 6 || hours >= 22) return;
    
    // Find current time slot in visible slots and scroll to center it at 50%
    const currentSlotIndex = visibleTimeSlots.findIndex(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      const slotMinute = parseInt(slot.split(':')[1]);
      return hours === slotHour && now.getUTCMinutes() >= slotMinute && now.getUTCMinutes() < slotMinute + 30;
    });
    
    if (currentSlotIndex !== -1) {
      const slotHeight = 80; // Each slot is 80px
      const containerHeight = scrollContainerRef.current.clientHeight;
      
      // Position current slot at exact 50% of card container height
      const slotTopPosition = currentSlotIndex * slotHeight;
      const scrollPosition = slotTopPosition - (containerHeight / 2) + (slotHeight / 2);
      
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
      
      console.log(`Auto-scrolled to position current time slot at 50% of card container height`);
    }
  };

  // Initial scroll to current time and periodic updates (instant timezone response)
  useEffect(() => {
    // Immediate scroll when timezone changes (no delay)
    const immediateTimer = setTimeout(() => {
      scrollToCurrentTime();
    }, 100); // Minimal delay for DOM readiness
    
    // Also scroll to current time every minute to keep marker visible
    const intervalTimer = setInterval(() => {
      if (!isScrolling) {
        scrollToCurrentTime();
      }
    }, 60000); // Every minute
    
    return () => {
      clearTimeout(immediateTimer);
      clearInterval(intervalTimer);
    };
  }, [currentTime, isScrolling, timezone]); // Added timezone dependency for instant updates

  // Navigation functions - using user timezone
  const handlePreviousDay = () => {
    const newDate = addDaysInUserTimezone(displayDate, -1);
    setDisplayDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    const newDate = addDaysInUserTimezone(displayDate, 1);
    setDisplayDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const goToToday = () => {
    const today = getTodayInUserTimezone();
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
  
  // Check if current time slot is empty for ethereal pulse effect
  const getCurrentTimeSlotAppointments = () => {
    if (!currentTimeInfo || displayDate !== getTodayInUserTimezone()) {
      return [];
    }
    
    const now = getCurrentTimeInUserTimezone(timezone);
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    // Find appointments in the current time slot (30-minute intervals)
    const slotStart = Math.floor(currentMinute / 30) * 30;
    const currentSlot = `${String(currentHour).padStart(2, '0')}:${String(slotStart).padStart(2, '0')}`;
    
    return appointments.filter(appointment => {
      if (!appointment.scheduledDate || !appointment.scheduledTime) return false;
      
      const appointmentDate = appointment.scheduledDate.split('T')[0];
      if (appointmentDate !== displayDate) return false;
      
      const appointmentTime = appointment.scheduledTime;
      return appointmentTime === currentSlot;
    });
  };
  
  const currentSlotAppointments = getCurrentTimeSlotAppointments();
  const isCurrentSlotEmpty = currentSlotAppointments.length === 0;
  
  // Red line is fixed at 50% of card container - always visible
  const getRedLineStyle = () => {
    if (!currentTimeInfo || displayDate !== getTodayInUserTimezone()) {
      return { display: 'none' };
    }
    
    return {
      position: 'absolute' as const,
      top: '50%',
      left: 0,
      right: 0,
      zIndex: 20,
      pointerEvents: 'none' as const,
      transform: 'translateY(-50%)'
    };
  };
  
  const redLineStyle = getRedLineStyle();

  return (
    <Card className={cn("fixed flex flex-col", className)} style={{ top: '140px', bottom: 'calc(10px + 96px)', right: '24px', left: '298px', marginLeft: '0px' }}>
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handlePreviousDay}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg shadow hover:bg-accent transition duration-300 text-sm"
          >
            ← Día Anterior
          </button>
          <h2 className="text-xl font-semibold text-foreground flex-1 text-center mx-2">
            {formatCST1Date(displayDate)} - {getAppointmentCount()} citas
          </h2>
          <div className="flex gap-2">
            {displayDate !== getTodayInUserTimezone() && (
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90 transition duration-300 text-sm"
              >
                Hoy
              </button>
            )}
            <button
              onClick={handleNextDay}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg shadow hover:bg-accent transition duration-300 text-sm"
            >
              Día Siguiente →
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-6">
        <div className="relative h-full overflow-hidden">
          
          {/* Fixed red line at 50% of card container */}
          {currentTimeInfo && displayDate === getTodayInUserTimezone() && (
            <div
              className="absolute z-20 pointer-events-none left-0 right-0"
              style={redLineStyle}
            >
              {/* Ethereal pulse red line fixed at center - always animated */}
              <div 
                className="w-full ethereal-pulse-line h-[3px] opacity-80"
              />
              {/* Time indicator dots at center */}
              <div className="absolute top-1/2 left-2 transform -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
            </div>
          )}
          
          {/* Time slots container with auto-scroll */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto h-full scroll-smooth relative"
            onScroll={handleScroll}
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
          

          
          {visibleTimeSlots.map((slot, index) => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getUTCHours() === parseInt(slot.split(':')[0]) &&
                                  currentTime.getUTCMinutes() >= parseInt(slot.split(':')[1]) &&
                                  currentTime.getUTCMinutes() < parseInt(slot.split(':')[1]) + 30;
            
            const isFirstSlot = index === 0;
            const isLastSlot = index === visibleTimeSlots.length - 1;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-center border-b border-border last:border-b-0 relative",
                  "h-[80px]" // Bigger container height for all slots to end at same pixel
                )}
              >

                
                {/* Time label */}
                <div className="w-20 text-right pr-4 text-sm text-muted-foreground font-medium z-10 relative">
                  {slot}
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
                              <p className="font-semibold text-sm text-card-foreground">
                                Cliente - {appointment.type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Mascota #{appointment.petId}
                                {isOngoing(appointment) && <span className="ml-2 text-red-600 font-bold">🔴 EN CURSO</span>}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            appointment.status === 'confirmed' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                            appointment.status === 'pending' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                            appointment.status === 'scheduled' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {appointment.status || 'Programada'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <button
                      onClick={() => handleSlotClick(slot)}
                      className="text-muted-foreground text-sm italic hover:text-primary hover:bg-muted/50 p-2 rounded transition-colors w-full text-left"
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

      {/* Booking handled by navigation to booking page */}
    </Card>
  );
}