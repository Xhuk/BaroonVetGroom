import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
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
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// Helper function to get room type icons
function getRoomTypeIcon(type: string) {
  switch (type) {
    case 'medical':
      return '🏥';
    case 'grooming':
      return '✂️';
    case 'vaccination':
      return '💉';
    default:
      return '🏠';
  }
}


export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  
  // Data from database
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  
  // Fetch data from database
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: [`/api/admin/rooms/${currentTenant?.id}`],
    enabled: !!currentTenant?.id,
  });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: [`/api/admin/services/${currentTenant?.id}`],
    enabled: !!currentTenant?.id,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: [`/api/admin/roles`],
  });

  useEffect(() => {
    if (roomsData) setRooms(roomsData);
    if (servicesData) setServices(servicesData);
    if (rolesData) setRoles(rolesData);
  }, [roomsData, servicesData, rolesData]);

  // State for roles (loaded from database)
  const [roles, setRoles] = useState([]);

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
  
  // Edit states
  const [editingService, setEditingService] = useState(null);
  const [editServiceData, setEditServiceData] = useState({
    name: '',
    type: '',
    duration: 0,
    price: 0
  });
  
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleData, setEditRoleData] = useState({
    name: '',
    displayName: '',
    department: '',
    permissions: []
  });
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    displayName: '',
    department: '',
    description: ''
  });
  
  // New room data
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    type: 'medical',
    capacity: 1,
    location: '',
    equipment: ''
  });

  // API Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data) => {
      return apiRequest('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ ...data, tenantId: currentTenant?.id }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Rol creado",
        description: "El nuevo rol se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setIsRoleDialogOpen(false);
      setNewRoleData({
        name: '',
        displayName: '',
        department: '',
        description: ''
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear roles",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el rol",
        variant: "destructive",
      });
    },
  });

  // Handle create role
  const handleCreateRole = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      name: formData.get('name'),
      displayName: formData.get('displayName'),
      department: formData.get('department'),
      description: formData.get('description'),
      permissions: JSON.stringify([]) // Default empty permissions array
    };

    if (!data.name || !data.displayName || !data.department) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    createRoleMutation.mutate(data);
  };

  // Handle edit service
  const handleEditService = (service) => {
    setEditingService(service);
    setEditServiceData({
      name: service.name,
      type: service.type,
      duration: service.duration,
      price: service.price
    });
  };

  // Handle save edited service
  const handleSaveEditedService = () => {
    if (editingService) {
      setServices(prev => prev.map(service => 
        service.id === editingService.id 
          ? { ...service, ...editServiceData }
          : service
      ));
      setEditingService(null);
      setEditServiceData({ name: '', type: '', duration: 0, price: 0 });
      toast({
        title: "Servicio actualizado",
        description: "El servicio ha sido actualizado exitosamente",
      });
    }
  };

  // Handle edit role
  const handleEditRole = (role) => {
    setEditingRole(role);
    setEditRoleData({
      name: role.name,
      displayName: role.displayName,
      department: role.department,
      permissions: [...role.permissions]
    });
  };

  // Handle save edited role
  const handleSaveEditedRole = () => {
    if (editingRole) {
      setRoles(prev => prev.map(role => 
        role.id === editingRole.id 
          ? { ...role, ...editRoleData }
          : role
      ));
      setEditingRole(null);
      setEditRoleData({ name: '', displayName: '', department: '', permissions: [] });
      toast({
        title: "Rol actualizado",
        description: "El rol ha sido actualizado exitosamente",
      });
    }
  };

  // Handle user role assignment
  const handleAssignRole = (user) => {
    setSelectedUser(user);
    setAvailableRoles(roles);
    setIsAssignDialogOpen(true);
  };

  // Handle save user role assignment
  const handleSaveRoleAssignment = (newRoleName) => {
    if (selectedUser && newRoleName) {
      // Update user's current role
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, currentRole: newRoleName }
          : user
      ));

      // Update role's assigned users
      setRoles(prev => prev.map(role => {
        // Remove user from previous role
        if (role.assignedUsers.includes(selectedUser.id)) {
          return {
            ...role,
            assignedUsers: role.assignedUsers.filter(userId => userId !== selectedUser.id)
          };
        }
        // Add user to new role
        if (role.name === newRoleName) {
          return {
            ...role,
            assignedUsers: [...role.assignedUsers, selectedUser.id]
          };
        }
        return role;
      }));

      setIsAssignDialogOpen(false);
      setSelectedUser(null);
      
      toast({
        title: "Rol asignado",
        description: `${selectedUser.name} ha sido asignado al rol ${newRoleName}`,
      });
    }
  };

  // Handle create new room
  const handleCreateRoom = async () => {
    try {
      const roomData = {
        name: newRoomData.name,
        type: newRoomData.type,
        capacity: newRoomData.capacity,
        equipment: newRoomData.equipment ? newRoomData.equipment.split(',').map(e => e.trim()) : [],
        isActive: true
      };

      const response = await fetch(`/api/admin/rooms/${currentTenant.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });

      if (!response.ok) throw new Error('Failed to create room');
      
      const newRoom = await response.json();
      setRooms(prev => [...prev, newRoom]);
      setNewRoomData({ name: '', type: 'medical', capacity: 1, location: '', equipment: '' });
      setIsRoomDialogOpen(false);
      
      toast({
        title: "Sala creada",
        description: `La sala ${newRoom.name} ha sido creada exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la sala",
        variant: "destructive",
      });
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (roomId, roomName) => {
    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete room');
      
      setRooms(prev => prev.filter(room => room.id !== roomId));
      toast({
        title: "Sala eliminada",
        description: `La sala ${roomName} ha sido eliminada del sistema`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la sala",
        variant: "destructive",
      });
    }
  };

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
            <BackButton className="mb-4" />
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
                        <Input 
                          value={newRoomData.name}
                          onChange={(e) => setNewRoomData(prev => ({...prev, name: e.target.value}))}
                          placeholder="Ej: Consulta 3" 
                        />
                      </div>
                      <div>
                        <Label>Tipo de Sala</Label>
                        <Select 
                          value={newRoomData.type}
                          onValueChange={(value) => setNewRoomData(prev => ({...prev, type: value}))}
                        >
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
                        <Input 
                          type="number" 
                          value={newRoomData.capacity}
                          onChange={(e) => setNewRoomData(prev => ({...prev, capacity: parseInt(e.target.value) || 1}))}
                          placeholder="1" 
                        />
                      </div>
                      <div>
                        <Label>Ubicación (Opcional)</Label>
                        <Input 
                          value={newRoomData.location}
                          onChange={(e) => setNewRoomData(prev => ({...prev, location: e.target.value}))}
                          placeholder="Ej: Planta Baja, Ala Sur" 
                        />
                      </div>
                      <div>
                        <Label>Equipamiento (Opcional)</Label>
                        <Input 
                          value={newRoomData.equipment}
                          onChange={(e) => setNewRoomData(prev => ({...prev, equipment: e.target.value}))}
                          placeholder="Ej: Mesa quirúrgica, Lámpara LED, Monitor" 
                        />
                      </div>
                      <Button 
                        className="w-full"
                        onClick={handleCreateRoom}
                        disabled={!newRoomData.name.trim()}
                      >
                        Crear Sala
                      </Button>
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteRoom(room.id, room.name)}
                          >
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
                    <form onSubmit={handleCreateRole} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium">Nombre del Rol *</Label>
                          <Input 
                            name="name"
                            placeholder="Ej: supervisor" 
                            required
                            value={newRoleData.name}
                            onChange={(e) => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="displayName" className="text-sm font-medium">Nombre para Mostrar *</Label>
                          <Input 
                            name="displayName"
                            placeholder="Ej: Supervisor" 
                            required
                            value={newRoleData.displayName}
                            onChange={(e) => setNewRoleData(prev => ({ ...prev, displayName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="department" className="text-sm font-medium">Departamento *</Label>
                        <Select 
                          name="department" 
                          value={newRoleData.department}
                          onValueChange={(value) => setNewRoleData(prev => ({ ...prev, department: value }))}
                        >
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
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
                        <Textarea 
                          name="description"
                          placeholder="Describe las responsabilidades de este rol"
                          value={newRoleData.description}
                          onChange={(e) => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createRoleMutation.isPending}
                      >
                        {createRoleMutation.isPending ? "Creando..." : "Crear Rol"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Roles List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Roles Disponibles</h3>
                  {(roles || []).map((role) => (
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
                          <span className="font-medium">{Array.isArray(role.permissions) ? role.permissions.length : 0}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Usuarios asignados: </span>
                          <span className="font-medium">{(users || []).filter(u => u.currentRole === role.name).length}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditRole(role)}
                          >
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAssignRole(user)}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Asignar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Edit Role Dialog */}
                <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Rol</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nombre del Rol</Label>
                        <Input 
                          value={editRoleData.name}
                          onChange={(e) => setEditRoleData(prev => ({...prev, name: e.target.value}))}
                          placeholder="Ej: recepcion" 
                        />
                      </div>
                      <div>
                        <Label>Nombre para Mostrar</Label>
                        <Input 
                          value={editRoleData.displayName}
                          onChange={(e) => setEditRoleData(prev => ({...prev, displayName: e.target.value}))}
                          placeholder="Ej: Recepción" 
                        />
                      </div>
                      <div>
                        <Label>Departamento</Label>
                        <Select 
                          value={editRoleData.department}
                          onValueChange={(value) => setEditRoleData(prev => ({...prev, department: value}))}
                        >
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
                      <div>
                        <Label>Permisos</Label>
                        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                          {[
                            { key: 'view_appointments', label: 'Ver citas' },
                            { key: 'create_appointments', label: 'Crear citas' },
                            { key: 'edit_appointments', label: 'Editar citas' },
                            { key: 'delete_appointments', label: 'Eliminar citas' },
                            { key: 'view_clients', label: 'Ver clientes' },
                            { key: 'create_clients', label: 'Crear clientes' },
                            { key: 'edit_clients', label: 'Editar clientes' },
                            { key: 'delete_clients', label: 'Eliminar clientes' },
                            { key: 'view_inventory', label: 'Ver inventario' },
                            { key: 'manage_inventory', label: 'Gestionar inventario' },
                            { key: 'view_delivery_routes', label: 'Ver rutas de entrega' },
                            { key: 'update_delivery_status', label: 'Actualizar estado de entregas' },
                            { key: 'view_billing', label: 'Ver facturación' },
                            { key: 'manage_billing', label: 'Gestionar facturación' },
                            { key: 'admin_access', label: 'Acceso administrativo' },
                            { key: 'all_permissions', label: 'Todos los permisos' }
                          ].map((permission) => (
                            <label key={permission.key} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editRoleData.permissions.includes(permission.key)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditRoleData(prev => ({
                                      ...prev, 
                                      permissions: [...prev.permissions, permission.key]
                                    }));
                                  } else {
                                    setEditRoleData(prev => ({
                                      ...prev, 
                                      permissions: prev.permissions.filter(p => p !== permission.key)
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEditedRole} className="flex-1">
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={() => setEditingRole(null)} className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Role Assignment Dialog */}
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Asignar Rol de Usuario</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                              {selectedUser.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{selectedUser.email}</div>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Seleccionar Nuevo Rol</Label>
                          <div className="space-y-2 mt-3">
                            {availableRoles.map((role) => (
                              <div
                                key={role.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                  selectedUser.currentRole === role.name 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                                onClick={() => handleSaveRoleAssignment(role.name)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {role.displayName}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {role.department} • {Array.isArray(role.permissions) ? role.permissions.length : 0} permisos
                                    </div>
                                  </div>
                                  <Badge className={getDepartmentColor(role.department)}>
                                    {role.department}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="flex-1">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
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

              {/* Edit Service Dialog */}
              <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Servicio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del Servicio</Label>
                      <Input 
                        value={editServiceData.name}
                        onChange={(e) => setEditServiceData(prev => ({...prev, name: e.target.value}))}
                        placeholder="Ej: Limpieza Dental" 
                      />
                    </div>
                    <div>
                      <Label>Tipo de Servicio</Label>
                      <Select 
                        value={editServiceData.type}
                        onValueChange={(value) => setEditServiceData(prev => ({...prev, type: value}))}
                      >
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
                        <Input 
                          type="number" 
                          value={editServiceData.duration}
                          onChange={(e) => setEditServiceData(prev => ({...prev, duration: parseInt(e.target.value) || 0}))}
                          placeholder="60" 
                        />
                      </div>
                      <div>
                        <Label>Precio (MXN)</Label>
                        <Input 
                          type="number" 
                          value={editServiceData.price}
                          onChange={(e) => setEditServiceData(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                          placeholder="350" 
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEditedService} className="flex-1">
                        Guardar Cambios
                      </Button>
                      <Button variant="outline" onClick={() => setEditingService(null)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                    <div className="text-2xl font-bold">{(rooms || []).filter(r => r.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">
                      de {(rooms || []).length} totales
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(users || []).length}</div>
                    <p className="text-xs text-muted-foreground">
                      {(roles || []).length} roles configurados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Servicios Configurados</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(services || []).length}</div>
                    <p className="text-xs text-muted-foreground">
                      Duración promedio: {(services && services.length > 0) ? Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length) : 0} min
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(services && services.length > 0) ? Math.round(services.reduce((acc, s) => acc + s.price, 0) / services.length) : 0}</div>
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
                      const typeRooms = (rooms || []).filter(r => r.type === type);
                      const percentage = (rooms && rooms.length > 0) ? Math.round((typeRooms.length / rooms.length) * 100) : 0;
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
                    {(roles || []).map((role) => (
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
                            {(users || []).filter(u => u.currentRole === role.name).length} usuarios
                          </span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ 
                                width: `${users && users.length > 0 ? Math.round(((users || []).filter(u => u.currentRole === role.name).length / users.length) * 100) : 0}%` 
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
