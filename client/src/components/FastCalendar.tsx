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
import { useScreenSize } from "@/hooks/useScreenSize";
import { Phone, CalendarIcon } from "lucide-react";

interface FastCalendarProps {
  appointments: Appointment[];
  className?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  tenantId?: string;
  showActionButtons?: boolean;
}

export function FastCalendar({ appointments, className, selectedDate, onDateChange, tenantId, showActionButtons = false }: FastCalendarProps) {
  const [, setLocation] = useLocation();
  const { timezone } = useTimezone();
  const { isTabletLandscape } = useScreenSize();
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

  // Enforce today's date when no selectedDate is provided
  useEffect(() => {
    const todayUserTZ = getTodayInUserTimezone();
    console.log(`Calendar useEffect: selectedDate=${selectedDate}, displayDate=${displayDate}, todayUserTZ=${todayUserTZ}`);
    
    if (!selectedDate) {
      // No selectedDate means we should show today
      if (displayDate !== todayUserTZ) {
        console.log(`No selectedDate - enforcing today: ${todayUserTZ}`);
        setDisplayDate(todayUserTZ);
        if (onDateChange) {
          onDateChange(todayUserTZ);
        }
      }
    } else if (selectedDate !== displayDate) {
      // selectedDate provided, use it
      console.log(`Setting display date to selectedDate: ${selectedDate}`);
      setDisplayDate(selectedDate);
    }
  }, [selectedDate, displayDate, onDateChange]);

  // Handle slot click for booking - use wouter for instant navigation
  const handleSlotClick = (time: string) => {
    if (!tenantId) return;
    
    // Use wouter's setLocation for instant SPA navigation (no page reload)
    const bookingUrl = `/booking-wizard?date=${displayDate}&time=${time}`;
    console.log(`Navigating to booking with date: ${displayDate}, time: ${time}`);
    setLocation(bookingUrl);
  };

  // Booking completion handled by booking page navigation

  // Update current time every minute and immediately when timezone changes
  useEffect(() => {
    // Immediate update when timezone changes
    setCurrentTime(getCurrentTimeInUserTimezone(timezone));
    
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeInUserTimezone(timezone));
    }, 60000);
    return () => clearInterval(timer);
  }, [timezone]);

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
      const hour = parseInt((slot || '0:0').split(':')[0]);
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

      const normalizedAppointmentDate = (appointmentDate || '').split('T')[0];
      const appointmentTimeStr = typeof appointmentTime === 'string' 
        ? appointmentTime.substring(0, 5) 
        : appointmentTime;

      return normalizedAppointmentDate === todayStr && appointmentTimeStr === timeSlot;
    });
  };

  // Get current time slot info using user's timezone (same as header clock)
  const getCurrentTimeSlotInfo = () => {
    const now = getCurrentTimeInUserTimezone(timezone);
    
    // Extract hours and minutes from user timezone (same as header)
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    
    console.log(`getCurrentTimeSlotInfo: User timezone time -> ${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log(`Display date: ${displayDate}, Today: ${getTodayInUserTimezone()}`);
    
    // Always show time info during business hours (6 AM - 10 PM)
    if (hours < 6 || hours >= 22) {
      console.log('Current time outside visible hours (6-22)');
      return null;
    }
    
    return { hours, minutes };
  };

  // Determine if an appointment is currently ongoing
  const isOngoing = (appointment: Appointment) => {
    const now = getCurrentTimeInUserTimezone(timezone);
    const appointmentTime = appointment.scheduledTime; // Using correct property name from schema
    if (!appointmentTime) return false;
    
    // Create date objects for comparison using user timezone
    const todayStr = getTodayInUserTimezone();
    const appStart = new Date(`${todayStr}T${appointmentTime}`);
    const duration = appointment.duration || 60; // Use appointment duration or default 60 minutes
    const appEnd = new Date(appStart.getTime() + duration * 60 * 1000);
    
    return now >= appStart && now < appEnd;
  };

  const isTimeMarkerInOccupiedSlot = () => {
    const now = getCurrentTimeInUserTimezone(timezone);
    
    // Check all appointments to see if current time falls within an in-progress appointment
    const currentlyActiveAppointments = appointments.filter(appointment => {
      if (appointment.status !== 'in_progress') return false;
      
      // Check if current time is within this appointment's scheduled time
      const appointmentTime = appointment.scheduledTime;
      if (!appointmentTime) return false;
      
      const [appointmentHour, appointmentMinute] = (appointmentTime || '0:0').split(':').map(Number);
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
      const slotHour = parseInt((slot || '0:0').split(':')[0]);
      const slotMinute = parseInt((slot || '0:0').split(':')[1]);
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
      const normalizedDate = (appointmentDate || '').split('T')[0];
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
      
      const appointmentDate = (appointment.scheduledDate || '').split('T')[0];
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

  // Calendar positioning - restore backup configuration with tablet landscape support
  const getCalendarStyle = () => {
    if (isTabletLandscape) {
      return {
        top: '70px', // Compact tablet header
        bottom: 'calc(10px + 96px)', // Account for ribbon navigation 
        right: '12px', 
        left: '12px', // Full width for tablet
        marginLeft: '0px'
      };
    }
    // Desktop positioning - exact backup configuration
    return {
      position: 'fixed' as const,
      top: '140px', // Action buttons at 95px, calendar at 140px
      bottom: 'calc(100vh - 10px - 96px)', // Stats ribbon height
      right: '24px',
      left: '298px', // Navigation width 288px + 10px margin
      marginLeft: '0px',
      zIndex: 1 // Ensure visibility
    };
  };

  const calendarStyle = getCalendarStyle();
  
  return (
    <Card 
      className={cn(
        "flex flex-col shadow-lg tablet-card",
        !isTabletLandscape && "fixed", // Only fixed position on desktop
        className
      )} 
      style={calendarStyle}
    >
      <CardHeader className="flex-shrink-0">
        {/* Navigation Controls - Hide date in tablet landscape, show in desktop/portrait */}
        {!isTabletLandscape && (
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
        )}
        
        {/* Action Buttons - Only show in tablet landscape mode */}
        {showActionButtons && isTabletLandscape && (
          <div className="flex justify-center gap-3 mt-3 mb-2">
            <a
              href="/booking"
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors text-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Nueva Cita por Teléfono
            </a>
            <a
              href="/appointments"
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors text-sm"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Gestionar Citas
            </a>
          </div>
        )}
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
            style={{ 
              maxHeight: isTabletLandscape ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)' 
            }}
          >
          

          
          {visibleTimeSlots.map((slot, index) => {
            const slotAppointments = getAppointmentsForSlot(slot);
            const isCurrentSlot = currentTime.getUTCHours() === parseInt((slot || '0:0').split(':')[0]) &&
                                  currentTime.getUTCMinutes() >= parseInt((slot || '0:0').split(':')[1]) &&
                                  currentTime.getUTCMinutes() < parseInt((slot || '0:0').split(':')[1]) + 30;
            
            const isFirstSlot = index === 0;
            const isLastSlot = index === visibleTimeSlots.length - 1;

            return (
              <div 
                key={slot} 
                className={cn(
                  "flex items-center border-b border-border last:border-b-0 relative",
                  isTabletLandscape ? "h-[60px]" : "h-[80px]" // Reduced height for tablet to show more slots
                )}
              >

                
                {/* Time label - Compact for tablet */}
                <div className={cn(
                  "text-center text-muted-foreground font-medium z-10 relative border-r border-border mr-4",
                  isTabletLandscape ? "w-12 text-xs" : "w-16 text-sm"
                )}>
                  {slot}
                </div>
                
                {/* Appointment content - Properly aligned */}
                <div className="flex-1 z-10 relative">
                  {slotAppointments.length > 0 ? (
                    slotAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        className={cn(
                          "rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow mx-1",
                          isTabletLandscape ? "p-1 mb-1 text-xs" : "p-2 mb-1", // Compact padding for tablet
                          getAppointmentStyle(appointment)
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="mr-3 text-xl">
                              {appointment.type === 'grooming' ? '🐾' : '🩺'}
                            </span>
                            <div>
                              <p className={cn(
                                "font-semibold text-card-foreground",
                                isTabletLandscape ? "text-xs" : "text-sm"
                              )}>
                                Cliente - {appointment.type}
                              </p>
                              <p className={cn(
                                "text-muted-foreground",
                                isTabletLandscape ? "text-[10px]" : "text-xs"
                              )}>
                                Mascota #{appointment.petId}
                                {isOngoing(appointment) && <span className="ml-1 text-red-600 font-bold text-[10px]">🔴 EN CURSO</span>}
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
                      className={cn(
                        "text-muted-foreground italic hover:text-primary hover:bg-muted/50 rounded transition-colors w-full text-left",
                        isTabletLandscape ? "text-xs p-1" : "text-sm p-2"
                      )}
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