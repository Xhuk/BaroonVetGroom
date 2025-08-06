import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Clock, MapPin } from "lucide-react";
import { useTimezone } from "@/contexts/TimezoneContext";
import { TimezoneKey, getCurrentTimeInUserTimezone } from "@shared/timeUtils";

interface TimezoneSettingsProps {
  onTimezoneChange?: () => void;
}

export function TimezoneSettings({ onTimezoneChange }: TimezoneSettingsProps) {
  const { timezone, setTimezone, timezoneConfig, availableTimezones } = useTimezone();
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInUserTimezone());

  const handleTimezoneChange = (timezoneId: string) => {
    const newTimezone = timezoneId as TimezoneKey;
    setTimezone(newTimezone);
    const newTime = getCurrentTimeInUserTimezone(newTimezone);
    console.log(`Timezone changed to ${newTimezone}, new time: ${newTime.toISOString()}`);
    setCurrentTime(newTime);
    
    // Notify parent component to refresh
    if (onTimezoneChange) {
      onTimezoneChange();
    }
  };
  
  // Update time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = getCurrentTimeInUserTimezone(timezone);
      setCurrentTime(newTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuración de Zona Horaria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="timezone" className="text-sm font-medium">
            Zona Horaria
          </Label>
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Selecciona tu zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableTimezones).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{config.displayName}</div>
                      <div className="text-xs text-gray-500">UTC{config.offset >= 0 ? '+' : ''}{config.offset}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800 dark:text-blue-200">Hora Actual</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {currentTime.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {currentTime.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ✅ Zona horaria: {timezoneConfig.displayName}
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          El sistema usa UTC como fuente de verdad y convierte automáticamente a tu zona horaria.
          Esto asegura consistencia entre usuarios en diferentes ubicaciones.
        </div>
      </CardContent>
    </Card>
  );
}