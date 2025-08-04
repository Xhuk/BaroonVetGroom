import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Building2, 
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Settings,
  Crown,
  Key,
  AlertTriangle
} from "lucide-react";

// Available pages in the system
const AVAILABLE_PAGES = [
  { id: '/', name: 'Dashboard', description: 'Panel principal' },
  { id: '/appointments', name: 'Citas', description: 'Gestión de citas' },
  { id: '/booking', name: 'Reservas', description: 'Asistente de reservas' },
  { id: '/clients', name: 'Clientes', description: 'Gestión de clientes' },
  { id: '/inventory', name: 'Inventario', description: 'Gestión de inventario' },
  { id: '/delivery-plan', name: 'Plan Entregas', description: 'Planificación de entregas' },
  { id: '/route-map', name: 'Mapa Rutas', description: 'Visualización de rutas' },
  { id: '/billing', name: 'Facturación', description: 'Gestión de facturación' },
  { id: '/admin', name: 'Administración', description: 'Panel administrativo' },
  { id: '/admin/settings', name: 'Configuración Admin', description: 'Configuraciones del sistema' },
  { id: '/admin/business-hours', name: 'Horarios', description: 'Configuración de horarios' },
  { id: '/admin/van-config', name: 'Config Vehículos', description: 'Configuración de vehículos' }
];

export default function SuperAdminRBAC() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // State management
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isUserAssignDialogOpen, setIsUserAssignDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    displayName: '',
    description: '',
    pageAccess: 'none' as 'all' | 'some' | 'one' | 'none',
    allowedPages: [] as string[],
    permissions: [] as string[],
    department: 'admin'
  });

  // Check if user has system admin access
  const isSystemAdmin = user?.email?.includes('vetgroom') || false;

  // Fetch system data
  const { data: companies } = useQuery({
    queryKey: ['/api/superadmin/companies'],
    enabled: isSystemAdmin,
  });

  const { data: systemRoles } = useQuery({
    queryKey: ['/api/superadmin/system-roles'],
    enabled: isSystemAdmin,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['/api/superadmin/roles', selectedCompany],
    enabled: isSystemAdmin && !!selectedCompany,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/superadmin/users', selectedCompany],
    enabled: isSystemAdmin && !!selectedCompany,
  });

  const { data: userAssignments = [] } = useQuery({
    queryKey: ['/api/superadmin/user-assignments', selectedCompany],
    enabled: isSystemAdmin && !!selectedCompany,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      return await apiRequest('/api/superadmin/roles', 'POST', {
        ...roleData,
        companyId: selectedCompany,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/roles'] });
      setIsRoleDialogOpen(false);
      setNewRoleData({
        name: '',
        displayName: '',
        description: '',
        pageAccess: 'none',
        allowedPages: [],
        permissions: [],
        department: 'admin'
      });
      toast({
        title: "Rol creado",
        description: "El nuevo rol ha sido creado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el rol",
        variant: "destructive",
      });
    },
  });

  // Assign system role mutation
  const assignSystemRoleMutation = useMutation({
    mutationFn: async ({ userId, systemRoleId }: { userId: string; systemRoleId: string }) => {
      return await apiRequest('/api/superadmin/assign-system-role', 'POST', { userId, systemRoleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/user-assignments'] });
      toast({
        title: "Rol de sistema asignado",
        description: "El rol de sistema ha sido asignado correctamente",
      });
    },
  });

  // Check authorization
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isSystemAdmin)) {
      toast({
        title: "Acceso Denegado",
        description: "Solo desarrolladores y administradores de VetGroom pueden acceder a esta página",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, isSystemAdmin, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isSystemAdmin) {
    return null;
  }

  const handleCreateRole = () => {
    if (!newRoleData.name || !newRoleData.displayName) {
      toast({
        title: "Error",
        description: "Nombre y nombre para mostrar son requeridos",
        variant: "destructive",
      });
      return;
    }

    createRoleMutation.mutate(newRoleData);
  };

  const handlePageAccessChange = (value: string) => {
    const pageAccess = value as 'all' | 'some' | 'one' | 'none';
    setNewRoleData(prev => ({
      ...prev,
      pageAccess,
      allowedPages: pageAccess === 'all' || pageAccess === 'none' ? [] : prev.allowedPages
    }));
  };

  const handlePageSelection = (pageId: string, checked: boolean) => {
    setNewRoleData(prev => ({
      ...prev,
      allowedPages: checked 
        ? [...prev.allowedPages, pageId]
        : prev.allowedPages.filter(p => p !== pageId)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <Header />
      <Navigation />
      
      <main className="lg:ml-64 p-6 pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <BackButton className="mb-4" />
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                SuperAdmin RBAC
              </h1>
              <Badge variant="destructive" className="text-xs">
                SOLO VETGROOM
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Gestión de roles y permisos para desarrolladores y administradores de sistema
            </p>
          </div>

          {/* Company Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Seleccionar Compañía
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar compañía para gestionar roles..." />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedCompany && (
            <Tabs defaultValue="roles" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Roles de Acceso
                </TabsTrigger>
                <TabsTrigger value="system-roles" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Roles de Sistema
                </TabsTrigger>
                <TabsTrigger value="assignments" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Asignaciones
                </TabsTrigger>
              </TabsList>

              {/* Roles Management */}
              <TabsContent value="roles" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Roles de Acceso a Páginas
                  </h2>
                  
                  <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Rol
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Rol de Acceso</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nombre del Rol *</Label>
                            <Input 
                              value={newRoleData.name}
                              onChange={(e) => setNewRoleData(prev => ({...prev, name: e.target.value}))}
                              placeholder="ej: marketing_manager"
                            />
                          </div>
                          <div>
                            <Label>Nombre para Mostrar *</Label>
                            <Input 
                              value={newRoleData.displayName}
                              onChange={(e) => setNewRoleData(prev => ({...prev, displayName: e.target.value}))}
                              placeholder="ej: Gerente de Marketing"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Descripción</Label>
                          <Textarea 
                            value={newRoleData.description}
                            onChange={(e) => setNewRoleData(prev => ({...prev, description: e.target.value}))}
                            placeholder="Descripción del rol y sus responsabilidades"
                          />
                        </div>

                        <div>
                          <Label>Departamento</Label>
                          <Select 
                            value={newRoleData.department}
                            onValueChange={(value) => setNewRoleData(prev => ({...prev, department: value}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administración</SelectItem>
                              <SelectItem value="reception">Recepción</SelectItem>
                              <SelectItem value="medical">Médico</SelectItem>
                              <SelectItem value="grooming">Estética</SelectItem>
                              <SelectItem value="delivery">Entregas</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="finance">Finanzas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Acceso a Páginas</Label>
                          <Select value={newRoleData.pageAccess} onValueChange={handlePageAccessChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas las páginas</SelectItem>
                              <SelectItem value="some">Páginas específicas</SelectItem>
                              <SelectItem value="one">Una sola página</SelectItem>
                              <SelectItem value="none">Sin acceso a páginas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(newRoleData.pageAccess === 'some' || newRoleData.pageAccess === 'one') && (
                          <div>
                            <Label>Páginas Permitidas</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                              {AVAILABLE_PAGES.map((page) => (
                                <div key={page.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={page.id}
                                    checked={newRoleData.allowedPages.includes(page.id)}
                                    onCheckedChange={(checked) => 
                                      handlePageSelection(page.id, checked as boolean)
                                    }
                                    disabled={newRoleData.pageAccess === 'one' && 
                                      newRoleData.allowedPages.length >= 1 && 
                                      !newRoleData.allowedPages.includes(page.id)}
                                  />
                                  <Label htmlFor={page.id} className="text-sm">
                                    {page.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsRoleDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleCreateRole}
                            disabled={createRoleMutation.isPending}
                          >
                            {createRoleMutation.isPending ? 'Creando...' : 'Crear Rol'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {roles?.map((role: any) => (
                    <Card key={role.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{role.displayName}</h3>
                              <Badge variant="outline">{role.department}</Badge>
                              <Badge className={
                                role.pageAccess === 'all' ? 'bg-green-100 text-green-800' :
                                role.pageAccess === 'some' ? 'bg-blue-100 text-blue-800' :
                                role.pageAccess === 'one' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {role.pageAccess === 'all' ? 'Todas' :
                                 role.pageAccess === 'some' ? 'Algunas' :
                                 role.pageAccess === 'one' ? 'Una' : 'Ninguna'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                            {role.allowedPages?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {role.allowedPages.map((pageId: string) => {
                                  const page = AVAILABLE_PAGES.find(p => p.id === pageId);
                                  return (
                                    <Badge key={pageId} variant="secondary" className="text-xs">
                                      {page?.name || pageId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* System Roles */}
              <TabsContent value="system-roles" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Roles de Sistema VetGroom
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {systemRoles?.map((systemRole: any) => (
                        <div key={systemRole.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <h4 className="font-medium">{systemRole.displayName}</h4>
                            <p className="text-sm text-gray-600">{systemRole.description}</p>
                          </div>
                          <Badge variant="secondary">Sistema</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Assignments */}
              <TabsContent value="assignments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Asignaciones de Usuario
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users?.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {user.role?.displayName || 'Sin rol'}
                            </Badge>
                            <Button variant="outline" size="sm">
                              Asignar Rol
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900">Acceso Restringido</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Esta página está disponible únicamente para desarrolladores y administradores de sistema de VetGroom. 
                  Los cambios realizados aquí afectan el control de acceso en toda la plataforma.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}