import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Calendar, Phone, Mail, LogOut, Moon, Sun, Settings, Clock, Home } from "lucide-react";
import { VetGroomLogo } from "./VetGroomLogo";
import { DebugControls } from "./DebugControls";
import { TimezoneSettings } from "./TimezoneSettings";
import { getCurrentTimeCST1, getTodayCST1, getCurrentTimeInUserTimezone } from "@shared/timeUtils";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useScreenSize } from "@/hooks/useScreenSize";
import { useState, useEffect } from "react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Header() {
  const { user } = useAuth();
  const { currentTenant, isDebugMode } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const { timezone } = useTimezone();
  const { isTabletLandscape, isSmallTablet } = useScreenSize();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Update time and date display (re-run when timezone changes)
  useEffect(() => {
    const updateTimeAndDate = () => {
      const userTime = getCurrentTimeInUserTimezone(timezone);
      
      // Professional time display (just hours:minutes)
      const hours = userTime.getUTCHours().toString().padStart(2, '0');
      const minutes = userTime.getUTCMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
      
      // Date display
      const displayDate = new Date(userTime.getUTCFullYear(), userTime.getUTCMonth(), userTime.getUTCDate());
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      };
      setCurrentDate(displayDate.toLocaleDateString('es-ES', dateOptions));
      
      // Log timezone change for debugging
      console.log(`Timezone changed to ${timezone}, new time: ${userTime.toISOString()}`);
    };
    
    updateTimeAndDate(); // Initial call
    const timer = setInterval(updateTimeAndDate, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [timezone]); // Re-run when timezone changes

  const { logout } = useAuth();
  
  const handleLogout = () => {
    // Clear debug mode on logout
    sessionStorage.removeItem('selectedTenantId');
    sessionStorage.removeItem('debugMode');
    sessionStorage.removeItem('impersonatedRole');
    // "Cerrar Sesión" should redirect to /auth
    logout('auth');
  };

  const handleGoToLanding = () => {
    // Clear debug mode on logout
    sessionStorage.removeItem('selectedTenantId');
    sessionStorage.removeItem('debugMode');
    sessionStorage.removeItem('impersonatedRole');
    // "Ir a Inicio" should redirect to landing page
    logout('landing');
  };

  // Tablet-specific header layout
  if (isTabletLandscape || isSmallTablet) {
    return (
      <header className="bg-card shadow-sm border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Compact Logo and Title */}
          <div className="flex items-center space-x-2">
            <VetGroomLogo className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-semibold text-primary">VetGroom</h1>
              {!isSmallTablet && (
                <span className="text-xs text-muted-foreground">Gestión Veterinaria</span>
              )}
            </div>
          </div>

          {/* Compact User Info */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{currentTime}</span>
              </div>
              {!isSmallTablet && (
                <div className="text-xs text-muted-foreground">
                  {currentDate.split(',')[0]} {/* Show only day and date, not full date */}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleGoToLanding} title="Ir a Inicio">
                <Home className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Desktop header layout
  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <VetGroomLogo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-semibold text-primary">VetGroom</h1>
              <span className="text-sm text-muted-foreground">Gestión Veterinaria</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center mb-1">
              <Calendar className="inline w-4 h-4 mr-2" />
              {currentDate}
            </div>
            <div className="flex items-center text-primary font-medium">
              <Clock className="inline w-4 h-4 mr-2" />
              {currentTime}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <div className="text-muted-foreground">
              Usuario: <span className="font-medium text-foreground">{user?.email}</span>
            </div>
            <div className="text-muted-foreground">
              Tenant: <span className="font-medium text-primary">{currentTenant?.subdomain}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Debug Controls */}
            <DebugControls />
            
            <button className="text-sm text-primary hover:text-primary/80 font-medium">
              English
            </button>
            <div className="flex space-x-2">
              <Button
                size="sm"
                className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white p-0"
              >
                <Phone className="w-3 h-3" />
              </Button>
              <Button
                size="sm" 
                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white p-0"
              >
                <Mail className="w-3 h-3" />
              </Button>
            </div>

            <Button
              onClick={toggleTheme}
              variant="outline"
              size="sm"
              className="w-8 h-8 rounded-full p-0"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 rounded-full p-0"
                  data-testid="button-timezone-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <TimezoneSettings />
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleGoToLanding}
              variant="outline"
              size="sm"
              className="font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir a Inicio
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
