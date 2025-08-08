import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  Save,
  Building,
  Store,
  FileText
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { apiRequest } from "@/lib/queryClient";

interface Company {
  id: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
}

interface Tenant {
  id: string;
  name: string;
  companyId: string;
  subdomain: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export default function CompanyClinicAdmin() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({});
  const [tenantFormData, setTenantFormData] = useState<Partial<Tenant>>({});
  const [isEditing, setIsEditing] = useState({ company: false, tenant: false });

  // Fetch tenant data
  const { data: tenant, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ["/api/admin/tenant", currentTenant?.id],
    queryFn: () => fetch(`/api/admin/tenant/${currentTenant?.id}`).then(res => res.json()),
    enabled: !!currentTenant?.id,
  });

  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/admin/company", tenant?.companyId],
    queryFn: () => fetch(`/api/admin/company/${tenant?.companyId}`).then(res => res.json()),
    enabled: !!tenant?.companyId,
  });

  // Initialize form data when data loads
  useEffect(() => {
    if (company && !isEditing.company) {
      setCompanyFormData(company);
    }
  }, [company, isEditing.company]);

  useEffect(() => {
    if (tenant && !isEditing.tenant) {
      setTenantFormData(tenant);
    }
  }, [tenant, isEditing.tenant]);

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (updates: Partial<Company>) => {
      return apiRequest(`/api/admin/company/${company?.id}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company"] });
      setIsEditing({ ...isEditing, company: false });
      toast({
        title: "Empresa Actualizada",
        description: "La información de la empresa se actualizó correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la empresa",
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (updates: Partial<Tenant>) => {
      return apiRequest(`/api/admin/tenant/${tenant?.id}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenant"] });
      setIsEditing({ ...isEditing, tenant: false });
      toast({
        title: "Clínica Actualizada",
        description: "La información de la clínica se actualizó correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la clínica",
        variant: "destructive",
      });
    },
  });

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(companyFormData);
  };

  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantMutation.mutate(tenantFormData);
  };

  const handleCancelEdit = (type: 'company' | 'tenant') => {
    if (type === 'company' && company) {
      setCompanyFormData(company);
      setIsEditing({ ...isEditing, company: false });
    } else if (type === 'tenant' && tenant) {
      setTenantFormData(tenant);
      setIsEditing({ ...isEditing, tenant: false });
    }
  };

  if (companyLoading || tenantLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Gestión de Empresa y Clínica
        </h1>
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Esta información aparecerá en las facturas
        </div>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6" />
              Información de la Empresa
            </div>
            <div className="flex items-center gap-2">
              {isEditing.company ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCancelEdit('company')}
                    data-testid="button-cancel-company-edit"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    type="submit" 
                    form="company-form"
                    disabled={updateCompanyMutation.isPending}
                    data-testid="button-save-company"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCompanyMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing({ ...isEditing, company: true })}
                  data-testid="button-edit-company"
                >
                  Editar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form id="company-form" onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-name">Nombre de la Empresa *</Label>
                <Input
                  id="company-name"
                  value={companyFormData.name || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                  disabled={!isEditing.company}
                  required
                  data-testid="input-company-name"
                  placeholder="Ej: VetCorp Servicios Veterinarios"
                />
              </div>
              <div>
                <Label htmlFor="company-email">Email de la Empresa</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyFormData.email || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                  disabled={!isEditing.company}
                  data-testid="input-company-email"
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="company-phone">Teléfono de la Empresa</Label>
                <Input
                  id="company-phone"
                  value={companyFormData.phone || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                  disabled={!isEditing.company}
                  data-testid="input-company-phone"
                  placeholder="+52 55 1234-5678"
                />
              </div>
              <div>
                <Label htmlFor="company-website">Sitio Web</Label>
                <Input
                  id="company-website"
                  value={companyFormData.website || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                  disabled={!isEditing.company}
                  data-testid="input-company-website"
                  placeholder="https://empresa.com"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="company-address">Dirección de la Empresa</Label>
              <Textarea
                id="company-address"
                value={companyFormData.address || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                disabled={!isEditing.company}
                data-testid="textarea-company-address"
                placeholder="Dirección principal de la empresa"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="company-description">Descripción</Label>
              <Textarea
                id="company-description"
                value={companyFormData.description || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                disabled={!isEditing.company}
                data-testid="textarea-company-description"
                placeholder="Breve descripción de la empresa"
                rows={3}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Clinic/Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6" />
              Información de la Clínica
            </div>
            <div className="flex items-center gap-2">
              {isEditing.tenant ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCancelEdit('tenant')}
                    data-testid="button-cancel-tenant-edit"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    type="submit" 
                    form="tenant-form"
                    disabled={updateTenantMutation.isPending}
                    data-testid="button-save-tenant"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateTenantMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing({ ...isEditing, tenant: true })}
                  data-testid="button-edit-tenant"
                >
                  Editar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form id="tenant-form" onSubmit={handleTenantSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant-name">Nombre de la Clínica *</Label>
                <Input
                  id="tenant-name"
                  value={tenantFormData.name || ''}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, name: e.target.value })}
                  disabled={!isEditing.tenant}
                  required
                  data-testid="input-tenant-name"
                  placeholder="Ej: Clínica Veterinaria Centro"
                />
              </div>
              <div>
                <Label htmlFor="tenant-email">Email de la Clínica</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={tenantFormData.email || ''}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, email: e.target.value })}
                  disabled={!isEditing.tenant}
                  data-testid="input-tenant-email"
                  placeholder="clinica@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="tenant-phone">Teléfono de la Clínica</Label>
                <Input
                  id="tenant-phone"
                  value={tenantFormData.phone || ''}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, phone: e.target.value })}
                  disabled={!isEditing.tenant}
                  data-testid="input-tenant-phone"
                  placeholder="+52 55 8765-4321"
                />
              </div>
              <div>
                <Label htmlFor="tenant-subdomain">Subdominio</Label>
                <Input
                  id="tenant-subdomain"
                  value={tenantFormData.subdomain || ''}
                  disabled={true}
                  data-testid="input-tenant-subdomain"
                  className="bg-gray-100"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="tenant-address">Dirección de la Clínica</Label>
              <Textarea
                id="tenant-address"
                value={tenantFormData.address || ''}
                onChange={(e) => setTenantFormData({ ...tenantFormData, address: e.target.value })}
                disabled={!isEditing.tenant}
                data-testid="textarea-tenant-address"
                placeholder="Dirección específica de esta clínica"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tenant-description">Descripción</Label>
              <Textarea
                id="tenant-description"
                value={tenantFormData.description || ''}
                onChange={(e) => setTenantFormData({ ...tenantFormData, description: e.target.value })}
                disabled={!isEditing.tenant}
                data-testid="textarea-tenant-description"
                placeholder="Información específica de esta clínica"
                rows={3}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-blue-800">
              <h3 className="font-semibold mb-2">Información sobre las Facturas</h3>
              <ul className="text-sm space-y-1">
                <li>• El <strong>nombre de la empresa</strong> aparecerá como encabezado principal</li>
                <li>• El <strong>nombre de la clínica</strong> aparecerá como subtítulo</li>
                <li>• Las <strong>direcciones y teléfonos</strong> aparecerán en el pie de la factura</li>
                <li>• Los cambios se aplicarán automáticamente a las nuevas facturas generadas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}