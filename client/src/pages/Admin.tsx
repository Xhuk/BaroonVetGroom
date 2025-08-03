import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Building2, 
  Users, 
  Settings, 
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Clock,
  UserCheck,
  DoorOpen,
  Shield,
  GripVertical,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  
  // State for room management
  const [rooms, setRooms] = useState([
    { id: 'r1', name: 'Consulta 1', type: 'medical', capacity: 1, isActive: true },
    { id: 'r2', name: 'Consulta 2', type: 'medical', capacity: 1, isActive: true },
    { id: 'r3', name: 'Estética 1', type: 'grooming', capacity: 2, isActive: true },
    { id: 'r4', name: 'Estética 2', type: 'grooming', capacity: 1, isActive: false },
    { id: 'r5', name: 'Vacunación', type: 'vaccination', capacity: 3, isActive: true },
  ]);

  // State for services configuration
  const [services, setServices] = useState([
    { id: 's1', name: 'Consulta General', type: 'medical', duration: 60, price: 350 },
    { id: 's2', name: 'Baño Completo', type: 'grooming', duration: 90, price: 250 },
    { id: 's3', name: 'Corte de Uñas', type: 'grooming', duration: 15, price: 50 },
    { id: 's4', name: 'Vacuna Múltiple', type: 'vaccination', duration: 30, price: 400 },
    { id: 's5', name: 'Desparasitación', type: 'medical', duration: 20, price: 180 },
  ]);

  // State for roles and permissions
  const [roles, setRoles] = useState([
    { 
      id: 'role1', 
      name: 'recepcion', 
      displayName: 'Recepción', 
      department: 'reception',
      permissions: ['view_appointments', 'create_appointments', 'manage_clients'],
      assignedUsers: ['user1', 'user2']
    },
    { 
      id: 'role2', 
      name: 'grooming', 
      displayName: 'Estética', 
      department: 'grooming',
      permissions: ['view_appointments', 'update_grooming_status', 'upload_photos'],
      assignedUsers: ['user3', 'user4']
    },
    { 
      id: 'role3', 
      name: 'medical', 
      displayName: 'Médico', 
      department: 'medical',
      permissions: ['view_appointments', 'medical_records', 'prescriptions'],
      assignedUsers: ['user5']
    },
    { 
      id: 'role4', 
      name: 'admin', 
      displayName: 'Administrador', 
      department: 'admin',
      permissions: ['all_permissions'],
      assignedUsers: ['user6']
    },
    { 
      id: 'role5', 
      name: 'autoentregas', 
      displayName: 'Entregas', 
      department: 'delivery',
      permissions: ['view_delivery_routes', 'update_delivery_status'],
      assignedUsers: ['user7']
    }
  ]);

  // State for users
  const [users, setUsers] = useState([
    { id: 'user1', name: 'María González', email: 'maria@vetgroom.com', currentRole: 'recepcion' },
    { id: 'user2', name: 'Carlos Ruiz', email: 'carlos@vetgroom.com', currentRole: 'recepcion' },
    { id: 'user3', name: 'Ana López', email: 'ana@vetgroom.com', currentRole: 'grooming' },
    { id: 'user4', name: 'Pedro Sánchez', email: 'pedro@vetgroom.com', currentRole: 'grooming' },
    { id: 'user5', name: 'Dr. Luis Morales', email: 'luis@vetgroom.com', currentRole: 'medical' },
    { id: 'user6', name: 'Jessica Torres', email: 'jessica@vetgroom.com', currentRole: 'admin' },
    { id: 'user7', name: 'Roberto Díaz', email: 'roberto@vetgroom.com', currentRole: 'autoentregas' },
  ]);

  // Dialog states
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  // Helper function for room type icons
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'medical': return '🩺';
      case 'grooming': return '✂️';
      case 'vaccination': return '💉';
      default: return '🏠';
    }
  };

  // Helper function for room type colors
  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'grooming': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'vaccination': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Helper function for department colors
  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'reception': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'grooming': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'medical': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'delivery': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Debes iniciar sesión para acceder al panel de administración",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <Header />
      <Navigation />
      
      <main className="lg:ml-64 p-6 pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Panel de Administración</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona salas, roles, servicios y configuraciones para {currentTenant?.name}</p>
          </div>

          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rooms" className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                Salas
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Servicios
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Estadísticas
              </TabsTrigger>
            </TabsList>

            {/* Rooms Management Tab */}
            <TabsContent value="rooms" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Salas</h2>
                <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Sala
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nueva Sala</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nombre de la Sala</Label>
                        <Input placeholder="Ej: Consulta 3" />
                      </div>
                      <div>
                        <Label>Tipo de Sala</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medical">Médica</SelectItem>
                            <SelectItem value="grooming">Estética</SelectItem>
                            <SelectItem value="vaccination">Vacunación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Capacidad</Label>
                        <Input type="number" placeholder="1" />
                      </div>
                      <Button className="w-full">Crear Sala</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <Card key={room.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRoomTypeIcon(room.type)}</span>
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                        </div>
                        <Badge className={getRoomTypeColor(room.type)}>
                          {room.type === 'medical' && 'Médica'}
                          {room.type === 'grooming' && 'Estética'}
                          {room.type === 'vaccination' && 'Vacunación'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Capacidad:</span>
                          <span className="font-medium">{room.capacity} paciente(s)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                          <Badge variant={room.isActive ? "default" : "secondary"}>
                            {room.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Activa
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactiva
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Roles Management Tab */}
            <TabsContent value="roles" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Roles y Permisos</h2>
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Rol
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Rol</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre del Rol</Label>
                          <Input placeholder="Ej: supervisor" />
                        </div>
                        <div>
                          <Label>Nombre para Mostrar</Label>
                          <Input placeholder="Ej: Supervisor" />
                        </div>
                      </div>
                      <div>
                        <Label>Departamento</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reception">Recepción</SelectItem>
                            <SelectItem value="grooming">Estética</SelectItem>
                            <SelectItem value="medical">Médico</SelectItem>
                            <SelectItem value="admin">Administración</SelectItem>
                            <SelectItem value="delivery">Entregas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full">Crear Rol</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Roles List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Roles Disponibles</h3>
                  {roles.map((role) => (
                    <Card key={role.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{role.displayName}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{role.name}</p>
                          </div>
                        </div>
                        <Badge className={getDepartmentColor(role.department)}>
                          {role.department}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Permisos: </span>
                          <span className="font-medium">{role.permissions.length}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Usuarios asignados: </span>
                          <span className="font-medium">{role.assignedUsers.length}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Users Assignment */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asignación de Usuarios</h3>
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Usuarios del Sistema</h4>
                    <div className="space-y-3">
                      {users.map((user) => {
                        const userRole = roles.find(r => r.name === user.currentRole);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getDepartmentColor(userRole?.department || 'none')}>
                                {userRole?.displayName || 'Sin rol'}
                              </Badge>
                              <Button variant="outline" size="sm">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Cambiar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Services Management Tab */}
            <TabsContent value="services" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Configuración de Servicios</h2>
                <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Servicio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Servicio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nombre del Servicio</Label>
                        <Input placeholder="Ej: Limpieza Dental" />
                      </div>
                      <div>
                        <Label>Tipo de Servicio</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medical">Médico</SelectItem>
                            <SelectItem value="grooming">Estética</SelectItem>
                            <SelectItem value="vaccination">Vacunación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Duración (minutos)</Label>
                          <Input type="number" placeholder="60" />
                        </div>
                        <div>
                          <Label>Precio (MXN)</Label>
                          <Input type="number" placeholder="350" />
                        </div>
                      </div>
                      <Button className="w-full">Crear Servicio</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Servicios Configurados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-lg">
                            {service.type === 'medical' && '🩺'}
                            {service.type === 'grooming' && '🐾'}
                            {service.type === 'vaccination' && '💉'}
                          </span>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{service.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>⏱️ {service.duration} min</span>
                              <span>💰 ${service.price} MXN</span>
                              <Badge className={getRoomTypeColor(service.type)}>
                                {service.type === 'medical' && 'Médico'}
                                {service.type === 'grooming' && 'Estética'}
                                {service.type === 'vaccination' && 'Vacunación'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Estadísticas del Sistema</h2>
              
              {/* Admin Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Salas Activas</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{rooms.filter(r => r.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">
                      de {rooms.length} totales
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {roles.length} roles configurados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Servicios Configurados</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{services.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Duración promedio: {Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length)} min
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${Math.round(services.reduce((acc, s) => acc + s.price, 0) / services.length)}</div>
                    <p className="text-xs text-muted-foreground">
                      MXN por servicio
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Room Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Salas por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['medical', 'grooming', 'vaccination'].map((type) => {
                      const typeRooms = rooms.filter(r => r.type === type);
                      const percentage = Math.round((typeRooms.length / rooms.length) * 100);
                      return (
                        <div key={type} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-32">
                            <span className="text-lg">{getRoomTypeIcon(type)}</span>
                            <span className="text-sm font-medium">
                              {type === 'medical' && 'Médicas'}
                              {type === 'grooming' && 'Estética'}
                              {type === 'vaccination' && 'Vacunación'}
                            </span>
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                type === 'medical' ? 'bg-green-500' :
                                type === 'grooming' ? 'bg-purple-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12">{percentage}%</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                            ({typeRooms.length} salas)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Role Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Usuarios por Rol</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getDepartmentColor(role.department)}>
                            {role.displayName}
                          </Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {role.department}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {role.assignedUsers.length} usuarios
                          </span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ 
                                width: `${Math.round((role.assignedUsers.length / users.length) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
