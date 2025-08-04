import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, MapPin, Settings, Crown } from "lucide-react";

interface DebugTenantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantSelect: (tenant: any) => void;
}

export function DebugTenantSelector({ isOpen, onClose, onTenantSelect }: DebugTenantSelectorProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Check if user has debug/system admin access
  const isDebugUser = user?.email?.includes('vetgroom') || false;

  // Fetch all tenants for debug users
  const { data: allTenants = [], isLoading } = useQuery({
    queryKey: ['/api/debug/all-tenants'],
    enabled: isDebugUser && isOpen,
  });

  // Filter tenants based on search
  const filteredTenants = allTenants.filter((tenant: any) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isDebugUser) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Debug: Seleccionar Tenant
            <Badge variant="destructive" className="text-xs">
              MODO DEBUG
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, subdominio o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tenant List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center text-gray-500 p-8">
                {searchTerm ? 'No se encontraron tenants' : 'No hay tenants disponibles'}
              </div>
            ) : (
              filteredTenants.map((tenant: any) => (
                <Card key={tenant.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <CardContent 
                    className="p-4"
                    onClick={() => onTenantSelect(tenant)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{tenant.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {tenant.subdomain}
                            </Badge>
                            {tenant.companyName && (
                              <Badge variant="secondary" className="text-xs">
                                {tenant.companyName}
                              </Badge>
                            )}
                          </div>
                          {tenant.address && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {tenant.address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={
                            tenant.deliveryTrackingEnabled 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }>
                            {tenant.deliveryTrackingEnabled ? 'Delivery ON' : 'Delivery OFF'}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {tenant.openTime} - {tenant.closeTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                // Clear tenant selection and return to debug mode
                sessionStorage.removeItem('selectedTenantId');
                sessionStorage.setItem('debugMode', 'true');
                onClose();
                window.location.reload();
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Modo Debug
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}