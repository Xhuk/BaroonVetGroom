import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Tenant, UserTenant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Crown, Settings, X } from "lucide-react";
import { CompanyTenantSelector } from "@/components/CompanyTenantSelector";

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

  // Load access info first, then user tenants (sequential to reduce concurrency)
  const { data: accessInfo } = useQuery<any>({
    queryKey: ['/api/auth/access-info'],
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: userTenants = [], isLoading: isLoadingTenants } = useQuery<UserTenant[]>({
    queryKey: ["/api/tenants/user"],
    enabled: isAuthenticated && !!accessInfo, // Wait for access info first
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const isDebugUser = accessInfo?.canDebugTenants || user?.email?.includes('vetgroom') || false;

  // Load all tenants for debug mode (only when user is a debug user)
  const { data: allTenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants/all"],
    enabled: isAuthenticated && !!accessInfo && isDebugUser,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: tenant, isLoading: isLoadingCurrentTenant } = useQuery<Tenant>({
    queryKey: ["/api/tenants", currentTenant?.id],
    enabled: !!currentTenant?.id && !isLoadingTenants, // Wait for tenants list first
    staleTime: 15 * 60 * 1000, // 15 minutes - much longer cache
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Check for debug mode and stored tenant selection
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const debugMode = sessionStorage.getItem('debugMode') === 'true';
    const storedTenantId = sessionStorage.getItem('selectedTenantId');
    
    setIsDebugMode(debugMode);
    
    // Priority 1: Handle stored debug tenant selection (database-based)
    if (debugMode && isDebugUser && storedTenantId && !currentTenant) {
      // Find the selected tenant from all tenants (real database data)
      const selectedTenant = allTenants.find(t => t.id === storedTenantId);
      if (selectedTenant) {
        setCurrentTenant(selectedTenant);
      } else if (allTenants.length > 0) {
        // If tenant not found in all tenants list, show debug selector
        setShowDebugTenantSelector(true);
      }
      return;
    }
    
    // Priority 2: Show debug selector for debug mode without stored tenant
    if (debugMode && isDebugUser && !storedTenantId && !showDebugTenantSelector) {
      setShowDebugTenantSelector(true);
      return;
    }
    
    // Priority 3: Handle demo/vanilla users who might not be in userTenants properly
    if (user?.isDemoUser || user?.isVanillaUser) {
      const userEmail = user.claims?.email || user.email;
      if (userEmail && !currentTenant && !debugMode) {
        // Auto-detect tenant from user email for demo/vanilla users
        if (user.isDemoUser && userEmail.includes('@')) {
          // For demo users, try to find their demo tenant
          const allAvailableTenants = [...userTenants.map(ut => ({ id: ut.tenantId })), ...allTenants];
          const demoTenant = allAvailableTenants.find(t => t.id && t.id.startsWith('demo-'));
          if (demoTenant) {
            console.log('🎯 Auto-selecting demo tenant for user:', userEmail, 'tenant:', demoTenant.id);
            const optimisticTenant = {
              id: demoTenant.id,
              name: `Demo Clinic - ${demoTenant.id}`,
              subdomain: demoTenant.id,
              companyId: 'demo-company',
              address: 'Demo Address',
              phone: '+1-555-0123',
              email: userEmail,
              latitude: null,
              longitude: null,
              postalCode: null,
              openTime: '09:00:00',
              closeTime: '18:00:00',
              timeSlotDuration: 30,
              reservationTimeout: 5,
              deliveryTrackingEnabled: false,
              settings: { language: 'es', timezone: 'America/Mexico_City' },
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setCurrentTenant(optimisticTenant);
            return;
          }
        }
      }
    }

    // Priority 4: Handle regular tenant assignments (including debug users with normal assignments)
    if (userTenants.length > 0 && !currentTenant && !debugMode) {
      // Auto-select first tenant immediately for single tenant case
      if (userTenants.length === 1 && availableTenants.length === 0) {
        const userTenant = userTenants[0];
        // Create optimistic tenant object from user tenant data
        const optimisticTenant = {
          id: userTenant.tenantId,
          name: userTenant.tenantId, // Use tenantId as fallback name
          subdomain: userTenant.tenantId,
          companyId: 'unknown',
          address: '',
          phone: '',
          email: '',
          latitude: null,
          longitude: null,
          postalCode: null,
          openTime: '09:00:00',
          closeTime: '18:00:00',
          timeSlotDuration: 30,
          reservationTimeout: 5,
          deliveryTrackingEnabled: false,
          settings: { language: 'es', timezone: 'America/Mexico_City' },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setCurrentTenant(optimisticTenant);
      } else if (userTenants.length > 1 && availableTenants.length === 0) {
        // For multiple tenants, fetch full data
        Promise.all(
          userTenants.map(ut => 
            fetch(`/api/tenants/${ut.tenantId}`)
              .then(res => res.json())
              .catch(() => null)
          )
        ).then(tenantDataArray => {
          const validTenants = tenantDataArray.filter(Boolean);
          const uniqueTenants = validTenants.filter((tenant, index, self) => 
            index === self.findIndex(t => t.id === tenant.id)
          );
          setAvailableTenants(uniqueTenants);
          setShowTenantSelector(true);
        }).catch(console.error);
      }
    }
  }, [isAuthenticated, userTenants, currentTenant, isDebugUser, availableTenants.length, allTenants.length, showDebugTenantSelector]);

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
    userTenants,
    setCurrentTenant,
    isLoading: isLoadingTenants || isLoadingCurrentTenant,
    showTenantSelector,
    availableTenants: isDebugMode ? allTenants : availableTenants,
    isDebugMode,
    showDebugSelector,
    exitDebugMode,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
      

      
      {/* Debug Tenant Selector */}
      {showDebugTenantSelector && (
        <Dialog open={showDebugTenantSelector} onOpenChange={() => setShowDebugTenantSelector(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                Debug: Seleccionar Empresa y Tenant
                <Badge variant="destructive" className="text-xs">
                  MODO DEBUG
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <CompanyTenantSelector hideAccessCheck={true} />
          </DialogContent>
        </Dialog>
      )}
      
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
