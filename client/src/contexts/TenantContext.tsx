import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Tenant, UserTenant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Building2 } from "lucide-react";

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: UserTenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  isLoading: boolean;
  showTenantSelector: boolean;
  availableTenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

  const { data: userTenants = [], isLoading: isLoadingTenants } = useQuery<UserTenant[]>({
    queryKey: ["/api/tenants/user"],
    enabled: isAuthenticated,
  });

  const { data: tenant, isLoading: isLoadingCurrentTenant } = useQuery<Tenant>({
    queryKey: ["/api/tenants", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Handle tenant selection logic
  useEffect(() => {
    if (userTenants.length > 0 && !currentTenant) {
      // Fetch full tenant data for all user tenants
      Promise.all(
        userTenants.map(ut => 
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
  }, [userTenants, currentTenant]);

  const handleTenantSelect = (selectedTenant: Tenant) => {
    setCurrentTenant(selectedTenant);
    setShowTenantSelector(false);
    // Store preference for this session
    sessionStorage.setItem('selectedTenantId', selectedTenant.id);
  };

  const value = {
    currentTenant: tenant || currentTenant,
    userTenants,
    setCurrentTenant,
    isLoading: isLoadingTenants || isLoadingCurrentTenant,
    showTenantSelector,
    availableTenants,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
      
      {/* Tenant Selection Dialog */}
      <Dialog open={showTenantSelector} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-tenant-selector">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Seleccionar Sucursal
            </DialogTitle>
            <DialogDescription>
              Tienes acceso a múltiples ubicaciones. Selecciona la sucursal para esta sesión:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-2">
              {availableTenants.map((tenantOption) => (
                <Button
                  key={tenantOption.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleTenantSelect(tenantOption)}
                  data-testid={`button-select-tenant-${tenantOption.id}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{tenantOption.name}</div>
                      {tenantOption.address && (
                        <div className="text-sm text-gray-500 mt-1">{tenantOption.address}</div>
                      )}
                      {tenantOption.latitude && tenantOption.longitude && (
                        <div className="text-xs text-blue-600 mt-1">
                          GPS: {parseFloat(tenantOption.latitude).toFixed(4)}, {parseFloat(tenantOption.longitude).toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
