import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Clock, MapPin } from "lucide-react";
import { TIMEZONE_OPTIONS, getUserTimezone, saveUserTimezone, getCurrentTimeInUserTimezone } from "@shared/userPreferences";

interface TimezoneSettingsProps {
  onTimezoneChange?: () => void;
}

export function TimezoneSettings({ onTimezoneChange }: TimezoneSettingsProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(getUserTimezone().id);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInUserTimezone());

  const handleTimezoneChange = (timezoneId: string) => {
    setSelectedTimezone(timezoneId);
    saveUserTimezone(timezoneId);
    setCurrentTime(getCurrentTimeInUserTimezone());
    
    // Notify parent component to refresh
    if (onTimezoneChange) {
      onTimezoneChange();
    }
  };

  const selectedTz = TIMEZONE_OPTIONS.find(tz => tz.id === selectedTimezone);

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
          <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Selecciona tu zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.id} value={tz.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{tz.name}</div>
                      <div className="text-xs text-gray-500">{tz.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTz && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Hora Actual</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {currentTime.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
            <div className="text-sm text-blue-700">
              {currentTime.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {selectedTz.daylightSaving 
                ? "⚠️ Incluye horario de verano automático" 
                : "✅ Sin horario de verano (fijo todo el año)"
              }
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          La configuración se guarda automáticamente y afecta a todos los horarios mostrados en la aplicación.
        </div>
      </CardContent>
    </Card>
  );
}