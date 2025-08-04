import { Button } from "@/components/ui/button";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useTenant } from "@/contexts/TenantContext";
import { Bug, Eye, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

export function DebugControls() {
  const { isLoading, accessInfo } = useAccessControl();
  const { isDebugMode, currentTenant, showDebugSelector, exitDebugMode } = useTenant();
  const [viewAsRole, setViewAsRole] = useState<string>("");

  // Load current role from sessionStorage on mount
  useEffect(() => {
    const storedRole = sessionStorage.getItem('impersonatedRole');
    if (storedRole) {
      setViewAsRole(storedRole);
    }
  }, []);

  // Use the original access info directly to avoid role impersonation interference
  const hasDebugAccess = accessInfo?.canDebugTenants || false;

  // Save role impersonation to sessionStorage when changed
  const handleRoleChange = (role: string) => {
    setViewAsRole(role);
    if (role && role !== 'none') {
      sessionStorage.setItem('impersonatedRole', role);
    } else {
      sessionStorage.removeItem('impersonatedRole');
    }
    
    // Reload page to apply new permissions
    window.location.reload();
  };

  const activateDebugMode = () => {
    sessionStorage.setItem('debugMode', 'true');
    sessionStorage.removeItem('selectedTenantId');
    showDebugSelector();
  };

  const setDebugTenant = (tenantId: string) => {
    sessionStorage.setItem('debugMode', 'true');
    sessionStorage.setItem('selectedTenantId', tenantId);
    window.location.reload();
  };

  // Show loading state or return null if no debug access
  if (isLoading) {
    return <div className="text-xs text-gray-400">Loading...</div>;
  }
  
  if (!hasDebugAccess) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Debug Mode Controls */}
      {!isDebugMode && (
        <Button
          onClick={activateDebugMode}
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          <Bug className="w-3 h-3 mr-1" />
          Debug
        </Button>
      )}

      {/* View As Role Selector - Debug Mode Only */}
      {isDebugMode && currentTenant && (
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-purple-600" />
          <div className="text-xs text-purple-700 font-medium">Ver como:</div>
          <Select value={viewAsRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-40 h-8 text-xs border-purple-300 focus:border-purple-500">
              <SelectValue placeholder="Rol..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin impersonación</SelectItem>
              <SelectItem value="system_admin">Sys Admin</SelectItem>
              <SelectItem value="company_admin">Company Admin</SelectItem>
              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
              <SelectItem value="veterinario">Veterinario</SelectItem>
              <SelectItem value="asistente">Asistente</SelectItem>
              <SelectItem value="recepcionista">Recepcionista</SelectItem>
              <SelectItem value="groomer">Groomer</SelectItem>
              <SelectItem value="delivery_driver">Conductor</SelectItem>
              <SelectItem value="viewer">Solo Lectura</SelectItem>
            </SelectContent>
          </Select>
          {viewAsRole && viewAsRole !== "none" && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
              {viewAsRole}
            </Badge>
          )}
          <Button
            onClick={exitDebugMode}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Salir
          </Button>
        </div>
      )}
    </div>
  );
}