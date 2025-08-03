import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Tenant, UserTenant } from "@shared/schema";

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: UserTenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  const { data: userTenants = [], isLoading: isLoadingTenants } = useQuery<UserTenant[]>({
    queryKey: ["/api/tenants/user"],
    enabled: isAuthenticated,
  });

  const { data: tenant, isLoading: isLoadingCurrentTenant } = useQuery<Tenant>({
    queryKey: ["/api/tenants", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Auto-select first tenant if none selected
  useEffect(() => {
    if (userTenants.length > 0 && !currentTenant) {
      const firstTenant = userTenants[0];
      if (firstTenant) {
        // We need to fetch the full tenant data
        fetch(`/api/tenants/${firstTenant.tenantId}`)
          .then(res => res.json())
          .then(tenantData => setCurrentTenant(tenantData))
          .catch(console.error);
      }
    }
  }, [userTenants, currentTenant]);

  const value = {
    currentTenant: tenant || currentTenant,
    userTenants,
    setCurrentTenant,
    isLoading: isLoadingTenants || isLoadingCurrentTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
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
