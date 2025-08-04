import { useQuery } from "@tanstack/react-query";

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

export function useAccessControl() {
  const { data: accessInfo, isLoading } = useQuery<AccessInfo>({
    queryKey: ['/api/auth/access-info'],
    retry: false,
  });

  return {
    accessInfo,
    isLoading,
    canAccessSuperAdmin: accessInfo?.canAccessSuperAdmin || false,
    canAccessAdmin: accessInfo?.canAccessAdmin || false,
    canDebugTenants: accessInfo?.canDebugTenants || false,
    accessLevel: accessInfo?.accessLevel || 'none',
    roles: accessInfo?.roles || [],
    isSystemAdmin: accessInfo?.accessLevel === 'system_admin',
    isSuperTenant: accessInfo?.accessLevel === 'super_tenant',
    isTenant: accessInfo?.accessLevel === 'tenant',
  };
}