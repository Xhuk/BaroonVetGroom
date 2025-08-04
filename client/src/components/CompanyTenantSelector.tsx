import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Search, Check } from "lucide-react";

interface Company {
  id: string;
  name: string;
  email: string;
}

interface Tenant {
  id: string;
  name: string;
  companyId: string;
}

interface CompanyTenantSelectorProps {
  hideAccessCheck?: boolean;
}

export function CompanyTenantSelector({ hideAccessCheck = false }: CompanyTenantSelectorProps) {
  const { canDebugTenants } = useAccessControl();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/superadmin/companies'],
    enabled: canDebugTenants,
  });

  const { data: allTenants } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants/all'],
    enabled: canDebugTenants,
  });

  const filteredTenants = allTenants?.filter(t => !selectedCompany || t.companyId === selectedCompany);

  if (!hideAccessCheck && !canDebugTenants) {
    return null;
  }

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Search className="w-5 h-5" />
            Selector Debug - Empresa y Tenant
          </CardTitle>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            DEBUG MODE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-yellow-800 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              Empresa
            </label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empresa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tenant Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-yellow-800 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Tenant
            </label>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tenant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tenants</SelectItem>
                {filteredTenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(selectedCompany || selectedTenant) && (
          <div className="flex items-center gap-2 p-3 bg-yellow-100 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>Filtros activos:</strong>
              {selectedCompany && (
                <span className="ml-2">
                  Empresa: {companies?.find(c => c.id === selectedCompany)?.name}
                </span>
              )}
              {selectedTenant && (
                <span className="ml-2">
                  Tenant: {filteredTenants?.find(t => t.id === selectedTenant)?.name}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCompany("");
                setSelectedTenant("");
                setIsConfirmed(false);
              }}
              className="ml-auto bg-white text-yellow-800 border-yellow-300 hover:bg-yellow-50"
            >
              Limpiar
            </Button>
          </div>
        )}

        {/* Confirm Button */}
        <div className="flex items-center justify-between pt-4 border-t border-yellow-200">
          <div className="text-xs text-yellow-700">
            {selectedCompany && selectedTenant ? (
              <>Empresa: <strong>{companies?.find(c => c.id === selectedCompany)?.name}</strong>, Tenant: <strong>{allTenants?.find(t => t.id === selectedTenant)?.name}</strong></>
            ) : (
              "Selecciona empresa y tenant para continuar"
            )}
          </div>
          <Button 
            onClick={() => {
              if (selectedCompany && selectedTenant) {
                // Set debug mode and selected tenant
                sessionStorage.setItem('debugMode', 'true');
                sessionStorage.setItem('selectedTenantId', selectedTenant);
                sessionStorage.setItem('selectedCompanyId', selectedCompany);
                
                setIsConfirmed(true);
                toast({
                  title: "Configuración confirmada",
                  description: `Debug activo para ${companies?.find(c => c.id === selectedCompany)?.name} - ${allTenants?.find(t => t.id === selectedTenant)?.name}`,
                });
                
                // Refresh the app view
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                toast({
                  title: "Selección incompleta",
                  description: "Debes seleccionar tanto empresa como tenant",
                  variant: "destructive",
                });
              }
            }}
            disabled={!selectedCompany || !selectedTenant || isConfirmed}
            size="sm"
            className={isConfirmed ? "bg-green-600 hover:bg-green-700" : ""}
            data-testid="button-confirm-debug-selection"
          >
            {isConfirmed ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirmado - Recargando...
              </>
            ) : (
              "Confirmar y Cambiar Vista"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}