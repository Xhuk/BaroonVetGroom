import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentTimeCST1 } from '@shared/timeUtils';

interface CalendarTimeIndicatorProps {
  appointments?: Array<{
    id: string;
    scheduledTime: string;
    scheduledDate: string;
  }>;
  selectedDate: string;
  onRefresh: () => void;
}

export function CalendarTimeIndicator({ appointments = [], selectedDate, onRefresh }: CalendarTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentTimeCST1());
  
  // Update time every minute using math, no API calls
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date(currentTime.getTime() + 60000)); // Add 1 minute
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentTime]);

  // Manual refresh - updates to real current time
  const handleRefresh = () => {
    setCurrentTime(getCurrentTimeCST1());
    onRefresh();
  };

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  // Check if selected date is today
  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;
  
  // Calculate position for time marker (24-hour day)
  const markerPosition = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calendario de Hoy</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>
      
      {isToday && (
        <div className="relative mb-4">
          {/* Time scale background */}
          <div className="h-8 bg-gray-100 rounded relative">
            {/* Hour markers */}
            {Array.from({ length: 25 }, (_, i) => (
              <div 
                key={i}
                className="absolute top-0 h-full border-l border-gray-300"
                style={{ left: `${(i / 24) * 100}%` }}
              >
                <span className="absolute -top-6 text-xs text-gray-500 -translate-x-1/2">
                  {String(i).padStart(2, '0')}
                </span>
              </div>
            ))}
            
            {/* Current time marker - centered */}
            <div 
              className="absolute top-0 h-full w-1 bg-red-500 rounded transform -translate-x-1/2"
              style={{ left: `${markerPosition}%` }}
            >
              <div className="absolute -top-8 bg-red-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap transform -translate-x-1/2">
                {currentTimeString}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Appointment alignment */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {appointments
          .filter(apt => apt.scheduledDate === selectedDate)
          .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
          .map(appointment => {
            const aptTime = appointment.scheduledTime;
            const isCurrentHour = isToday && aptTime.split(':')[0] === String(currentHour).padStart(2, '0');
            
            return (
              <div 
                key={appointment.id}
                className={`p-2 rounded text-sm border-l-4 ${
                  isCurrentHour 
                    ? 'border-l-red-500 bg-red-50 font-semibold' 
                    : 'border-l-blue-400 bg-gray-50'
                }`}
              >
                <span className="font-mono">{aptTime}</span> - Cita programada
              </div>
            );
          })}
        
        {appointments.filter(apt => apt.scheduledDate === selectedDate).length === 0 && (
          <p className="text-gray-500 text-sm">No hay citas programadas para esta fecha</p>
        )}
      </div>
    </div>
  );
}