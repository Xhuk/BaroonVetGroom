import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Settings, X } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAccessControl } from "@/hooks/useAccessControl";

/**
 * Debug banner component that provides consistent debug mode UI across all pages
 * Automatically handles spacing and positioning to prevent overlapping
 */
export function DebugBanner() {
  const { currentTenant, isDebugMode, showDebugSelector, exitDebugMode } = useTenant();
  const { accessInfo } = useAccessControl();
  
  const isDebugUser = accessInfo?.canDebugTenants || false;

  if (!isDebugMode || !isDebugUser) {
    return null;
  }

  return (
    <>
      {/* Debug Mode Banner */}
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black px-4 py-2 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" />
          <span className="font-medium">MODO DEBUG ACTIVO</span>
          {currentTenant && (
            <Badge variant="secondary" className="bg-black text-yellow-400">
              {currentTenant.name}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={showDebugSelector}
            className="bg-black text-yellow-400 hover:bg-gray-800"
          >
            <Settings className="w-3 h-3 mr-1" />
            Cambiar Tenant
          </Button>
          <Button 
            onClick={exitDebugMode}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-800"
          >
            <X className="w-4 h-4 mr-1" />
            Salir Debug
          </Button>
        </div>
      </div>
      
      {/* Debug Mode Spacer - Pushes content down */}
      <div className="h-16" />
    </>
  );
}