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
  XCircle,
  Truck,
  MapPin,
  AlertTriangle,
  Search,
  Filter,
  Grid3X3,
  List,
  X,
  Receipt,
  ShoppingCart,
  Star,
  CreditCard
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


function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  
  // Removed duplicate state declarations - defined below with proper initialization
  
  // Fetch data from database
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['/api', 'admin', 'rooms', currentTenant?.id].filter(Boolean),
    enabled: !!currentTenant?.id,
  });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api', 'admin', 'services', currentTenant?.id].filter(Boolean),
    enabled: !!currentTenant?.id,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api', 'admin', 'roles'],
  });

  // Check if current user is VetGroom developer account
  const { user } = useAuth();
  const isVetGroomDeveloper = user?.email?.includes('vetgroom') || currentTenant?.companyId === 'vetgroom-company';

  // Delivery tracking for VetGroom developers only
  const { data: activeDeliveries, refetch: refetchDeliveries } = useQuery({
    queryKey: ["/api/delivery-tracking", currentTenant?.id],
    enabled: !!currentTenant?.id && isVetGroomDeveloper,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: deliveryAlerts, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/delivery-alerts", currentTenant?.id],
    enabled: !!currentTenant?.id && isVetGroomDeveloper,
    refetchInterval: 30000,
  });

  // Fetch delivery configuration
  const { data: deliveryConfigData } = useQuery({
    queryKey: ["/api/admin/delivery-config", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Fetch current subscription information
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription/status", currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  // Fetch available subscription plans
  const { data: availablePlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/superadmin/subscription-plans"],
    enabled: !!currentTenant?.companyId,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['/api', 'staff', currentTenant?.id].filter(Boolean),
    enabled: !!currentTenant?.id,
  });

  // State management with proper types
  const [rooms, setRooms] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState({
    mode: 'wave',
    totalWaves: 3,
    pickupVans: 2,
    deliveryVans: 2,
    pickupStartTime: '08:00',
    pickupEndTime: '12:00',
    deliveryStartTime: '14:00',
    deliveryEndTime: '18:00',
    freeStartTime: '08:00',
    freeEndTime: '18:00',
  });

  useEffect(() => {
    if (roomsData) setRooms(roomsData);
    if (servicesData) setServices(servicesData);
    if (rolesData) setRoles(rolesData);
    if (staffData) setStaff(staffData);
    if (deliveryConfigData) {
      setDeliveryConfig(deliveryConfigData);
    }
  }, [roomsData, servicesData, rolesData, staffData, deliveryConfigData]);

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
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  
  // Edit states
  const [editingService, setEditingService] = useState(null);
  const [editServiceData, setEditServiceData] = useState({
    name: '',
    type: '',
    duration: 0,
    price: 0
  });

  // Filter states for services
  const [serviceFilter, setServiceFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleData, setEditRoleData] = useState({
    name: '',
    displayName: '',
    department: '',
    permissions: [] as string[]
  });


  
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffData, setEditStaffData] = useState({
    name: '',
    role: '',
    specialization: ''
  });
  
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [replacementStaffId, setReplacementStaffId] = useState('');
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    displayName: '',
    department: '',
    description: ''
  });
  
  // Subscription management state
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  
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
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/roles', 'POST', { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Rol creado",
        description: "El nuevo rol se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'admin', 'roles'] });
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

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      return apiRequest('DELETE', `/api/admin/roles/${roleId}`);
    },
    onSuccess: () => {
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'admin', 'roles'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para eliminar roles",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el rol",
        variant: "destructive",
      });
    },
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/staff', 'POST', { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Miembro del equipo creado",
        description: "El miembro del equipo ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant?.id] });
      setIsStaffDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear miembros del equipo",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el miembro del equipo",
        variant: "destructive",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest('DELETE', `/api/staff/${staffId}`);
    },
    onSuccess: () => {
      toast({
        title: "Miembro del equipo eliminado",
        description: "El miembro del equipo ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant?.id] });
      setDeletingStaff(null);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para eliminar miembros del equipo",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message?.includes('409') || error.message?.includes('APPOINTMENTS_ASSIGNED')) {
        // Staff has appointments, show replacement dialog
        return; // Don't show error toast, let the dialog handle it
      }
      
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el miembro del equipo",
        variant: "destructive",
      });
      setDeletingStaff(null);
    },
  });

  // Reassign and delete staff mutation
  const reassignStaffMutation = useMutation({
    mutationFn: async ({ staffId, newStaffId }: { staffId: string; newStaffId: string }) => {
      return apiRequest('POST', `/api/staff/${staffId}/reassign`, { newStaffId });
    },
    onSuccess: () => {
      toast({
        title: "Miembro del equipo eliminado",
        description: "Las citas han sido reasignadas y el miembro del equipo eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api', 'appointments', currentTenant?.id] });
      setDeletingStaff(null);
      setReplacementStaffId('');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para reasignar citas",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo reasignar las citas y eliminar el miembro del equipo",
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ staffId, data }: { staffId: string; data: any }) => {
      return apiRequest(`/api/staff/${staffId}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Miembro del equipo actualizado",
        description: "El miembro del equipo ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant?.id] });
      setEditingStaff(null);
      setEditStaffData({ name: '', role: '', specialization: '' });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para actualizar miembros del equipo",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el miembro del equipo",
        variant: "destructive",
      });
    },
  });

  // Handle create role
  const handleCreateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      name: formData.get('name'),
      displayName: formData.get('displayName'),
      department: formData.get('department'),
      description: formData.get('description'),
      permissions: [] // Default empty permissions array
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

  // Handle create staff
  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      name: formData.get('name'),
      role: formData.get('role'),
      specialization: formData.get('specialization') || null,
      isActive: true
    };

    if (!data.name || !data.role) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    createStaffMutation.mutate(data);
  };

  // Handle edit staff
  const handleEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    setEditStaffData({
      name: staffMember.name,
      role: staffMember.role,
      specialization: staffMember.specialization || ''
    });
  };

  // Handle save edited staff
  const handleSaveEditedStaff = () => {
    if (editingStaff) {
      updateStaffMutation.mutate({
        staffId: editingStaff.id,
        data: editStaffData
      });
    }
  };

  // Handle delete staff
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    // First try to delete directly
    try {
      await deleteStaffMutation.mutateAsync(staffId);
    } catch (error: any) {
      // If staff has appointments, show replacement dialog
      if (error.message?.includes('409') || error.message?.includes('APPOINTMENTS_ASSIGNED')) {
        const staffMember = staff?.find(s => s.id === staffId);
        setDeletingStaff(staffMember);
      }
    }
  };

  // Handle reassign and delete staff
  const handleReassignAndDelete = () => {
    if (deletingStaff && replacementStaffId) {
      reassignStaffMutation.mutate({
        staffId: deletingStaff.id,
        newStaffId: replacementStaffId
      });
    }
  };

  // Handle delete role
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el rol "${roleName}"?`)) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/admin/services/${currentTenant?.id}`, 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Servicio creado",
        description: "El nuevo servicio ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'admin', 'services', currentTenant?.id] });
      setIsServiceDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear servicios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el servicio",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: any }) => {
      return apiRequest(`/api/admin/services/${serviceId}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Servicio actualizado",
        description: "El servicio ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'admin', 'services', currentTenant?.id] });
      setEditingService(null);
      setEditServiceData({ name: '', type: '', duration: 0, price: 0 });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para actualizar servicios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el servicio",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return apiRequest('DELETE', `/api/admin/services/${serviceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'admin', 'services', currentTenant?.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para eliminar servicios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el servicio",
        variant: "destructive",
      });
    },
  });

  // Handle create service
  const handleCreateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      duration: parseInt(formData.get('duration') as string),
      price: parseFloat(formData.get('price') as string),
      isActive: true
    };

    createServiceMutation.mutate(data);
  };

  // Handle edit service
  const handleEditService = (service: any) => {
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
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        data: editServiceData
      });
    }
  };

  // Handle delete service
  const handleDeleteService = (serviceId: string, serviceName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${serviceName}"?`)) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // Delivery configuration mutation
  const updateDeliveryConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return apiRequest('/api/admin/delivery-config', 'POST', { 
        ...config, 
        tenantId: currentTenant?.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/delivery-config", currentTenant?.id] 
      });
      toast({
        title: "Configuración guardada",
        description: "La configuración de entregas ha sido actualizada exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  // Handle save delivery configuration
  const handleSaveDeliveryConfig = () => {
    updateDeliveryConfigMutation.mutate(deliveryConfig);
  };

  // Update company subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      return apiRequest(`/api/subscription/update-plan/${currentTenant?.companyId}`, 'POST', { planId });
    },
    onSuccess: () => {
      toast({
        title: "Suscripción actualizada",
        description: "El plan de suscripción ha sido cambiado exitosamente. Los cambios se aplicarán en el próximo período de facturación.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status", currentTenant?.companyId] });
      setIsSubscriptionDialogOpen(false);
      setSelectedPlan('');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para cambiar la suscripción",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la suscripción",
        variant: "destructive",
      });
    },
  });

  // Handle subscription plan change
  const handleSubscriptionChange = () => {
    if (selectedPlan && selectedPlan !== subscriptionData?.planId) {
      updateSubscriptionMutation.mutate({ planId: selectedPlan });
    }
  };

  // Seed grooming appointments for today mutation
  const seedGroomingTodayMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/seed-grooming-today/${currentTenant?.id}`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Citas de grooming generadas",
        description: `Se han creado exitosamente 30 citas de grooming para hoy en el tenant ${currentTenant?.name}`,
      });
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/appointments-fast', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats', currentTenant?.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para generar datos de prueba",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error al generar citas",
        description: error.message || "No se pudieron crear las citas de grooming",
        variant: "destructive",
      });
    },
  });

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

  // Helper function for service type colors
  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'grooming': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'vaccination': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'general': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'other': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Helper functions for service categorization
  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'medical': return '🩺';
      case 'grooming': return '✂️';
      case 'vaccination': return '💉';
      case 'general': return '👥';
      case 'other': return '🔧';
      default: return '📋';
    }
  };

  const getServiceTypeName = (type: string) => {
    switch (type) {
      case 'medical': return 'Médico';
      case 'grooming': return 'Estética';
      case 'vaccination': return 'Vacunación';
      case 'general': return 'Personal General';
      case 'other': return 'Otros';
      default: return 'Sin categoría';
    }
  };

  const getCategoryHeaderColor = (type: string) => {
    switch (type) {
      case 'medical': return 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30';
      case 'grooming': return 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30';
      case 'vaccination': return 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/30';
      case 'general': return 'border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/30';
      case 'other': return 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30';
      default: return 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-950/30';
    }
  };

  const getServiceBorderColor = (type: string) => {
    switch (type) {
      case 'medical': return 'border-l-4 border-blue-400';
      case 'grooming': return 'border-l-4 border-purple-400';
      case 'vaccination': return 'border-l-4 border-green-400';
      case 'general': return 'border-l-4 border-yellow-400';
      case 'other': return 'border-l-4 border-orange-400';
      default: return 'border-l-4 border-gray-400';
    }
  };

  // Filter services based on search term and selected category
  const filteredServices = services?.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(serviceFilter.toLowerCase()) ||
                         getServiceTypeName(service.type).toLowerCase().includes(serviceFilter.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.type === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  // Group filtered services by category
  const groupedServices = (['grooming', 'medical', 'vaccination', 'general', 'other'] as const).reduce((acc, categoryType) => {
    const categoryServices = filteredServices.filter(s => s.type === categoryType);
    if (categoryServices.length > 0) {
      acc[categoryType] = categoryServices;
    }
    return acc;
  }, {} as Record<string, any[]>);

  const totalFilteredServices = filteredServices.length;
  const hasActiveFilters = serviceFilter !== '' || selectedCategory !== 'all';

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
      
      <main className="p-6 pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <BackButton className="mb-4" />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Panel de Administración</h1>
                <p className="text-gray-600 dark:text-gray-400">Gestiona salas, roles, servicios y configuraciones para {currentTenant?.name}</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => window.location.href = '/admin/receipt-templates'}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  data-testid="button-invoice-design"
                >
                  <Receipt className="w-4 h-4" />
                  Diseño de Facturas
                </Button>
              </div>
            </div>

            {/* Store Button - Holding Cartel */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group mb-6" onClick={() => window.location.href = '/store'} data-testid="store-banner">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                      <ShoppingCart className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Tienda de Servicios Premium</h3>
                      <p className="text-blue-100 text-lg">
                        Descubre servicios avanzados: WhatsApp, SMS, Email Marketing y más
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <div className="flex items-center gap-2 text-yellow-300 mb-1">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-semibold">Servicios Profesionales</span>
                      </div>
                      <p className="text-sm text-blue-100">Integra con tus clínicas existentes</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-6 py-3 text-lg group-hover:scale-105 transition-transform"
                      data-testid="button-open-store"
                    >
                      Explorar Tienda
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className={`grid w-full ${isVetGroomDeveloper ? 'grid-cols-9' : 'grid-cols-8'}`}>
              <TabsTrigger value="rooms" className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                Salas
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Equipo
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Servicios
              </TabsTrigger>
              <TabsTrigger value="delivery-config" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Entregas
              </TabsTrigger>
              <TabsTrigger value="fraccionamientos" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Fraccionamientos
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Estadísticas
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Suscripción
              </TabsTrigger>
              {isVetGroomDeveloper && (
                <TabsTrigger value="delivery-tracking" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <Badge variant="secondary" className="ml-1 text-xs">BETA</Badge>
                  Tracking
                </TabsTrigger>
              )}
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

            {/* Staff Management Tab */}
            <TabsContent value="staff" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Equipo</h2>
                <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Miembro
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Miembro del Equipo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateStaff} className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">Nombre Completo *</Label>
                        <Input 
                          name="name"
                          placeholder="Ej: Dr. Ana García" 
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role" className="text-sm font-medium">Cargo *</Label>
                        <Select name="role" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="veterinarian">Veterinario/a</SelectItem>
                            <SelectItem value="groomer">Estilista</SelectItem>
                            <SelectItem value="technician">Técnico/a</SelectItem>
                            <SelectItem value="receptionist">Recepcionista</SelectItem>
                            <SelectItem value="assistant">Asistente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="specialization" className="text-sm font-medium">Especialización</Label>
                        <Input 
                          name="specialization"
                          placeholder="Ej: Medicina Interna, Cirugía, etc." 
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={createStaffMutation.isPending}>
                        {createStaffMutation.isPending ? 'Creando...' : 'Crear Miembro'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(staff || []).map((member) => (
                  <Card key={member.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                              {member.name ? member.name.split(' ').map(n => n[0]).join('') : '??'}
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{member.name}</CardTitle>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
                          </div>
                        </div>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {member.specialization && (
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Especialización: </span>
                            <span className="font-medium">{member.specialization}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditStaff(member)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteStaff(member.id, member.name)}
                            disabled={deleteStaffMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Edit Staff Dialog */}
              <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Miembro del Equipo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Nombre Completo</Label>
                      <Input 
                        value={editStaffData.name}
                        onChange={(e) => setEditStaffData(prev => ({...prev, name: e.target.value}))}
                        placeholder="Ej: Dr. Ana García" 
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cargo</Label>
                      <Select 
                        value={editStaffData.role}
                        onValueChange={(value) => setEditStaffData(prev => ({...prev, role: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veterinarian">Veterinario/a</SelectItem>
                          <SelectItem value="groomer">Estilista</SelectItem>
                          <SelectItem value="technician">Técnico/a</SelectItem>
                          <SelectItem value="receptionist">Recepcionista</SelectItem>
                          <SelectItem value="assistant">Asistente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Especialización</Label>
                      <Input 
                        value={editStaffData.specialization}
                        onChange={(e) => setEditStaffData(prev => ({...prev, specialization: e.target.value}))}
                        placeholder="Ej: Medicina Interna, Cirugía, etc." 
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveEditedStaff} 
                        className="flex-1"
                        disabled={updateStaffMutation.isPending}
                      >
                        {updateStaffMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingStaff(null)} 
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Staff Replacement Dialog */}
              <Dialog open={!!deletingStaff} onOpenChange={() => { setDeletingStaff(null); setReplacementStaffId(''); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reasignar Citas del Personal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>{deletingStaff?.name}</strong> tiene citas asignadas. 
                      Selecciona a quién se reasignarán sus citas antes de eliminarlo del equipo.
                    </p>
                    <div>
                      <Label className="text-sm font-medium">Reasignar citas a:</Label>
                      <Select value={replacementStaffId} onValueChange={setReplacementStaffId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar miembro del equipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff?.filter(s => s.id !== deletingStaff?.id && s.isActive).map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleReassignAndDelete} 
                        className="flex-1"
                        disabled={!replacementStaffId || reassignStaffMutation.isPending}
                      >
                        {reassignStaffMutation.isPending ? 'Reasignando...' : 'Reasignar y Eliminar'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => { setDeletingStaff(null); setReplacementStaffId(''); }} 
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteRole(role.id, role.displayName)}
                            disabled={deleteRoleMutation.isPending}
                          >
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
                                  {user.name ? user.name.split(' ').map(n => n[0]).join('') : '??'}
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
                              {selectedUser.name ? selectedUser.name.split(' ').map(n => n[0]).join('') : '??'}
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
              <div className="flex flex-col lg:flex-row gap-4 lg:justify-between lg:items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Configuración de Servicios</h2>
                  {totalFilteredServices !== services?.length && (
                    <p className="text-sm text-gray-500 mt-1">
                      Mostrando {totalFilteredServices} de {services?.length || 0} servicios
                      {hasActiveFilters && ' (filtrado)'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="px-3"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
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
                    <form onSubmit={handleCreateService} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre del Servicio *</Label>
                        <Input 
                          name="name"
                          placeholder="Ej: Limpieza Dental" 
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Tipo de Servicio *</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grooming">Estética/Grooming</SelectItem>
                            <SelectItem value="medical">Médico</SelectItem>
                            <SelectItem value="vaccination">Vacunación</SelectItem>
                            <SelectItem value="general">Personal General</SelectItem>
                            <SelectItem value="other">Otros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="duration">Duración (minutos) *</Label>
                          <Input 
                            name="duration"
                            type="number" 
                            placeholder="60" 
                            required
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Precio (MXN) *</Label>
                          <Input 
                            name="price"
                            type="number" 
                            placeholder="350" 
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createServiceMutation.isPending}>
                        {createServiceMutation.isPending ? 'Creando...' : 'Crear Servicio'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>

              {/* Filter Controls */}
              <Card className="bg-gray-50/50 dark:bg-gray-900/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Buscar servicios por nombre o tipo..."
                          value={serviceFilter}
                          onChange={(e) => setServiceFilter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="w-full sm:w-48">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          <SelectItem value="grooming">Estética/Grooming</SelectItem>
                          <SelectItem value="medical">Médico</SelectItem>
                          <SelectItem value="vaccination">Vacunación</SelectItem>
                          <SelectItem value="general">Personal General</SelectItem>
                          <SelectItem value="other">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setServiceFilter('');
                          setSelectedCategory('all');
                        }}
                        className="whitespace-nowrap"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Servicios Configurados por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Show filtered results or all services */}
                    {viewMode === 'list' ? (
                      /* List View - Categorized */
                      <div className="space-y-8">
                        {Object.entries(groupedServices).map(([categoryType, categoryServices]) => (
                          <div key={categoryType} className="space-y-4">
                            {/* Category Header */}
                            <div className={`flex items-center gap-3 pb-3 border-b ${getCategoryHeaderColor(categoryType)}`}>
                              <span className="text-2xl">{getServiceIcon(categoryType)}</span>
                              <h3 className="text-lg font-bold">{getServiceTypeName(categoryType)}</h3>
                              <Badge variant="secondary" className={getRoomTypeColor(categoryType)}>
                                {categoryServices.length} servicio{categoryServices.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            {/* Services in this category */}
                            <div className="grid gap-4">
                              {categoryServices.map((service) => (
                                <div key={service.id} className={`flex items-center justify-between p-4 ${getServiceBorderColor(categoryType)} ${getCategoryHeaderColor(categoryType)} rounded-lg`}>
                                  <div className="flex items-center gap-4">
                                    <span className="text-lg">{getServiceIcon(service.type)}</span>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{service.name}</h4>
                                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        <span>⏱️ {service.duration} min</span>
                                        <span>💰 ${service.price} MXN</span>
                                        <Badge className={getRoomTypeColor(service.type)}>
                                          {getServiceTypeName(service.type)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditService(service)}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Editar
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => handleDeleteService(service.id, service.name)}
                                      disabled={deleteServiceMutation.isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Grid View - File Explorer Style */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredServices.map((service) => (
                          <div key={service.id} className={`p-4 ${getServiceBorderColor(service.type)} ${getCategoryHeaderColor(service.type)} rounded-lg hover:shadow-md transition-shadow group`}>
                            {/* Service Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{getServiceIcon(service.type)}</span>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{service.name}</h4>
                                  <Badge size="sm" className={getRoomTypeColor(service.type)}>
                                    {getServiceTypeName(service.type)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Service Details */}
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>{service.duration} minutos</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="text-green-600 font-semibold">${service.price} MXN</span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditService(service)}>
                                <Edit className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteService(service.id, service.name)}
                                disabled={deleteServiceMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty States */}
                    {totalFilteredServices === 0 && hasActiveFilters && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-lg font-medium mb-2">No se encontraron servicios</p>
                        <p className="text-sm mb-4">Intenta ajustar los filtros de búsqueda</p>
                        <Button variant="outline" onClick={() => { setServiceFilter(''); setSelectedCategory('all'); }}>
                          Limpiar filtros
                        </Button>
                      </div>
                    )}
                    
                    {(!services || services.length === 0) && !hasActiveFilters && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="text-lg font-medium mb-2">No hay servicios configurados</p>
                        <p className="text-sm">Agregue su primer servicio usando el botón "Nuevo Servicio"</p>
                      </div>
                    )}
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
                      <Label>Categoría de Servicio</Label>
                      <Select 
                        value={editServiceData.type}
                        onValueChange={(value) => setEditServiceData(prev => ({...prev, type: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grooming">Estética/Grooming</SelectItem>
                          <SelectItem value="medical">Médico</SelectItem>
                          <SelectItem value="vaccination">Vacunación</SelectItem>
                          <SelectItem value="general">Personal General</SelectItem>
                          <SelectItem value="other">Otros</SelectItem>
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
                      <Button 
                        onClick={handleSaveEditedService} 
                        className="flex-1"
                        disabled={updateServiceMutation.isPending}
                      >
                        {updateServiceMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingService(null)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Delivery Configuration Tab */}
            <TabsContent value="delivery-config" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Configuración de Entregas</h2>
                  <p className="text-gray-600 dark:text-gray-400">Configura el sistema de entregas, waves y vanes para tu negocio</p>
                </div>
                <Button 
                  onClick={handleSaveDeliveryConfig} 
                  disabled={updateDeliveryConfigMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {updateDeliveryConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Delivery Mode Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Modo de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Tipo de Programación</Label>
                      <Select 
                        value={deliveryConfig.mode} 
                        onValueChange={(value) => setDeliveryConfig(prev => ({ ...prev, mode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wave">Programación por Waves (Horarios fijos)</SelectItem>
                          <SelectItem value="free">Selección Libre (Cualquier hora)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {deliveryConfig.mode === 'wave' 
                          ? 'Entregas organizadas en waves de horarios fijos'
                          : 'Entregas flexibles en cualquier horario disponible'
                        }
                      </p>
                    </div>

                    {deliveryConfig.mode === 'wave' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Número Total de Waves</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            max="20"
                            value={deliveryConfig.totalWaves}
                            onChange={(e) => setDeliveryConfig(prev => ({ 
                              ...prev, 
                              totalWaves: parseInt(e.target.value) || 1 
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Ejemplo: 10 waves = Wave 1, Wave 2, ..., Wave 10
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Horario de Recogida</Label>
                            <div className="space-y-2">
                              <Input 
                                type="time" 
                                value={deliveryConfig.pickupStartTime}
                                onChange={(e) => setDeliveryConfig(prev => ({ 
                                  ...prev, 
                                  pickupStartTime: e.target.value 
                                }))}
                              />
                              <Input 
                                type="time" 
                                value={deliveryConfig.pickupEndTime}
                                onChange={(e) => setDeliveryConfig(prev => ({ 
                                  ...prev, 
                                  pickupEndTime: e.target.value 
                                }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Horario de Entrega</Label>
                            <div className="space-y-2">
                              <Input 
                                type="time" 
                                value={deliveryConfig.deliveryStartTime}
                                onChange={(e) => setDeliveryConfig(prev => ({ 
                                  ...prev, 
                                  deliveryStartTime: e.target.value 
                                }))}
                              />
                              <Input 
                                type="time" 
                                value={deliveryConfig.deliveryEndTime}
                                onChange={(e) => setDeliveryConfig(prev => ({ 
                                  ...prev, 
                                  deliveryEndTime: e.target.value 
                                }))}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {deliveryConfig.mode === 'free' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Hora Inicio</Label>
                          <Input 
                            type="time" 
                            value={deliveryConfig.freeStartTime}
                            onChange={(e) => setDeliveryConfig(prev => ({ 
                              ...prev, 
                              freeStartTime: e.target.value 
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Hora Fin</Label>
                          <Input 
                            type="time" 
                            value={deliveryConfig.freeEndTime}
                            onChange={(e) => setDeliveryConfig(prev => ({ 
                              ...prev, 
                              freeEndTime: e.target.value 
                            }))}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Van Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Configuración de Vanes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Vanes para Recogida</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={deliveryConfig.pickupVans}
                        onChange={(e) => setDeliveryConfig(prev => ({ 
                          ...prev, 
                          pickupVans: parseInt(e.target.value) || 1 
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Número de vehículos disponibles para recoger mascotas
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Vanes para Entrega</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        value={deliveryConfig.deliveryVans}
                        onChange={(e) => setDeliveryConfig(prev => ({ 
                          ...prev, 
                          deliveryVans: parseInt(e.target.value) || 1 
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Número de vehículos disponibles para entregar mascotas
                      </p>
                    </div>

                    {/* Van Capacity Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Capacidades por Van</h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <div>🚐 <strong>Pequeño:</strong> 8 mascotas</div>
                        <div>🚚 <strong>Mediano:</strong> 15 mascotas</div>
                        <div>🚛 <strong>Grande:</strong> 25 mascotas</div>
                      </div>
                    </div>

                    {/* Van Configuration Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => window.location.href = '/admin/van-config'}
                        className="w-full flex items-center gap-2"
                        variant="outline"
                      >
                        <Truck className="w-4 h-4" />
                        Configurar Vanes y Jaulas
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Gestiona el diseño de jaulas, capacidades y configuración avanzada de vanes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuration Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Resumen de Configuración
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {deliveryConfig.mode === 'wave' ? deliveryConfig.totalWaves : '∞'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {deliveryConfig.mode === 'wave' ? 'Waves Configurados' : 'Horarios Disponibles'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {deliveryConfig.pickupVans}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Vanes de Recogida</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {deliveryConfig.deliveryVans}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Vanes de Entrega</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fraccionamientos Tab */}
            <TabsContent value="fraccionamientos" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Gestión de Fraccionamientos
                </h2>
                <Button 
                  onClick={() => window.location.href = '/admin/fraccionamientos'}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-open-fraccionamientos"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Abrir Editor Completo
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Configuración de Fraccionamientos
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestiona los fraccionamientos y sus configuraciones de peso para optimizar las rutas de entrega.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-lg font-medium mb-2">Editor de Fraccionamientos</p>
                    <p className="text-sm mb-4">
                      Utiliza el editor completo para gestionar fraccionamientos, configurar pesos y coordenadas.
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/admin/fraccionamientos'}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
                    >
                      Abrir Editor de Fraccionamientos
                    </Button>
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

            {/* Subscription Management Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CreditCard className="w-6 h-6" />
                    Gestión de Suscripción
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">Administra el plan de suscripción de tu clínica</p>
                </div>
              </div>

              {subscriptionLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Cargando información de suscripción...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Subscription Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Suscripción Actual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {subscriptionData?.hasSubscription ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Plan Actual</p>
                              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                {subscriptionData.plan}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                              <Badge 
                                className={`${
                                  subscriptionData.status === 'active' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : subscriptionData.status === 'trial'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}
                              >
                                {subscriptionData.status === 'active' && 'Activa'}
                                {subscriptionData.status === 'trial' && 'Período de Prueba'}
                                {subscriptionData.status === 'cancelled' && 'Cancelada'}
                                {subscriptionData.status === 'suspended' && 'Suspendida'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Días Restantes</p>
                              <p className="text-lg font-semibold">
                                {subscriptionData.daysRemaining > 0 
                                  ? `${subscriptionData.daysRemaining} días`
                                  : 'Vencida'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Renovación</p>
                              <p className="text-lg font-semibold">
                                {new Date(subscriptionData.expiresAt).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Clínicas Utilizadas</p>
                              <p className="text-lg font-semibold">
                                {subscriptionData.vetsitesUsed} / {subscriptionData.vetsitesAllowed}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Utilización</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ 
                                      width: `${Math.min(100, (subscriptionData.vetsitesUsed / subscriptionData.vetsitesAllowed) * 100)}%` 
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {Math.round((subscriptionData.vetsitesUsed / subscriptionData.vetsitesAllowed) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {subscriptionData.daysRemaining <= 7 && subscriptionData.daysRemaining > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-950 dark:border-orange-800">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Suscripción por Vencer</h4>
                                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                    Tu suscripción vence en {subscriptionData.daysRemaining} días. Contacta a soporte para renovar.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {subscriptionData.daysRemaining <= 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-950 dark:border-red-800">
                              <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-red-900 dark:text-red-100">Suscripción Vencida</h4>
                                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    Tu suscripción ha vencido. Contacta a soporte inmediatamente para renovar y evitar interrupciones del servicio.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">Sin Suscripción</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            No hay una suscripción activa para esta clínica
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Change Subscription Plan */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Cambiar Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!plansLoading && availablePlans ? (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Selecciona un nuevo plan para tu clínica. Los cambios se aplicarán en el próximo período de facturación.
                          </p>
                          
                          <div className="space-y-3">
                            {availablePlans.map((plan: any) => (
                              <div 
                                key={plan.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                  selectedPlan === plan.id 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                                    : subscriptionData?.planId === plan.id
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                                }`}
                                onClick={() => setSelectedPlan(plan.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        {plan.displayName}
                                      </h4>
                                      {subscriptionData?.planId === plan.id && (
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                          Actual
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {plan.description}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2">
                                      <p className="text-sm font-medium">
                                        Hasta {plan.maxTenants} clínicas
                                      </p>
                                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        ${plan.monthlyPrice.toLocaleString()} MXN/mes
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        ${plan.yearlyPrice.toLocaleString()} MXN/año
                                      </p>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className={`w-4 h-4 rounded-full border-2 ${
                                      selectedPlan === plan.id 
                                        ? 'border-blue-500 bg-blue-500'
                                        : subscriptionData?.planId === plan.id
                                        ? 'border-green-500 bg-green-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full mt-4"
                                disabled={!selectedPlan || selectedPlan === subscriptionData?.planId}
                                onClick={() => setIsSubscriptionDialogOpen(true)}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Cambiar Plan de Suscripción
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar Cambio de Suscripción</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  ¿Estás seguro de que quieres cambiar tu plan de suscripción?
                                </p>
                                
                                {selectedPlan && availablePlans && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
                                    <div className="flex items-start gap-3">
                                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Nuevo Plan</h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                          {availablePlans.find((p: any) => p.id === selectedPlan)?.displayName}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          Los cambios se aplicarán en el próximo período de facturación.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-3 pt-4">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setIsSubscriptionDialogOpen(false)}
                                    className="flex-1"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button 
                                    onClick={handleSubscriptionChange}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={updateSubscriptionMutation.isPending}
                                  >
                                    {updateSubscriptionMutation.isPending ? (
                                      <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                        Procesando...
                                      </>
                                    ) : (
                                      'Confirmar Cambio'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">Cargando planes disponibles...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Delivery Tracking Tab - VetGroom Developer Only */}
            {isVetGroomDeveloper && (
              <TabsContent value="delivery-tracking" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Truck className="w-6 h-6" />
                      Seguimiento de Entregas
                      <Badge variant="secondary" className="text-xs">BETA</Badge>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Monitoreo en tiempo real exclusivo para desarrolladores VetGroom
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Active Deliveries */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Entregas Activas ({activeDeliveries?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeDeliveries?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay entregas activas en este momento
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeDeliveries?.map((delivery: any) => (
                            <div key={delivery.id} className="border rounded-lg p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{delivery.vanName}</div>
                                  <div className="text-sm text-gray-600">{delivery.driverName}</div>
                                </div>
                                <Badge className={`${
                                  delivery.status === 'en_route' ? 'bg-green-100 text-green-800' :
                                  delivery.status === 'delayed' ? 'bg-yellow-100 text-yellow-800' :
                                  delivery.status === 'emergency' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {delivery.status === 'en_route' ? 'En Ruta' :
                                   delivery.status === 'delayed' ? 'Retrasado' :
                                   delivery.status === 'emergency' ? 'Emergencia' :
                                   'Preparando'}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <div>Ruta: {delivery.route?.name}</div>
                                <div>Paradas: {delivery.route?.completedStops || 0} / {delivery.route?.totalStops || 0}</div>
                              </div>

                              {delivery.estimatedReturnTime && (
                                <div className="text-sm">
                                  <span className="text-gray-600">Retorno estimado: </span>
                                  <span className="font-medium">
                                    {new Date(delivery.estimatedReturnTime).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery Alerts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Alertas de Entrega ({deliveryAlerts?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {deliveryAlerts?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay alertas activas
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {deliveryAlerts?.map((alert: any) => (
                            <div key={alert.id} className="border rounded-lg p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{alert.title}</div>
                                  <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                                </div>
                                <Badge className={`ml-2 ${
                                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {alert.severity === 'critical' ? 'Crítico' :
                                   alert.severity === 'high' ? 'Alto' :
                                   alert.severity === 'medium' ? 'Medio' : 'Bajo'}
                                </Badge>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                {new Date(alert.createdAt).toLocaleString()}
                              </div>

                              {!alert.isResolved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={() => {
                                    // Resolve alert functionality would go here
                                    toast({
                                      title: "Funcionalidad BETA",
                                      description: "Resolución de alertas disponible próximamente",
                                    });
                                  }}
                                >
                                  Resolver
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Developer Demo Data Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Datos de Prueba para Entregas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Genera citas completadas de grooming para hoy para probar la optimización de rutas de entrega.
                    </p>
                    
                    <Button
                      onClick={() => {
                        const mutation = seedGroomingTodayMutation;
                        mutation.mutate();
                      }}
                      disabled={seedGroomingTodayMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-seed-grooming-today"
                    >
                      {seedGroomingTodayMutation.isPending ? (
                        "Generando..."
                      ) : (
                        "Generar 30 Citas de Grooming Hoy"
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500">
                      Crea 30 citas completadas y pagadas distribuidas en diferentes fraccionamientos para optimización VRP.
                    </p>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 text-lg">ℹ️</div>
                    <div>
                      <h3 className="font-medium text-blue-900">Funcionalidad BETA - Solo Desarrolladores</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Esta funcionalidad está restringida a cuentas de desarrollador VetGroom para pruebas y validación. 
                        El sistema incluye monitoreo automático cada 5 minutos con alertas WhatsApp y gestión escalada de emergencias.
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Optimizado para 1000+ tenants con procesamiento por lotes y arquitectura escalable.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Apply comprehensive dark theme wrapper for Admin page
const AdminPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Admin />
    </div>
  );
};

export default AdminPage;
