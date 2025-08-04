import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Tenant, UserTenant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Crown, Settings } from "lucide-react";
import { DebugTenantSelector } from "@/components/DebugTenantSelector";

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: UserTenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  isLoading: boolean;
  showTenantSelector: boolean;
  availableTenants: Tenant[];
  isDebugMode: boolean;
  showDebugSelector: () => void;
  exitDebugMode: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [showDebugTenantSelector, setShowDebugTenantSelector] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Check if user has debug access
  const isDebugUser = user?.email?.includes('vetgroom') || false;

  // Check if we're on Replit domain to decide which endpoint to use
  const isReplitDomain = window.location.hostname.includes('replit.dev');
  const tenantsEndpoint = isReplitDomain ? "/api/preview/tenants" : "/api/tenants/user";
  
  const { data: finalTenants = [], isLoading: isLoadingTenants } = useQuery<UserTenant[]>({
    queryKey: [tenantsEndpoint],
    enabled: isAuthenticated,
  });

  const { data: tenant, isLoading: isLoadingCurrentTenant } = useQuery<Tenant>({
    queryKey: ["/api/tenants", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Check for debug mode and stored tenant selection
  useEffect(() => {
    const debugMode = sessionStorage.getItem('debugMode') === 'true';
    const storedTenantId = sessionStorage.getItem('selectedTenantId');
    
    setIsDebugMode(debugMode);
    
    if (debugMode && isDebugUser) {
      if (storedTenantId) {
        // Load the stored tenant for debug mode
        fetch(`/api/tenants/${storedTenantId}`)
          .then(res => res.json())
          .then(tenant => {
            if (tenant && !tenant.error) {
              setCurrentTenant(tenant);
            } else {
              // Invalid stored tenant, show debug selector
              setShowDebugTenantSelector(true);
            }
          })
          .catch(() => setShowDebugTenantSelector(true));
      } else {
        // No stored tenant, show debug selector
        setShowDebugTenantSelector(true);
      }
      return; // Skip normal tenant logic in debug mode
    }
    
    // Normal tenant selection logic for non-debug users
    if (finalTenants.length > 0 && !currentTenant && !debugMode) {
      // Fetch full tenant data for all user tenants
      Promise.all(
        finalTenants.map(ut => 
          fetch(`/api/tenants/${ut.tenantId}`)
            .then(res => res.json())
            .catch(console.error)
        )
      ).then(tenantDataArray => {
        const validTenants = tenantDataArray.filter(Boolean);
        // Remove duplicates based on tenant ID
        const uniqueTenants = validTenants.filter((tenant, index, self) => 
          index === self.findIndex(t => t.id === tenant.id)
        );
        setAvailableTenants(uniqueTenants);
        
        if (uniqueTenants.length === 1) {
          // Auto-select if only one tenant
          setCurrentTenant(uniqueTenants[0]);
        } else if (uniqueTenants.length > 1) {
          // Show selection dialog for multiple tenants
          setShowTenantSelector(true);
        }
      });
    }
  }, [finalTenants, currentTenant, user, isDebugUser]);

  const handleTenantSelect = (selectedTenant: Tenant) => {
    setCurrentTenant(selectedTenant);
    setShowTenantSelector(false);
    // Store preference for this session
    sessionStorage.setItem('selectedTenantId', selectedTenant.id);
  };

  const handleDebugTenantSelect = (selectedTenant: Tenant) => {
    setCurrentTenant(selectedTenant);
    setShowDebugTenantSelector(false);
    setIsDebugMode(true);
    // Store debug mode selection
    sessionStorage.setItem('selectedTenantId', selectedTenant.id);
    sessionStorage.setItem('debugMode', 'true');
  };

  const showDebugSelector = () => {
    if (isDebugUser) {
      setShowDebugTenantSelector(true);
    }
  };

  const exitDebugMode = () => {
    setIsDebugMode(false);
    setCurrentTenant(null);
    sessionStorage.removeItem('selectedTenantId');
    sessionStorage.removeItem('debugMode');
    // Reload to reinitialize normal tenant selection
    window.location.reload();
  };

  const value = {
    currentTenant: tenant || currentTenant,
    userTenants: finalTenants,
    setCurrentTenant,
    isLoading: isLoadingTenants || isLoadingCurrentTenant,
    showTenantSelector,
    availableTenants,
    isDebugMode,
    showDebugSelector,
    exitDebugMode,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
      
      {/* Debug Mode Banner */}
      {isDebugMode && isDebugUser && (
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
              size="sm" 
              variant="outline"
              onClick={exitDebugMode}
              className="border-black text-black hover:bg-black hover:text-yellow-400"
            >
              Salir Debug
            </Button>
          </div>
        </div>
      )}
      
      {/* Debug Tenant Selector */}
      <DebugTenantSelector
        isOpen={showDebugTenantSelector}
        onClose={() => setShowDebugTenantSelector(false)}
        onTenantSelect={handleDebugTenantSelect}
      />
      
      {/* Normal Tenant Selector */}
      {showTenantSelector && (
        <Dialog open={showTenantSelector} onOpenChange={() => setShowTenantSelector(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Seleccionar Sucursal</DialogTitle>
              <DialogDescription>
                Tienes acceso a múltiples sucursales. Selecciona con cuál deseas trabajar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableTenants.map((tenant) => (
                <div 
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTenantSelect(tenant)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <p className="text-sm text-gray-600">{tenant.subdomain}</p>
                      {tenant.address && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{tenant.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button>Seleccionar</Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
