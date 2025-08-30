import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface AccessibleTenant {
  id: string;
  name: string;
  companyId: string;
  accessType: 'client_admin' | 'tenant_admin';
  companyName?: string;
  roleName?: string;
}

interface AdminTenantContextType {
  accessibleTenants: AccessibleTenant[];
  selectedTenant: string | null;
  selectedTenantData: AccessibleTenant | null;
  adminType: 'client_admin' | 'tenant_admin' | null;
  isLoading: boolean;
  error: string | null;
  selectTenant: (tenantId: string) => void;
  clearSelection: () => void;
  canAccessTenant: (tenantId: string) => boolean;
  isClientAdmin: boolean;
}

const AdminTenantContext = createContext<AdminTenantContextType | null>(null);

export const useAdminTenant = () => {
  const context = useContext(AdminTenantContext);
  if (!context) {
    throw new Error('useAdminTenant must be used within an AdminTenantProvider');
  }
  return context;
};

interface AdminTenantProviderProps {
  children: React.ReactNode;
}

export const AdminTenantProvider: React.FC<AdminTenantProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  // Fetch accessible tenants for admin user
  const { 
    data: accessData, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/accessible-tenants'],
    queryFn: () => fetch('/api/admin/accessible-tenants').then(res => {
      if (!res.ok) throw new Error('Failed to fetch accessible tenants');
      return res.json();
    }),
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const accessibleTenants = accessData?.accessibleTenants || [];
  const adminType = accessData?.adminType || null;
  const isClientAdmin = adminType === 'client_admin';

  // Auto-select first tenant if none selected and tenants are available
  useEffect(() => {
    if (!selectedTenant && accessibleTenants.length > 0) {
      setSelectedTenant(accessibleTenants[0].id);
    }
  }, [accessibleTenants, selectedTenant]);

  // Get selected tenant data
  const selectedTenantData = selectedTenant 
    ? accessibleTenants.find(t => t.id === selectedTenant) || null
    : null;

  const selectTenant = (tenantId: string) => {
    const tenant = accessibleTenants.find(t => t.id === tenantId);
    if (tenant) {
      setSelectedTenant(tenantId);
      // Store in localStorage for persistence
      localStorage.setItem('adminSelectedTenant', tenantId);
    }
  };

  const clearSelection = () => {
    setSelectedTenant(null);
    localStorage.removeItem('adminSelectedTenant');
  };

  const canAccessTenant = (tenantId: string): boolean => {
    return accessibleTenants.some(t => t.id === tenantId);
  };

  // Restore selected tenant from localStorage on mount
  useEffect(() => {
    const storedTenant = localStorage.getItem('adminSelectedTenant');
    if (storedTenant && canAccessTenant(storedTenant)) {
      setSelectedTenant(storedTenant);
    }
  }, [accessibleTenants]);

  const value: AdminTenantContextType = {
    accessibleTenants,
    selectedTenant,
    selectedTenantData,
    adminType,
    isLoading,
    error: error?.message || null,
    selectTenant,
    clearSelection,
    canAccessTenant,
    isClientAdmin
  };

  return (
    <AdminTenantContext.Provider value={value}>
      {children}
    </AdminTenantContext.Provider>
  );
};