import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Search } from "lucide-react";

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

export function CompanyTenantSelector() {
  const { canDebugTenants } = useAccessControl();
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/superadmin/companies'],
    enabled: canDebugTenants,
  });

  const { data: allTenants } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants/all'],
    enabled: canDebugTenants,
  });

  const filteredTenants = allTenants?.filter(t => !selectedCompany || t.companyId === selectedCompany);

  if (!canDebugTenants) {
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
                <SelectItem value="">Todas las empresas</SelectItem>
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
                <SelectItem value="">Todos los tenants</SelectItem>
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
              }}
              className="ml-auto bg-white text-yellow-800 border-yellow-300 hover:bg-yellow-50"
            >
              Limpiar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}