import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
// Removed SimpleSlotBookingDialog - using existing booking page instead
import { cn } from "@/lib/utils";
import type { Appointment } from "@shared/schema";
import { getTodayCST1, addDaysCST1, formatCST1Date, getCurrentTimeCST1 } from "@shared/timeUtils";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  tenantId?: string;
}

export function FastCalendar({ appointments, className, selectedDate, onDateChange, tenantId }: FastCalendarProps) {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(getCurrentTimeCST1());
  const [isScrolling, setIsScrolling] = useState(false);
  const [displayDate, setDisplayDate] = useState(getTodayCST1()); // Always start with today
  
  // Force display date to be correct on load and keep it updated
  useEffect(() => {
    const todayCST1 = getTodayCST1();
    if (displayDate !== todayCST1 && !selectedDate) {
      console.log(`Forcing displayDate from ${displayDate} to ${todayCST1}`);
      setDisplayDate(todayCST1);
    }
  }, [displayDate, selectedDate]);
  // Removed booking dialog state - using navigation instead
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Always prioritize today's date on load, then respect selectedDate changes
  useEffect(() => {
    const todayCST1 = getTodayCST1();
    console.log(`Calendar useEffect: selectedDate=${selectedDate}, displayDate=${displayDate}, todayCST1=${todayCST1}`);
    
    if (selectedDate && selectedDate !== displayDate) {
      console.log(`Setting display date to selectedDate: ${selectedDate}`);
      setDisplayDate(selectedDate);
    } else if (!selectedDate && displayDate !== todayCST1) {
      console.log(`Setting display date to today: ${todayCST1}`);
      setDisplayDate(todayCST1);
    }
  }, [selectedDate, displayDate]);

  // Handle slot click for booking - use wouter for instant navigation
  const handleSlotClick = (time: string) => {
    if (!tenantId) return;
    
    // Use wouter's setLocation for instant SPA navigation (no page reload)
    const bookingUrl = `/booking-wizard?date=${displayDate}&time=${time}`;
    console.log(`Navigating to booking with date: ${displayDate}, time: ${time}`);
    setLocation(bookingUrl);
  };

  // Booking completion handled by booking page navigation

  // Update current time every minute using CST-1 timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeCST1());
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
    const now = getCurrentTimeCST1();
    
    // Extract time from CST-1 ISO string (format: 2025-08-05T21:41:15.700Z)
    const cstTimeStr = now.toISOString();
    const timePart = cstTimeStr.split('T')[1]; // Get "21:41:15.700Z"
    const [hours, minutes] = timePart.split(':').map(Number); // Extract hours and minutes
    
    console.log(`getCurrentTimeSlotInfo: CST-1 time ${cstTimeStr} -> ${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log(`Display date: ${displayDate}, Today: ${getTodayCST1()}`);
    
    // Always show time info during business hours (6 AM - 10 PM)
    if (hours < 6 || hours >= 22) {
      console.log('Current time outside visible hours (6-22)');
      return null;
    }
    
    return { hours, minutes };
  };

  // Determine if an appointment is currently ongoing
  const isOngoing = (appointment: Appointment) => {
    const now = getCurrentTimeCST1();
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
    const now = getCurrentTimeCST1();
    
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
    
    const now = getCurrentTimeCST1();
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
  
  // Calculate precise position of red line based on current time within the slot
  const calculateRedLinePosition = () => {
    if (!currentTimeInfo || displayDate !== getTodayCST1()) {
      console.log('Red line hidden: no currentTimeInfo or not today');
      return { display: 'none' };
    }
    
    const { hours, minutes } = currentTimeInfo;
    // Find which slot the current time falls into
    const currentSlotIndex = visibleTimeSlots.findIndex(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      const slotMinute = parseInt(slot.split(':')[1]);
      return hours === slotHour && minutes >= slotMinute && minutes < slotMinute + 30;
    });
    
    if (currentSlotIndex === -1) {
      return { display: 'none' };
    }
    
    // Calculate exact position within the slot (each slot is 80px high)
    const slotHeight = 80;
    const slotStartTime = parseInt(visibleTimeSlots[currentSlotIndex].split(':')[1]);
    const minutesIntoSlot = minutes - slotStartTime;
    const positionWithinSlot = (minutesIntoSlot / 30) * slotHeight; // 30 minutes per slot
    
    const topPosition = (currentSlotIndex * slotHeight) + positionWithinSlot;
    
    return {
      position: 'absolute' as const,
      top: `${topPosition}px`,
      left: 0,
      right: 0,
      zIndex: 20,
      pointerEvents: 'none' as const
    };
  };
  
  const redLineStyle = calculateRedLinePosition();

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
          
          {/* Time slots container with auto-scroll */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto h-full scroll-smooth relative"
            onScroll={handleScroll}
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            
            {/* Current time indicator - subtle and elegant */}
            {currentTimeInfo && displayDate === getTodayCST1() && (
              <div
                className="absolute z-20 pointer-events-none left-0 right-0"
                style={{ 
                  ...redLineStyle,
                  transform: 'translateY(-50%)',
                }}
              >
                {/* Subtle gradient line */}
                <div 
                  className="w-full h-[1px] opacity-70"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.8) 20%, rgba(239, 68, 68, 0.9) 50%, rgba(239, 68, 68, 0.8) 80%, transparent 100%)',
                    boxShadow: '0 0 3px rgba(239, 68, 68, 0.3)',
                  }}
                />
                {/* Minimal time indicator dots */}
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 w-1.5 h-1.5 bg-red-500/60 rounded-full"></div>
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2 w-1.5 h-1.5 bg-red-500/60 rounded-full"></div>
              </div>
            )}
          

          
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

      {/* Booking handled by navigation to booking page */}
    </Card>
  );
}