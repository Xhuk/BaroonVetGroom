import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Calendar, Phone, Mail, LogOut, Moon, Sun, Bug, Eye } from "lucide-react";
import { VetGroomLogo } from "./VetGroomLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function Header() {
  const { user } = useAuth();
  const { currentTenant, isDebugMode, showDebugSelector } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const { canDebugTenants } = useAccessControl();
  const [viewAsRole, setViewAsRole] = useState<string>("");

  // Load current role from sessionStorage on mount
  useEffect(() => {
    const storedRole = sessionStorage.getItem('impersonatedRole');
    if (storedRole) {
      setViewAsRole(storedRole);
    }
  }, []);

  // Save role impersonation to sessionStorage when changed
  const handleRoleChange = (role: string) => {
    setViewAsRole(role);
    if (role) {
      sessionStorage.setItem('impersonatedRole', role);
    } else {
      sessionStorage.removeItem('impersonatedRole');
    }
    
    // Reload page to apply new permissions
    window.location.reload();
  };

  // Define available roles for impersonation
  const availableRoles = [
    { value: "system_admin", label: "Administrador Sistema" },
    { value: "company_admin", label: "Administrador Empresa" },
    { value: "tenant_admin", label: "Administrador Tenant" },
    { value: "veterinario", label: "Veterinario" },
    { value: "asistente", label: "Asistente" },
    { value: "recepcionista", label: "Recepcionista" },
    { value: "groomer", label: "Groomer" },
    { value: "delivery_driver", label: "Conductor Delivery" },
    { value: "viewer", label: "Solo Lectura" }
  ];
  
  // Check if user has debug access
  const isDebugUser = user?.email?.includes('dongadgetoshop') || user?.email?.includes('vetgroom') || canDebugTenants;

  const currentDate = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  };
  const formattedDate = currentDate.toLocaleDateString('es-ES', dateOptions);

  const handleLogout = () => {
    // Clear debug mode on logout
    sessionStorage.removeItem('selectedTenantId');
    sessionStorage.removeItem('debugMode');
    window.location.href = "/api/logout";
  };

  const activateDebugMode = () => {
    sessionStorage.setItem('debugMode', 'true');
    sessionStorage.removeItem('selectedTenantId');
    window.location.reload();
  };

  return (
    <header className={`bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-700 px-6 py-4 ${isDebugMode ? 'mt-14' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <VetGroomLogo className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-semibold text-blue-600 dark:text-blue-400">VetGroom</h1>
              <span className="text-sm text-gray-500 dark:text-slate-400">Gestión Veterinaria</span>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            <Calendar className="inline w-4 h-4 mr-2" />
            {formattedDate}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <div className="text-gray-600 dark:text-slate-300">
              Usuario: <span className="font-medium text-gray-900 dark:text-slate-100">{user?.email}</span>
            </div>
            <div className="text-gray-600 dark:text-slate-300">
              Tenant: <span className="font-medium text-blue-600 dark:text-blue-400">{currentTenant?.subdomain}</span>
            </div>
          </div>

          {/* View As Role Selector - Debug Mode Only */}
          {canDebugTenants && isDebugMode && currentTenant && (
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <div className="text-xs text-purple-700 font-medium">Ver como:</div>
              <Select value={viewAsRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-48 h-8 text-xs border-purple-300 focus:border-purple-500">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin impersonación</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewAsRole && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                  Impersonando: {viewAsRole}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            {/* Debug Mode Activation - Only for authorized users */}
            {isDebugUser && !isDebugMode && (
              <Button
                onClick={activateDebugMode}
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-300 hover:bg-orange-50 animate-pulse"
                data-testid="button-debug-mode"
              >
                <Bug className="w-3 h-3 mr-1" />
                Debug Mode
              </Button>
            )}

            {/* Debug Mode Status - When active */}
            {isDebugMode && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                🔧 Debug Active
              </Badge>
            )}
            
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
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
