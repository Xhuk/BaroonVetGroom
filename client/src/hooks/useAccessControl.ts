import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface AccessInfo {
  accessLevel: 'system_admin' | 'super_tenant' | 'tenant' | 'none';
  roles: Array<{
    roleId: string;
    roleName: string;
    roleDescription: string;
    systemLevel: boolean;
    isActive: boolean;
  }>;
  canAccessSuperAdmin: boolean;
  canAccessAdmin: boolean;
  canDebugTenants: boolean;
}

// Role-based permissions mapping for impersonation
const ROLE_PERMISSIONS = {
  system_admin: {
    canAccessSuperAdmin: true,
    canAccessAdmin: true,
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
    canManagePets: true,
    accessLevel: 'system_admin' as const
  },
  company_admin: {
    canAccessSuperAdmin: false,
    canAccessAdmin: true,
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
    canManagePets: true,
    accessLevel: 'super_tenant' as const
  },
  tenant_admin: {
    canAccessSuperAdmin: false,
    canAccessAdmin: true,
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
    canManagePets: true,
    accessLevel: 'tenant' as const
  },
  debugger: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
    canDebugTenants: true,
    canManageCompanies: false,
    canManageAllTenants: false,
    canViewAllData: true, // Can view data across tenants for debugging
    canManageUsers: false, // READ-ONLY: Cannot modify users
    canManageRoles: false, // READ-ONLY: Cannot modify roles
    canAccessDeliveryTracking: true, // Can view for debugging
    canManageInventory: false, // READ-ONLY: Cannot modify inventory
    canViewReports: true, // Can view all reports for debugging
    canManageAppointments: false, // READ-ONLY: Cannot modify appointments
    canManageClients: false, // READ-ONLY: Cannot modify client data
    canManagePets: false, // READ-ONLY: Cannot modify pet data
    canManagePayments: false, // READ-ONLY: Cannot modify payment configurations
    canManageConfigurations: false, // READ-ONLY: Cannot modify system configurations
    canViewLogs: true, // Can access logs and diagnostic information
    canExportData: true, // Can export data for analysis
    accessLevel: 'tenant' as const
  },
  veterinario: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: true,
    accessLevel: 'tenant' as const
  },
  asistente: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: true,
    accessLevel: 'tenant' as const
  },
  recepcionista: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: false,
    accessLevel: 'tenant' as const
  },
  groomer: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: false,
    accessLevel: 'tenant' as const
  },
  delivery_driver: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: false,
    accessLevel: 'tenant' as const
  },
  viewer: {
    canAccessSuperAdmin: false,
    canAccessAdmin: false,
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
    canManagePets: false,
    accessLevel: 'none' as const
  }
};

export function useAccessControl() {
  const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null);

  const { data: accessInfo, isLoading } = useQuery<AccessInfo>({
    queryKey: ['/api/auth/access-info'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetching
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Prevent refetch on focus change
    refetchOnMount: false, // Don't refetch on remount if data exists
  });

  // Load impersonated role from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonatedRole');
    if (stored && stored !== 'none') {
      setImpersonatedRole(stored);
    } else {
      setImpersonatedRole(null);
    }
  }, []);

  // Use impersonated permissions if role is selected
  const effectivePermissions = impersonatedRole && ROLE_PERMISSIONS[impersonatedRole as keyof typeof ROLE_PERMISSIONS] 
    ? ROLE_PERMISSIONS[impersonatedRole as keyof typeof ROLE_PERMISSIONS]
    : {
        canAccessSuperAdmin: accessInfo?.canAccessSuperAdmin || false,
        canAccessAdmin: accessInfo?.canAccessAdmin || false,
        canDebugTenants: accessInfo?.canDebugTenants || false,
        accessLevel: accessInfo?.accessLevel || 'none',
        canManageCompanies: accessInfo?.accessLevel === 'system_admin',
        canManageAllTenants: accessInfo?.accessLevel === 'system_admin',
        canViewAllData: accessInfo?.accessLevel !== 'none',
        canManageUsers: accessInfo?.canAccessAdmin || false,
        canManageRoles: accessInfo?.accessLevel === 'system_admin',
        canAccessDeliveryTracking: accessInfo?.canAccessAdmin || false,
        canManageInventory: accessInfo?.canAccessAdmin || false,
        canViewReports: accessInfo?.canAccessAdmin || false,
        canManageAppointments: accessInfo?.canAccessAdmin || false,
        canManageClients: accessInfo?.canAccessAdmin || false,
        canManagePets: accessInfo?.canAccessAdmin || false,
      };

  return {
    accessInfo,
    isLoading,
    isImpersonating: !!impersonatedRole,
    impersonatedRole,
    roles: accessInfo?.roles || [],
    isSystemAdmin: effectivePermissions.accessLevel === 'system_admin',
    isSuperTenant: effectivePermissions.accessLevel === 'super_tenant',
    isTenant: effectivePermissions.accessLevel === 'tenant',
    ...effectivePermissions,
  };
}