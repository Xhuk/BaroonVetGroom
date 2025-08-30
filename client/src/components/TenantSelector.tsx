import React from 'react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, Crown, Shield } from 'lucide-react';

interface TenantSelectorProps {
  className?: string;
  placeholder?: string;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({ 
  className = "",
  placeholder = "Seleccionar clínica..."
}) => {
  const {
    accessibleTenants,
    selectedTenant,
    selectedTenantData,
    adminType,
    isLoading,
    selectTenant,
    isClientAdmin
  } = useAdminTenant();

  if (isLoading) {
    return (
      <div className={`min-w-[200px] ${className}`}>
        <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Cargando clínicas...</span>
        </div>
      </div>
    );
  }

  if (accessibleTenants.length === 0) {
    return (
      <div className={`min-w-[200px] ${className}`}>
        <div className="flex items-center space-x-2 p-2 border rounded-md bg-red-50 border-red-200">
          <Shield className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">Sin acceso a clínicas</span>
        </div>
      </div>
    );
  }

  const getAccessIcon = (accessType: string) => {
    switch (accessType) {
      case 'client_admin':
        return <Crown className="w-3 h-3 text-yellow-600" />;
      case 'tenant_admin':
        return <Shield className="w-3 h-3 text-blue-600" />;
      default:
        return <Building className="w-3 h-3 text-gray-600" />;
    }
  };

  const getAccessBadge = (accessType: string) => {
    switch (accessType) {
      case 'client_admin':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">Cliente Admin</Badge>;
      case 'tenant_admin':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">Admin</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Admin Type Badge */}
      <div className="flex items-center space-x-2">
        {getAccessIcon(adminType || '')}
        <span className="text-sm font-medium text-gray-700">
          {isClientAdmin ? 'Cliente Administrador' : 'Administrador'}
        </span>
        {getAccessBadge(adminType || '')}
      </div>

      {/* Tenant Selector */}
      <Select value={selectedTenant || ''} onValueChange={selectTenant}>
        <SelectTrigger className="min-w-[250px]" data-testid="tenant-selector-trigger">
          <SelectValue placeholder={placeholder}>
            {selectedTenantData && (
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-gray-600" />
                <span className="font-medium">{selectedTenantData.name}</span>
                {selectedTenantData.companyName && (
                  <span className="text-xs text-gray-500">
                    • {selectedTenantData.companyName}
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {accessibleTenants.map((tenant) => (
            <SelectItem 
              key={tenant.id} 
              value={tenant.id}
              data-testid={`tenant-option-${tenant.id}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="font-medium">{tenant.name}</span>
                    {tenant.companyName && (
                      <span className="text-xs text-gray-500">{tenant.companyName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {getAccessIcon(tenant.accessType)}
                  {tenant.roleName && (
                    <span className="text-xs text-gray-500">{tenant.roleName}</span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selected Tenant Info */}
      {selectedTenantData && (
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span>Administrando:</span>
          <span className="font-medium">{selectedTenantData.name}</span>
          {selectedTenantData.accessType === 'client_admin' && (
            <Badge variant="outline" className="text-xs">Acceso Total</Badge>
          )}
        </div>
      )}
    </div>
  );
};