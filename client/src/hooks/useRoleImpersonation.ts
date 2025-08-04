import { useState, useContext, createContext, useEffect, ReactNode } from 'react';
import { useAccessControl } from '@/hooks/useAccessControl';

interface RoleImpersonationContextType {
  impersonatedRole: string | null;
  setImpersonatedRole: (role: string | null) => void;
  isImpersonating: boolean;
  originalPermissions: any;
  impersonatedPermissions: any;
}

const RoleImpersonationContext = createContext<RoleImpersonationContextType | null>(null);

// Hook to use role impersonation
export function useRoleImpersonation() {
  const context = useContext(RoleImpersonationContext);
  if (!context) {
    throw new Error('useRoleImpersonation must be used within RoleImpersonationProvider');
  }
  return context;
}

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  system_admin: {
    canAccessSuperAdmin: true,
    canDebugTenants: true,
    canManageCompanies: true,
    canManageAllTenants: true,
    canViewAllData: true,
    canManageUsers: true,
    canManageRoles: true,
    canAccessDeliveryTracking: true,
    canManageInventory: true,
    canViewReports: true,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: true
  },
  company_admin: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: true,
    canManageUsers: true,
    canManageRoles: true,
    canAccessDeliveryTracking: true,
    canManageInventory: true,
    canViewReports: true,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: true
  },
  tenant_admin: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: true,
    canManageUsers: true,
    canManageRoles: false,
    canAccessDeliveryTracking: true,
    canManageInventory: true,
    canViewReports: true,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: true
  },
  veterinario: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: false,
    canManageInventory: false,
    canViewReports: true,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: true
  },
  asistente: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: false,
    canManageInventory: true,
    canViewReports: false,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: true
  },
  recepcionista: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: false,
    canManageInventory: false,
    canViewReports: false,
    canManageAppointments: true,
    canManageClients: true,
    canManagePets: false
  },
  groomer: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: false,
    canManageInventory: false,
    canViewReports: false,
    canManageAppointments: true,
    canManageClients: false,
    canManagePets: false
  },
  delivery_driver: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: true,
    canManageInventory: false,
    canViewReports: false,
    canManageAppointments: false,
    canManageClients: false,
    canManagePets: false
  },
  viewer: {
    canAccessSuperAdmin: false,
    canDebugTenants: false,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageRoles: false,
    canAccessDeliveryTracking: false,
    canManageInventory: false,
    canViewReports: false,
    canManageAppointments: false,
    canManageClients: false,
    canManagePets: false
  }
};

// Provider component
export function RoleImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedRole, setImpersonatedRoleState] = useState<string | null>(null);
  const originalAccessControl = useAccessControl();

  // Load impersonation state from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonatedRole');
    if (stored) {
      setImpersonatedRoleState(stored);
    }
  }, []);

  const setImpersonatedRole = (role: string | null) => {
    setImpersonatedRoleState(role);
    if (role) {
      sessionStorage.setItem('impersonatedRole', role);
    } else {
      sessionStorage.removeItem('impersonatedRole');
    }
  };

  const isImpersonating = !!impersonatedRole;
  const impersonatedPermissions = impersonatedRole ? ROLE_PERMISSIONS[impersonatedRole as keyof typeof ROLE_PERMISSIONS] : null;

  const contextValue = {
    impersonatedRole,
    setImpersonatedRole,
    isImpersonating,
    originalPermissions: originalAccessControl,
    impersonatedPermissions
  };

  const Provider = RoleImpersonationContext.Provider;
  return Provider({ value: contextValue, children });
}

// Enhanced access control hook that considers impersonation
export function useImpersonatedAccessControl() {
  try {
    const { isImpersonating, impersonatedPermissions, originalPermissions } = useRoleImpersonation();
    
    if (isImpersonating && impersonatedPermissions) {
      return impersonatedPermissions;
    }
    
    return originalPermissions;
  } catch (error) {
    // Fallback to regular access control if impersonation context is not available
    const { useAccessControl } = require('@/hooks/useAccessControl');
    return useAccessControl();
  }
}