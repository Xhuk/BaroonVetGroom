import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  FileText,
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
  CreditCard,
  Calendar,
  DollarSign,
  Download,
  Calculator,
  Printer,
  Building,
  Copy,
  MessageCircle
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

  // Check if current user is VetGroom developer account or demo user
  const { user } = useAuth();
  const isVetGroomDeveloper = user?.email?.includes('vetgroom') || currentTenant?.companyId === 'vetgroom-company';
  const isDemoUser = user?.email?.includes('@fergon-demo.com') || user?.email?.includes('demo');

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

  // Fetch available subscription plans - use appropriate endpoint
  const plansEndpoint = isDemoUser ? "/api/demo/subscription-plans" : "/api/superadmin/subscription-plans";
  const { data: availablePlans, isLoading: plansLoading } = useQuery({
    queryKey: [plansEndpoint],
    enabled: !!currentTenant?.companyId,
    select: (data) => isDemoUser ? data?.plans : data,
  });

  const { data: staffData, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['/api', 'staff', currentTenant?.id].filter(Boolean),
    enabled: !!currentTenant?.id,
  });

  // Fetch tenant users from database
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users', currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // State management with proper types
  const [activeSection, setActiveSection] = useState('rooms');
  const [shiftTabActive, setShiftTabActive] = useState('board');
  
  // Shift management state
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{staffId: string, dayIndex: number, current: string} | null>(null);
  const [isCalendarShareOpen, setIsCalendarShareOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
    if (staffData) {
      setStaff(staffData);
    }
    if (usersData) setUsers(usersData);
    if (deliveryConfigData) {
      setDeliveryConfig(deliveryConfigData);
    }
  }, [currentTenant?.id, roomsData, servicesData, rolesData, staffData, usersData, deliveryConfigData]);



  // Dialog states
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  
  // Payroll configuration state
  const [isPayrollConfigOpen, setIsPayrollConfigOpen] = useState(false);
  const [isEmployeePayrollOpen, setIsEmployeePayrollOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [payrollSettings, setPayrollSettings] = useState({
    isrEnabled: true,
    imssEnabled: true,
    infonavitEnabled: false,
    fonacotEnabled: false,
    paymentFrequency: 'monthly',
    imssEmployeePercentage: '2.375',
    imssEmployerPercentage: '10.525',
    infonavitPercentage: '0'
  });
  
  // Employee payroll form state
  const [employeePayrollData, setEmployeePayrollData] = useState({
    basicSalary: '',
    paymentFrequency: 'monthly',
    isrEnabled: true,
    imssEnabled: true,
    imssEmployeePercentage: '2.375',
    imssEmployerPercentage: '10.525',
    infonavitEnabled: false,
    infonavitPercentage: '0',
    fonacotEnabled: false,
    fonacotAmount: '0'
  });
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);

  // Calculate ISR tax based on monthly salary
  const calculateISR = (monthlySalary: number) => {
    const annualSalary = monthlySalary * 12;
    if (annualSalary <= 125900) return 0;
    if (annualSalary <= 212300) return (annualSalary - 125900) * 0.0640 / 12;
    if (annualSalary <= 426400) return ((annualSalary - 212300) * 0.1088 + 5529.20) / 12;
    if (annualSalary <= 639600) return ((annualSalary - 426400) * 0.1600 + 28665.44) / 12;
    if (annualSalary <= 766800) return ((annualSalary - 639600) * 0.2112 + 62817.28) / 12;
    if (annualSalary <= 1838800) return ((annualSalary - 766800) * 0.2352 + 89670.40) / 12;
    return ((annualSalary - 1838800) * 0.30 + 341876.32) / 12;
  };

  // Generate PDF payslip
  const generatePayslipPDF = () => {
    if (!selectedEmployee) return;
    
    const doc = new jsPDF();
    const basicSalary = parseFloat(employeePayrollData.basicSalary || '0');
    const isrDeduction = (payrollSettings.isrEnabled && employeePayrollData.isrEnabled) ? 
      calculateISR(basicSalary) : 0;
    const imssDeduction = (payrollSettings.imssEnabled && employeePayrollData.imssEnabled) ? 
      (basicSalary * parseFloat(employeePayrollData.imssEmployeePercentage)) / 100 : 0;
    const infonavitDeduction = employeePayrollData.infonavitEnabled ? 
      (basicSalary * parseFloat(employeePayrollData.infonavitPercentage)) / 100 : 0;
    const fonacotDeduction = employeePayrollData.fonacotEnabled ? 
      parseFloat(employeePayrollData.fonacotAmount || '0') : 0;
    const totalDeductions = isrDeduction + imssDeduction + infonavitDeduction + fonacotDeduction;
    const netSalary = basicSalary - totalDeductions;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE NÓMINA', 105, 25, { align: 'center' });
    
    // Company Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentTenant?.companyName || 'Veterinaria'}`, 20, 45);
    doc.text('RFC: VET123456ABC', 20, 52);
    doc.text('Calle Principal 123, Ciudad', 20, 59);
    
    // Receipt Info
    const receiptNumber = `NOM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${selectedEmployee.id?.slice(-4)}`;
    doc.text(`N° DE RECIBO: ${receiptNumber}`, 140, 45);
    doc.text(`FECHA: ${new Date().toLocaleDateString('es-MX')}`, 140, 52);
    doc.text(`PERÍODO: ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, 140, 59);
    
    // Employee Info
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLEADO:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${selectedEmployee.name}`, 20, 82);
    doc.text(`Puesto: ${selectedEmployee.role}`, 20, 89);
    doc.text(`ID: ${selectedEmployee.id}`, 20, 96);
    
    // Work Period Info
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO DE TRABAJO:', 140, 75);
    doc.setFont('helvetica', 'normal');
    doc.text('Días trabajados: 30', 140, 82);
    doc.text('Horas trabajadas: 240', 140, 89);
    doc.text('Faltas: 0', 140, 96);
    
    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTO', 20, 115);
    doc.text('PERCEPCIÓN', 120, 115);
    doc.text('DEDUCCIÓN', 160, 115);
    doc.line(20, 118, 190, 118);
    
    // Table Content
    let yPos = 125;
    doc.setFont('helvetica', 'normal');
    
    // Base Salary
    doc.text('Salario Base Mensual', 20, yPos);
    doc.text(`$${basicSalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 120, yPos);
    doc.text('-', 160, yPos);
    yPos += 7;
    
    // ISR
    if (payrollSettings.isrEnabled && employeePayrollData.isrEnabled) {
      doc.text('ISR (Impuesto Sobre la Renta)', 20, yPos);
      doc.text('-', 120, yPos);
      doc.text(`$${isrDeduction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 160, yPos);
      yPos += 7;
    }
    
    // IMSS
    if (payrollSettings.imssEnabled && employeePayrollData.imssEnabled) {
      doc.text(`IMSS (Seguro Social) - ${employeePayrollData.imssEmployeePercentage}%`, 20, yPos);
      doc.text('-', 120, yPos);
      doc.text(`$${imssDeduction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 160, yPos);
      yPos += 7;
    }
    
    // Infonavit
    if (employeePayrollData.infonavitEnabled && parseFloat(employeePayrollData.infonavitPercentage) > 0) {
      doc.text(`Infonavit - ${employeePayrollData.infonavitPercentage}%`, 20, yPos);
      doc.text('-', 120, yPos);
      doc.text(`$${infonavitDeduction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 160, yPos);
      yPos += 7;
    }
    
    // Fonacot
    if (employeePayrollData.fonacotEnabled && parseFloat(employeePayrollData.fonacotAmount) > 0) {
      doc.text('Fonacot (Crédito)', 20, yPos);
      doc.text('-', 120, yPos);
      doc.text(`$${fonacotDeduction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 160, yPos);
      yPos += 7;
    }
    
    // Additional Deductions
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('OTRAS DEDUCCIONES:', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('• Faltas / Incidencias', 25, yPos);
    doc.text('-', 120, yPos);
    doc.text('$0.00', 160, yPos);
    yPos += 7;
    doc.text('• Retardos', 25, yPos);
    doc.text('-', 120, yPos);
    doc.text('$0.00', 160, yPos);
    yPos += 7;
    doc.text('• Préstamos de empresa', 25, yPos);
    doc.text('-', 120, yPos);
    doc.text('$0.00', 160, yPos);
    yPos += 7;
    doc.text('• Uniformes / Equipo', 25, yPos);
    doc.text('-', 120, yPos);
    doc.text('$0.00', 160, yPos);
    
    // Summary
    yPos += 15;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PERCEPCIONES:', 20, yPos);
    doc.text(`$${basicSalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 120, yPos);
    yPos += 7;
    
    doc.text('TOTAL DEDUCCIONES:', 20, yPos);
    doc.text(`$${totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 160, yPos);
    yPos += 7;
    
    doc.setFontSize(12);
    doc.text('NETO A PAGAR:', 20, yPos);
    doc.text(`$${netSalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 140, yPos);
    
    // Footer
    yPos += 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Este recibo cumple con las disposiciones fiscales vigentes', 105, yPos, { align: 'center' });
    doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')} - Sistema VetGroom`, 105, yPos + 7, { align: 'center' });
    
    // Download PDF
    const fileName = `Recibo_${selectedEmployee.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 7)}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "PDF Generado",
      description: `Recibo de nómina descargado: ${fileName}`,
    });
  };

  // Save employee payroll configuration
  const handleSaveEmployeePayroll = async () => {
    if (!selectedEmployee) return;
    
    setIsSavingPayroll(true);
    try {
      const response = await fetch(`/api/staff/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicSalary: employeePayrollData.basicSalary,
          paymentFrequency: employeePayrollData.paymentFrequency,
          isrEnabled: employeePayrollData.isrEnabled,
          imssEnabled: employeePayrollData.imssEnabled,
          imssEmployeePercentage: employeePayrollData.imssEmployeePercentage,
          imssEmployerPercentage: employeePayrollData.imssEmployerPercentage,
          infonavitEnabled: employeePayrollData.infonavitEnabled,
          infonavitPercentage: employeePayrollData.infonavitPercentage,
          fonacotEnabled: employeePayrollData.fonacotEnabled,
          fonacotAmount: employeePayrollData.fonacotAmount,
        })
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
        toast({
          title: "Configuración guardada",
          description: `Configuración de nómina actualizada para ${selectedEmployee.name}`,
        });
        setIsEmployeePayrollOpen(false);
      } else {
        throw new Error('Error al guardar la configuración');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de nómina",
        variant: "destructive"
      });
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
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
  
  // Salary configuration dialog state
  const [isSalaryConfigOpen, setIsSalaryConfigOpen] = useState(false);
  const [showAdvancedCalculations, setShowAdvancedCalculations] = useState(false);
  const [salaryConfigData, setSalaryConfigData] = useState({
    basicSalary: 0,
    // ISR (Impuesto Sobre la Renta)
    isrEnabled: true,
    isrPercentage: 0, // Calculated based on salary brackets
    // IMSS (Instituto Mexicano del Seguro Social)
    imssEnabled: true,
    imssEmployeePercentage: 2.375, // 2.375% employee contribution
    imssEmployerPercentage: 10.525, // 10.525% employer contribution
    // Infonavit
    infonavitEnabled: false,
    infonavitPercentage: 5.0, // Max 5% of salary
    // Fonacot
    fonacotEnabled: false,
    fonacotAmount: 0,
    // Other deductions
    otherDeductions: []
  });
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    displayName: '',
    department: '',
    description: ''
  });

  // New user data
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: ''
  });

  // Drag and drop state
  const [draggedUser, setDraggedUser] = useState<any>(null);
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);

  // Bulk assignment state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkRoleId, setBulkRoleId] = useState<string>('');  
  const [roleFilter, setRoleFilter] = useState<string>('all');


  // Core consolidated roles for the veterinary clinic
  const CORE_ROLES = [
    { id: 'tenant_admin', name: 'Administrador', department: 'admin', color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' },
    { id: 'veterinario', name: 'Personal Médico', department: 'medical', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700' },
    { id: 'recepcionista', name: 'Recepción', department: 'reception', color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' },
    { id: 'groomer', name: 'Servicios', department: 'services', color: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700' }
  ];
  
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

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/users', 'POST', { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El nuevo usuario ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', currentTenant?.id] });
      setIsUserDialogOpen(false);
      setNewUserData({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear usuarios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return apiRequest(`/api/admin/users/${userId}/role`, 'PUT', { 
        tenantId: currentTenant?.id, 
        roleId 
      });
    },
    onSuccess: () => {
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', currentTenant?.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para actualizar roles",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el rol del usuario",
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

  // Handle create user
  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
      roleId: formData.get('roleId')
    };

    if (!data.firstName || !data.email || !data.password || !data.roleId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(data);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, user: any) => {
    setDraggedUser(user);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, roleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRole(roleId);
  };

  const handleDragLeave = () => {
    setDragOverRole(null);
  };

  const handleDrop = (e: React.DragEvent, roleId: string) => {
    e.preventDefault();
    setDragOverRole(null);
    
    if (draggedUser && draggedUser.roleId !== roleId) {
      updateUserRoleMutation.mutate({
        userId: draggedUser.id,
        roleId: roleId
      });
    }
    setDraggedUser(null);
  };

  const handleDragEnd = () => {
    setDraggedUser(null);
    setDragOverRole(null);
  };

  // Bulk assignment handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const filteredUsers = roleFilter === 'all' ? users : users.filter(user => user.roleId === roleFilter);
    const allSelected = filteredUsers.every(user => selectedUsers.includes(user.id));
    
    if (allSelected) {
      // Deselect all filtered users
      setSelectedUsers(prev => prev.filter(id => !filteredUsers.map(u => u.id).includes(id)));
    } else {
      // Select all filtered users
      setSelectedUsers(prev => [...new Set([...prev, ...filteredUsers.map(u => u.id)])]);
    }
  };

  const handleBulkRoleAssignment = () => {
    if (selectedUsers.length === 0 || !bulkRoleId) {
      toast({
        title: "Error",
        description: "Selecciona usuarios y un rol para la asignación masiva",
        variant: "destructive"
      });
      return;
    }

    // Apply role changes to all selected users
    selectedUsers.forEach(userId => {
      updateUserRoleMutation.mutate({ userId, roleId: bulkRoleId });
    });

    setSelectedUsers([]);
    setBulkRoleId('');
  };

  // Filter users based on role filter
  const filteredUsers = roleFilter === 'all' ? users : users.filter(user => user.roleId === roleFilter);

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


  // Force modal open with useEffect
  useEffect(() => {
    if (selectedEmployee && !isSalaryConfigOpen) {
      setIsSalaryConfigOpen(true);
    }
  }, [selectedEmployee, isSalaryConfigOpen]);

  // Simple basic salary edit modal state
  const [isBasicSalaryEditOpen, setIsBasicSalaryEditOpen] = useState(false);
  const [basicSalaryEdit, setBasicSalaryEdit] = useState({ basicSalary: 0, employee: null });

  // Handle open basic salary edit
  const handleOpenBasicSalaryEdit = (employee: any) => {
    setBasicSalaryEdit({
      basicSalary: parseFloat(employee.basicSalary) || 15000,
      employee: employee
    });
    setIsBasicSalaryEditOpen(true);
  };

  // Handle save salary configuration
  const handleSaveSalaryConfig = async () => {
    if (selectedEmployee && currentTenant) {
      try {
        // Prepare salary configuration data
        const salaryConfigUpdate = {
          basicSalary: salaryConfigData.basicSalary.toString(),
          isrEnabled: salaryConfigData.isrEnabled,
          imssEnabled: salaryConfigData.imssEnabled,
          imssEmployeePercentage: salaryConfigData.imssEmployeePercentage.toString(),
          imssEmployerPercentage: salaryConfigData.imssEmployerPercentage.toString(),
          infonavitEnabled: salaryConfigData.infonavitEnabled,
          infonavitPercentage: salaryConfigData.infonavitPercentage.toString(),
          fonacotEnabled: salaryConfigData.fonacotEnabled,
          fonacotAmount: salaryConfigData.fonacotAmount.toString(),
        };

        // Update staff salary configuration via API
        const response = await fetch(`/api/staff/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(salaryConfigUpdate),
        });

        if (!response.ok) {
          throw new Error('Failed to update salary configuration');
        }

        // Refetch staff data to update the UI
        refetchStaff();

        toast({
          title: "Configuración salarial guardada",
          description: `Configuración de retenciones para ${selectedEmployee.name} actualizada exitosamente`,
        });
        
        setIsSalaryConfigOpen(false);
        setSelectedEmployee(null);
      } catch (error) {
        console.error('Error saving salary configuration:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la configuración salarial. Intenta de nuevo.",
          variant: "destructive",
        });
      }
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

          {/* New Navigation System - All Options Visible */}
          <div className="w-full mt-8">
            {/* Navigation Buttons */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <button
                onClick={() => setActiveSection('rooms')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'rooms'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <DoorOpen className="w-4 h-4" />
                Salas
              </button>
              <button
                onClick={() => setActiveSection('roles')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'roles'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Shield className="w-4 h-4" />
                Roles
              </button>
              <button
                onClick={() => setActiveSection('users')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'users'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="w-4 h-4" />
                Usuarios
              </button>
              <button
                onClick={() => setActiveSection('staff')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'staff'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Equipo
              </button>
              <button
                onClick={() => setActiveSection('services')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'services'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                Servicios
              </button>
              <button
                onClick={() => setActiveSection('delivery-config')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'delivery-config'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Truck className="w-4 h-4" />
                Entregas
              </button>
              <button
                onClick={() => setActiveSection('fraccionamientos')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'fraccionamientos'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Fraccionamientos
              </button>
              
              <button
                onClick={() => setActiveSection('stats')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'stats'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Estadísticas
              </button>
              <button
                onClick={() => setActiveSection('subscription')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'subscription'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Suscripción
              </button>
              <button
                onClick={() => setActiveSection('personnel')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'personnel'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="w-4 h-4" />
                Personal
              </button>
              <button
                onClick={() => setActiveSection('nomina')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'nomina'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Nómina
              </button>
              <button
                onClick={() => setActiveSection('shifts')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'shifts'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Turnos
              </button>
              <button
                onClick={() => setActiveSection('daily-closeout')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === 'daily-closeout'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Corte Diario
              </button>
              {isVetGroomDeveloper && (
                <button
                  onClick={() => setActiveSection('delivery-tracking')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === 'delivery-tracking'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">BETA</Badge>
                  Tracking
                </button>
              )}
            </div>

            {/* Content Sections */}
            {activeSection === 'rooms' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Staff Management Section */}
            {activeSection === 'staff' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Roles Management Section */}
            {activeSection === 'roles' && (
              <div className="space-y-6">
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
                              {selectedUser.name ? selectedUser.name.split(' ').map((n: any) => n[0]).join('') : (selectedUser.email ? selectedUser.email[0].toUpperCase() : '??')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.name || 'Usuario sin nombre'}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{selectedUser.email}</div>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Seleccionar Nuevo Rol</Label>
                          <div className="space-y-2 mt-3">
                            {(availableRoles || []).map((role: any) => (
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
                                  <Badge className={getDepartmentColor(role.department || 'admin')}>
                                    {role.department || 'Sin departamento'}
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

                {/* Basic Salary Edit Dialog */}
                {isBasicSalaryEditOpen && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Overlay */}
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-50" 
                      onClick={() => setIsBasicSalaryEditOpen(false)}
                    ></div>
                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Editar Salario Básico</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {basicSalaryEdit.employee?.name}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="basicSalary">Salario Base Mensual</Label>
                          <Input
                            id="basicSalary"
                            type="number"
                            value={basicSalaryEdit.basicSalary}
                            onChange={(e) => setBasicSalaryEdit(prev => ({
                              ...prev,
                              basicSalary: parseFloat(e.target.value) || 0
                            }))}
                            placeholder="$15,000.00"
                            className="text-lg font-medium"
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button variant="outline" onClick={() => setIsBasicSalaryEditOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={async () => {
                              if (basicSalaryEdit.employee && currentTenant) {
                                try {
                                  await apiRequest(`/api/staff/${basicSalaryEdit.employee.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({
                                      basicSalary: basicSalaryEdit.basicSalary.toString(),
                                    }),
                                  });
                                  
                                  queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant.id] });
                                  setIsBasicSalaryEditOpen(false);
                                  
                                  toast({
                                    title: "Salario Actualizado",
                                    description: `Salario de ${basicSalaryEdit.employee.name} actualizado a $${basicSalaryEdit.basicSalary.toLocaleString()}`,
                                  });
                                } catch (error) {
                                  console.error('Error updating basic salary:', error);
                                  toast({
                                    title: "Error",
                                    description: "No se pudo actualizar el salario. Intenta de nuevo.",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            )}

            {/* Services Management Section */}
            {activeSection === 'services' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Users Management Section */}
            {activeSection === 'users' && (
              <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Usuarios</h2>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-sm font-medium">Nombre *</Label>
                          <Input 
                            name="firstName"
                            placeholder="Ej: María" 
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-sm font-medium">Apellido</Label>
                          <Input 
                            name="lastName"
                            placeholder="Ej: González" 
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                        <Input 
                          name="email"
                          type="email"
                          placeholder="Ej: maria@empresa.com" 
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-sm font-medium">Contraseña *</Label>
                        <Input 
                          name="password"
                          type="password"
                          placeholder="Contraseña para el usuario" 
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="roleId" className="text-sm font-medium">Rol Inicial *</Label>
                        <Select name="roleId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.displayName} ({role.department})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsUserDialogOpen(false);
                            setNewUserData({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
                          }}
                          disabled={createUserMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bulk Assignment Controls */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-blue-900 dark:text-blue-100">Gestión de Usuarios y Roles</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Selecciona múltiples usuarios para asignación masiva de roles
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2">
                          <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Filtrar por rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los roles</SelectItem>
                              {CORE_ROLES.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={handleSelectAll}>
                            {filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.includes(user.id)) ? 'Deseleccionar' : 'Seleccionar'} Todo
                          </Button>
                        </div>
                        
                        {selectedUsers.length > 0 && (
                          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-md border">
                            <Badge variant="secondary">{selectedUsers.length} seleccionados</Badge>
                            <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Asignar rol" />
                              </SelectTrigger>
                              <SelectContent>
                                {CORE_ROLES.map(role => (
                                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleBulkRoleAssignment}
                              disabled={!bulkRoleId || updateUserRoleMutation.isPending}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Asignar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Consolidated Role Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {CORE_ROLES.map(coreRole => {
                      // Map core role to actual database roles - for now just match by ID
                      const matchingDbRole = roles.find(role => role.name === coreRole.id || role.id === coreRole.id);
                      const roleUsers = users.filter(user => {
                        // Handle different role mapping scenarios
                        if (coreRole.id === 'groomer') {
                          // Services role includes groomer and delivery functions
                          return user.roleId === coreRole.id || user.roleName === 'groomer';
                        }
                        return user.roleId === coreRole.id || user.roleName === coreRole.id;
                      });
                      
                      return (
                        <div
                          key={coreRole.id}
                          className={`rounded-lg border-2 transition-all min-h-[300px] ${coreRole.color} ${
                            dragOverRole === coreRole.id 
                              ? 'border-blue-500 shadow-lg scale-105' 
                              : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, coreRole.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, coreRole.id)}
                        >
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{coreRole.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{coreRole.department}</p>
                              </div>
                              <Badge variant="outline" className="text-lg px-3 py-1">{roleUsers.length}</Badge>
                            </div>
                            
                            <div className="space-y-3">
                              {roleUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                  <p className="text-sm font-medium">Sin usuarios asignados</p>
                                  <p className="text-xs">Arrastra usuarios aquí</p>
                                </div>
                              ) : (
                                roleUsers.map(user => (
                                  <div
                                    key={user.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, user)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm cursor-move transition-all hover:shadow-md hover:scale-[1.02] ${
                                      draggedUser?.id === user.id ? 'opacity-50 scale-95' : ''
                                    } ${
                                      selectedUsers.includes(user.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleSelectUser(user.id);
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => handleSelectUser(user.id)}
                                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                          {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span className="text-xs text-green-600 dark:text-green-400">Activo</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {users.length === 0 && !usersLoading && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-2">No hay usuarios registrados</p>
                      <p className="text-sm">Crea el primer usuario de tu equipo usando el botón "Nuevo Usuario"</p>
                    </div>
                  )}
                </div>
              )}
              </div>
            )}

            {/* Delivery Configuration Section */}
            {activeSection === 'delivery-config' && (
              <div className="space-y-6">
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
            </div>
            )}


            {/* Fraccionamientos Tab */}
            {activeSection === 'fraccionamientos' && (
              <div className="space-y-6">
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
            </div>
            )}


            {/* Statistics Tab */}
            {activeSection === 'stats' && (
              <div className="space-y-6">
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
            </div>
            )}


            {/* Subscription Management Tab */}
            {activeSection === 'subscription' && (
              <div className="space-y-6">
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
                          <div className="mb-4 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Selecciona un nuevo plan para tu clínica.
                            </p>
                            
                            {subscriptionData?.hasSubscription && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950 dark:border-blue-800">
                                <div className="flex items-start gap-2">
                                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm">
                                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                      Información de Facturación
                                    </p>
                                    <p className="text-blue-700 dark:text-blue-300">
                                      Los cambios de precio se aplican con 10 días de anticipación. Si cambias tu plan hoy, 
                                      el próximo cargo mantendrá el precio actual, pero el siguiente período ya aplicará el nuevo precio.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {availablePlans
                              .filter((plan: any) => {
                                // Completely exclude Trial plan from admin interface
                                // Only SuperAdmin can manage trials
                                return plan.id !== 'trial' && plan.displayName !== 'Trial';
                              })
                              .map((plan: any) => (
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
                                <div className="space-y-3">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    ¿Estás seguro de que quieres cambiar tu plan de suscripción?
                                  </p>
                                  
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 dark:bg-orange-950 dark:border-orange-800">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                      <div className="text-sm">
                                        <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                                          Política de Cambio de Precio
                                        </p>
                                        <p className="text-orange-700 dark:text-orange-300">
                                          El cambio de plan se aplicará inmediatamente, pero el ajuste de precio 
                                          se efectuará en el siguiente período de facturación con 10 días de anticipación.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
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
            </div>
            )}


            {/* Personnel Management Tab */}
            {activeSection === 'personnel' && (
              <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Personal</h2>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Empleado
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Lista de Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">Nombre del Empleado</th>
                          <th className="text-left p-4 font-medium">Rol</th>
                          <th className="text-left p-4 font-medium">Base Salarial</th>
                          <th className="text-left p-4 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff?.map((employee: any) => (
                          <tr key={employee.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-4">{employee.name}</td>
                            <td className="p-4">
                              <Badge variant="outline">{employee.role}</Badge>
                            </td>
                            <td className="p-4">
                              <Select 
                                value={employee.salaryBasis || 'per_month'}
                                onValueChange={(value) => {
                                  // Update salary basis logic here
                                  toast({
                                    title: "Base salarial actualizada",
                                    description: `Base salarial de ${employee.name} actualizada a ${value === 'per_day' ? 'Por Día' : 'Por Mes'}`,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="per_day">Por Día</SelectItem>
                                  <SelectItem value="per_month">Por Mes</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    // Initialize form with current employee data
                                    setEmployeePayrollData({
                                      basicSalary: employee.basicSalary || '15000',
                                      paymentFrequency: employee.paymentFrequency || 'monthly',
                                      isrEnabled: employee.isrEnabled !== false,
                                      imssEnabled: employee.imssEnabled !== false,
                                      imssEmployeePercentage: employee.imssEmployeePercentage || '2.375',
                                      imssEmployerPercentage: employee.imssEmployerPercentage || '10.525',
                                      infonavitEnabled: employee.infonavitEnabled || false,
                                      infonavitPercentage: employee.infonavitPercentage || '0',
                                      fonacotEnabled: employee.fonacotEnabled || false,
                                      fonacotAmount: employee.fonacotAmount || '0'
                                    });
                                    setIsEmployeePayrollOpen(true);
                                  }}
                                  title="Editar configuración de nómina"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!staff || staff.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No se encontraron empleados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            )}


            {/* Payroll Management Tab */}
            {activeSection === 'nomina' && (
              <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Nómina</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Configura salarios individuales y retenciones fiscales por empleado
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => setIsPayrollConfigOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Calculate payroll for current period
                      toast({
                        title: "Procesando Nómina",
                        description: "Calculando nómina del período actual...",
                      });
                    }}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Procesar Nómina
                  </Button>
                </div>
              </div>

              {/* Salary Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Empleados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {staff?.length || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Personal activo</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Nómina Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${staff?.reduce((total, emp) => total + (parseFloat(emp.basicSalary) || 15000), 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Salarios base registrados</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Retenciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ${Math.round(staff?.reduce((total, emp) => {
                        const salary = parseFloat(emp.basicSalary) || 15000;
                        // ISR applies only if BOTH global AND individual settings are enabled
                        const isr = (payrollSettings.isrEnabled && emp.isrEnabled !== false) ? calculateISR(salary) : 0;
                        const imssRate = parseFloat(emp.imssEmployeePercentage) || 2.375;
                        // IMSS applies only if BOTH global AND individual settings are enabled
                        const imss = (payrollSettings.imssEnabled && emp.imssEnabled !== false) ? salary * (imssRate / 100) : 0;
                        return total + isr + imss;
                      }, 0) || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">ISR + IMSS configurado</p>
                  </CardContent>
                </Card>
              </div>

              {/* Individual Employee Salary Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Configuración Salarial Individual
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configura salarios base y retenciones para cada empleado
                  </p>
                </CardHeader>
                <CardContent>
                  {staff && staff.length > 0 ? (
                    <div className="space-y-4">
                      {staff.map((employee: any) => (
                        <div 
                          key={employee.id} 
                          className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            {/* Employee Info - Left Side */}
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                                  {employee.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {employee.role === 'veterinarian' ? 'Veterinario' :
                                     employee.role === 'groomer' ? 'Peluquero' :
                                     employee.role === 'receptionist' ? 'Recepcionista' :
                                     employee.role === 'technician' ? 'Técnico' : employee.role}
                                  </Badge>
                                  {employee.specialization && (
                                    <span className="text-xs text-gray-500">• {employee.specialization}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Salary Info - Center */}
                            <div className="flex items-center gap-8">
                              {/* Current Salary */}
                              <div className="text-center min-w-0">
                                <div className="text-sm text-gray-500 mb-1">Salario Actual</div>
                                <div className="text-lg font-bold text-green-600">
                                  ${(parseFloat(employee.basicSalary) || 
                                    (employee.role === 'veterinarian' ? 35000 :
                                     employee.role === 'groomer' ? 15000 :
                                     employee.role === 'receptionist' ? 12000 :
                                     employee.role === 'technician' ? 20000 : 15000)
                                  ).toLocaleString()}
                                </div>
                              </div>
                              
                              {/* Net Salary (after deductions) */}
                              <div className="text-center min-w-0">
                                <div className="text-sm text-gray-500 mb-1">Neto Estimado</div>
                                <div className="text-lg font-bold text-blue-600">
                                  ${(() => {
                                    const basicSalary = parseFloat(employee.basicSalary) || 
                                      (employee.role === 'veterinarian' ? 35000 :
                                       employee.role === 'groomer' ? 15000 :
                                       employee.role === 'receptionist' ? 12000 :
                                       employee.role === 'technician' ? 20000 : 15000);
                                    // ISR applies only if BOTH global AND individual settings are enabled
                                    const isr = (payrollSettings.isrEnabled && employee.isrEnabled !== false) ? calculateISR(basicSalary) : 0;
                                    const imssRate = parseFloat(employee.imssEmployeePercentage) || 2.375;
                                    // IMSS applies only if BOTH global AND individual settings are enabled
                                    const imss = (payrollSettings.imssEnabled && employee.imssEnabled !== false) ? basicSalary * (imssRate / 100) : 0;
                                    const infonavit = (employee.infonavitEnabled === true) ? basicSalary * (parseFloat(employee.infonavitPercentage) || 0) / 100 : 0;
                                    const fonacot = (employee.fonacotEnabled === true) ? parseFloat(employee.fonacotAmount) || 0 : 0;
                                    return Math.round(basicSalary - isr - imss - infonavit - fonacot).toLocaleString();
                                  })()}
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions - Right Side */}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  // Initialize form with current employee data
                                  setEmployeePayrollData({
                                    basicSalary: employee.basicSalary || '15000',
                                    paymentFrequency: employee.paymentFrequency || 'monthly',
                                    isrEnabled: employee.isrEnabled !== false,
                                    imssEnabled: employee.imssEnabled !== false,
                                    imssEmployeePercentage: employee.imssEmployeePercentage || '2.375',
                                    imssEmployerPercentage: employee.imssEmployerPercentage || '10.525',
                                    infonavitEnabled: employee.infonavitEnabled || false,
                                    infonavitPercentage: employee.infonavitPercentage || '0',
                                    fonacotEnabled: employee.fonacotEnabled || false,
                                    fonacotAmount: employee.fonacotAmount || '0'
                                  });
                                  setIsEmployeePayrollOpen(true);
                                }}
                                className="text-xs"
                                title="Editar configuración de nómina"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs border-green-200 text-green-700 hover:bg-green-50 flex flex-col items-center py-2 px-3 h-auto"
                                title="Ver recibo de nómina"
                              >
                                <FileText className="w-3 h-3 mb-1" />
                                <span>Recibo</span>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Quick Stats Row */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-xs text-gray-500">Base Salarial</div>
                                <div className="text-sm font-medium">
                                  {employee.salaryBasis === 'per_day' ? 'Por Día' : 'Por Mes'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">ISR</div>
                                <div className="text-sm font-medium text-red-600">
                                  {(payrollSettings.isrEnabled && employee.isrEnabled !== false) ? (
                                    `-$${calculateISR(parseFloat(employee.basicSalary) || 15000).toFixed(0)}`
                                  ) : (
                                    <span className="text-gray-400">Deshabilitado</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">IMSS</div>
                                <div className="text-sm font-medium text-red-600">
                                  {(payrollSettings.imssEnabled && employee.imssEnabled !== false) ? (
                                    `-$${((parseFloat(employee.basicSalary) || 15000) * (parseFloat(employee.imssEmployeePercentage) || 2.375) / 100).toFixed(0)}`
                                  ) : (
                                    <span className="text-gray-400">Deshabilitado</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Estado</div>
                                <div className="text-sm font-medium">
                                  <Badge 
                                    variant={employee.isActive ? "default" : "secondary"}
                                    className={employee.isActive ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {employee.isActive ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay empleados</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Agrega empleados en la pestaña "Personal" para gestionar su nómina
                      </p>
                      <Button variant="outline" onClick={() => {
                        // Switch to personnel tab
                        const tabs = document.querySelector('[data-state="active"]');
                        // This is a simple way to switch tabs - in a real app you'd use proper state management
                      }}>
                        <Users className="w-4 h-4 mr-2" />
                        Ir a Personal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payroll Summary Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Resumen de Nómina por Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['veterinarian', 'groomer', 'receptionist', 'technician'].map(role => {
                      const roleStaff = staff?.filter((emp: any) => emp.role === role) || [];
                      const totalSalary = roleStaff.reduce((sum: number, emp: any) => sum + (emp.basicSalary || 15000), 0);
                      
                      return (
                        <div key={role} className="text-center p-4 border rounded-lg">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            {role === 'veterinarian' ? 'Veterinarios' :
                             role === 'groomer' ? 'Peluqueros' :
                             role === 'receptionist' ? 'Recepcionistas' :
                             role === 'technician' ? 'Técnicos' : role}
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {roleStaff.length}
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            ${totalSalary.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            )}


            {/* Comprehensive Shift Management System */}
            {activeSection === 'shifts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestión de Turnos</h2>
                    <p className="text-gray-600 dark:text-gray-400">Sistema completo de turnos, horarios y control de asistencia</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShiftTabActive('board')}
                      variant={shiftTabActive === 'board' ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Tablero de Turnos
                    </Button>
                    <Button 
                      onClick={() => setShiftTabActive('patterns')}
                      variant={shiftTabActive === 'patterns' ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Patrones de Turnos
                    </Button>
                    <Button 
                      onClick={() => setShiftTabActive('tracking')}
                      variant={shiftTabActive === 'tracking' ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Control de Asistencia
                    </Button>
                  </div>
                </div>

                {/* Shift Board - Visual Weekly Calendar */}
                {(!shiftTabActive || shiftTabActive === 'board') && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Tablero Visual de Turnos - Semana Actual
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            ← Semana Anterior
                          </Button>
                          <Button size="sm" variant="outline">
                            Semana Actual
                          </Button>
                          <Button size="sm" variant="outline">
                            Semana Siguiente →
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          {/* Weekly Shift Board Table */}
                          <table className="w-full min-w-[900px]">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left p-3 font-medium text-sm text-gray-700 dark:text-gray-300 w-40">
                                  Employee Name
                                </th>
                                {(() => {
                                  const today = new Date();
                                  const startOfWeek = new Date(today);
                                  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
                                  
                                  return Array.from({ length: 7 }, (_, i) => {
                                    const date = new Date(startOfWeek);
                                    date.setDate(startOfWeek.getDate() + i);
                                    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                                    
                                    return (
                                      <th key={i} className="text-center p-3 font-medium text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
                                        <div className="text-lg font-bold">{date.getDate()}</div>
                                        <div className="text-xs text-gray-500">{dayNames[i]}</div>
                                      </th>
                                    );
                                  });
                                })()}
                              </tr>
                            </thead>
                            <tbody>
                              {staff?.map((staffMember, staffIndex) => {
                                // Define sample shifts for demonstration
                                const sampleShifts = [
                                  ['9:00 - 18:00\n09 hrs', '9:00 - 18:00\n09 hrs', '10:00 - 19:00\n09 hrs', 'Flexible\n09 hrs', '9:00 - 18:00\n09 hrs', 'Week off', 'Week off'],
                                  ['9:00 - 18:00\n09 hrs', '9:00 - 18:00\n09 hrs', '10:00 - 19:00\n09 hrs', '10:00 - 19:00\n09 hrs', 'Flexible\n09 hrs', 'Week off', 'Week off'],
                                  ['On leave', '9:00 - 18:00\n09 hrs', '10:00 - 19:00\n09 hrs', '10:00 - 19:00\n09 hrs', '9:00 - 18:00\n09 hrs', 'Week off', 'Week off'],
                                  ['9:00 - 18:00\n09 hrs', 'Flexible\n09 hrs', 'Flexible\n09 hrs', '10:00 - 19:00\n09 hrs', 'Flexible\n09 hrs', 'Week off', 'Week off'],
                                  ['+', '9:00 - 18:00\n09 hrs', '9:00 - 18:00\n09 hrs', '10:00 - 19:00\n09 hrs', 'On leave', 'Week off', 'Week off'],
                                  ['9:00 - 18:00\n09 hrs', 'On leave', '9:00 - 18:00\n09 hrs', '9:00 - 18:00\n09 hrs', '+', 'Week off', 'Week off']
                                ];
                                
                                const employeeColors = ['bg-green-100', 'bg-blue-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'];
                                const shifts = sampleShifts[staffIndex % sampleShifts.length];
                                
                                return (
                                  <tr key={staffMember.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                    <td className="p-3 font-medium text-sm">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${employeeColors[staffIndex % employeeColors.length]}`} />
                                        <div>
                                          <div className="font-medium text-gray-900 dark:text-gray-100">{staffMember.name}</div>
                                          <div className="text-xs text-gray-500">{staffMember.role}</div>
                                        </div>
                                      </div>
                                    </td>
                                    {shifts.map((shift, dayIndex) => (
                                      <td key={dayIndex} className="p-2 text-center">
                                        {shift === '+' || shift === 'Week off' ? (
                                          <button 
                                            className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
                                            onClick={() => {
                                              setSelectedShift({
                                                staffId: staffMember.id,
                                                dayIndex,
                                                current: shift
                                              });
                                              setIsShiftDialogOpen(true);
                                            }}
                                          >
                                            <Plus className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <div 
                                            className={`text-xs px-2 py-1 rounded whitespace-pre-line cursor-pointer hover:shadow-md transition-shadow ${
                                              shift === 'On leave' 
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                                : shift.includes('Flexible') 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={() => {
                                              setSelectedShift({
                                                staffId: staffMember.id,
                                                dayIndex,
                                                current: shift
                                              });
                                              setIsShiftDialogOpen(true);
                                            }}
                                          >
                                            {shift}
                                          </div>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Add Employee Button */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <Button 
                            variant="outline" 
                            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => toast({ title: "Agregar Empleado", description: "Funcionalidad para agregar empleado" })}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Employee
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Shift Management Dialog */}
                    <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Gestionar Turno</DialogTitle>
                          <DialogDescription>
                            {selectedShift?.current === '+' || selectedShift?.current === 'Week off' 
                              ? 'Asignar nuevo turno' 
                              : 'Modificar turno existente'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {selectedShift?.current !== '+' && selectedShift?.current !== 'Week off' && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-sm font-medium">Turno Actual:</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{selectedShift?.current}</div>
                            </div>
                          )}
                          
                          <div className="space-y-3">
                            <div className="text-sm font-medium">Opciones de Turno:</div>
                            
                            {/* Shift Patterns from Patrones de Turnos */}
                            <button 
                              className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              onClick={() => {
                                toast({ title: "Turno Asignado", description: "Turno Matutino (08:00 - 16:00)" });
                                setIsShiftDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div>
                                  <div className="font-medium">Turno Matutino</div>
                                  <div className="text-xs text-gray-500">08:00 - 16:00 (8 hrs)</div>
                                </div>
                              </div>
                            </button>
                            
                            <button 
                              className="w-full p-3 text-left border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                              onClick={() => {
                                toast({ title: "Turno Asignado", description: "Turno Vespertino (16:00 - 00:00)" });
                                setIsShiftDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <div>
                                  <div className="font-medium">Turno Vespertino</div>
                                  <div className="text-xs text-gray-500">16:00 - 00:00 (8 hrs)</div>
                                </div>
                              </div>
                            </button>
                            
                            <button 
                              className="w-full p-3 text-left border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                              onClick={() => {
                                toast({ title: "Turno Asignado", description: "Turno Nocturno (00:00 - 08:00)" });
                                setIsShiftDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                <div>
                                  <div className="font-medium">Turno Nocturno</div>
                                  <div className="text-xs text-gray-500">00:00 - 08:00 (8 hrs)</div>
                                </div>
                              </div>
                            </button>
                            
                            <button 
                              className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              onClick={() => {
                                toast({ title: "Turno Flexible Asignado", description: "Horario flexible según necesidades" });
                                setIsShiftDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-400" />
                                <div>
                                  <div className="font-medium">Flexible</div>
                                  <div className="text-xs text-gray-500">Horario adaptable</div>
                                </div>
                              </div>
                            </button>
                            
                            <button 
                              className="w-full p-3 text-left border rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
                              onClick={() => {
                                toast({ title: "Permiso Asignado", description: "Día de permiso registrado" });
                                setIsShiftDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div>
                                  <div className="font-medium">On Leave</div>
                                  <div className="text-xs text-gray-500">Día de permiso</div>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {selectedShift?.current !== '+' && selectedShift?.current !== 'Week off' && (
                            <div className="border-t pt-4">
                              <div className="text-sm font-medium mb-3">Reasignar a:</div>
                              <div className="space-y-2">
                                {staff?.filter(s => s.id !== selectedShift?.staffId).slice(0, 3).map((otherStaff) => (
                                  <button
                                    key={otherStaff.id}
                                    className="w-full p-2 text-left border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    onClick={() => {
                                      toast({ 
                                        title: "Turno Reasignado", 
                                        description: `Turno asignado a ${otherStaff.name}` 
                                      });
                                      setIsShiftDialogOpen(false);
                                    }}
                                  >
                                    <div className="font-medium text-sm">{otherStaff.name}</div>
                                    <div className="text-xs text-gray-500">{otherStaff.role}</div>
                                  </button>
                                ))}
                              </div>
                              
                              <Button 
                                variant="outline" 
                                className="w-full mt-3 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  toast({ title: "Turno Eliminado", description: "Turno removido del calendario" });
                                  setIsShiftDialogOpen(false);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar Turno
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Calendar Sharing Dialog */}
                    <Dialog open={isCalendarShareOpen} onOpenChange={setIsCalendarShareOpen}>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Compartir Calendario Personal</DialogTitle>
                          <DialogDescription>
                            Comparte el calendario de turnos con tu equipo vía WhatsApp
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Employee Filter */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Filtrar por empleado:</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empleado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos los empleados</SelectItem>
                                {staff?.map((staffMember) => (
                                  <SelectItem key={staffMember.id} value={staffMember.id}>
                                    {staffMember.name} - {staffMember.role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Calendar Link Preview */}
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-sm font-medium mb-2">Enlace del calendario:</div>
                            <div className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border break-all">
                              {`${window.location.origin}/calendar/personal?tenant=${currentTenant?.id}&name=filtro`}
                            </div>
                          </div>
                          
                          {/* WhatsApp Share Button */}
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                const calendarUrl = `${window.location.origin}/calendar/personal?tenant=${currentTenant?.id}`;
                                const message = encodeURIComponent(`📅 *Calendario de Turnos*\n\nRevisa tus turnos y horarios aquí:\n${calendarUrl}\n\nPuedes filtrar por tu nombre para ver solo tus turnos.`);
                                const whatsappUrl = `https://wa.me/?text=${message}`;
                                window.open(whatsappUrl, '_blank');
                                toast({ title: "WhatsApp Abierto", description: "Enlace listo para compartir" });
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Compartir por WhatsApp
                            </Button>
                            
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const calendarUrl = `${window.location.origin}/calendar/personal?tenant=${currentTenant?.id}`;
                                navigator.clipboard.writeText(calendarUrl);
                                toast({ title: "Enlace Copiado", description: "URL copiada al portapapeles" });
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar Enlace
                            </Button>
                          </div>
                          
                          {/* Instructions */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                              💡 Instrucciones:
                            </div>
                            <div className="text-xs text-blue-800 dark:text-blue-200">
                              • El enlace permite a los empleados ver sus turnos personales<br/>
                              • Pueden filtrar por su nombre para identificar sus horarios<br/>
                              • El calendario se actualiza automáticamente<br/>
                              • Funciona en cualquier dispositivo móvil o computadora
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Shift Patterns Management */}
                {shiftTabActive === 'patterns' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Patrones de Turnos</h3>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Patrón de Turno
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Sample Shift Patterns */}
                      {[
                        { id: 1, name: 'Turno Matutino', type: 'morning', time: '08:00 - 16:00', color: '#3B82F6', active: true },
                        { id: 2, name: 'Turno Vespertino', type: 'afternoon', time: '16:00 - 00:00', color: '#10B981', active: true },
                        { id: 3, name: 'Turno Nocturno', type: 'night', time: '00:00 - 08:00', color: '#8B5CF6', active: false }
                      ].map((pattern) => (
                        <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: pattern.color }}
                                />
                                {pattern.name}
                              </CardTitle>
                              <Badge variant={pattern.active ? 'default' : 'secondary'}>
                                {pattern.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-500" />
                              {pattern.time}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <UserCheck className="w-4 h-4 text-gray-500" />
                              Tipo: {pattern.type}
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Tracking & Attendance */}
                {shiftTabActive === 'tracking' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Control de Asistencia</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Reporte
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsCalendarShareOpen(true)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Ver Calendario Personal
                        </Button>
                      </div>
                    </div>

                    {/* Live Clock-in Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5" />
                          Estado Actual de Asistencia
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {staff?.map((staffMember) => (
                            <div key={staffMember.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="font-medium text-sm">{staffMember.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mb-1">{staffMember.role}</div>
                              <div className="text-xs">
                                Status: <span className="font-medium">Presente</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Turno: Matutino
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Time Entries History */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Historial de Entradas y Salidas
                        </CardTitle>
                        <div className="flex gap-2">
                          <Input 
                            type="date" 
                            className="w-40"
                            defaultValue={new Date().toISOString().split('T')[0]}
                          />
                          <Select defaultValue="all">
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filtrar por personal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todo el Personal</SelectItem>
                              {staff?.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Sample time entries */}
                          {[
                            { id: 1, staff: 'Dr. Ana García', type: 'clock_in', time: '08:00', status: 'Entrada' },
                            { id: 2, staff: 'Carlos López', type: 'break_start', time: '12:00', status: 'Inicio Descanso' },
                            { id: 3, staff: 'María Rodriguez', type: 'clock_out', time: '17:00', status: 'Salida' }
                          ].map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  entry.type === 'clock_in' ? 'bg-green-500' :
                                  entry.type === 'clock_out' ? 'bg-red-500' :
                                  'bg-yellow-500'
                                }`} />
                                <div>
                                  <div className="font-medium text-sm">{entry.staff}</div>
                                  <div className="text-xs text-gray-500">{entry.status}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{entry.time}</div>
                                <div className="text-xs text-gray-500">{new Date().toLocaleDateString()}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  📍 GPS Verificado
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

            </div>
            )}


            {/* Daily Close-out Tab */}
            {activeSection === 'daily-closeout' && (
              <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Corte Diario Financiero</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Date Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Seleccionar Fecha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="closeout-date">Fecha del Corte</Label>
                      <Input
                        id="closeout-date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Ejecutar Corte Diario
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Reporte
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">--</div>
                        <div className="text-sm text-green-800">Ingresos Totales</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">--</div>
                        <div className="text-sm text-red-800">Gastos Totales</div>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <div className="text-3xl font-bold text-blue-600">--</div>
                      <div className="text-sm text-blue-800">Total Neto</div>
                      <div className="text-xs text-gray-600 mt-2">Selecciona una fecha y ejecuta el corte diario</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Detalle de Transacciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <div className="text-lg font-medium">No hay datos de transacciones</div>
                      <div className="text-sm">Ejecuta el corte diario para ver el detalle de transacciones</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}


            {/* Delivery Tracking Section - VetGroom Developer Only */}
            {isVetGroomDeveloper && activeSection === 'delivery-tracking' && (
              <div className="space-y-6">
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
              </div>
            )}
          </div>

          {/* General Payroll Configuration Modal */}
          <Dialog open={isPayrollConfigOpen} onOpenChange={setIsPayrollConfigOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Configuración General de Nómina</DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configura los parámetros generales para el cálculo de nómina
                </p>
              </DialogHeader>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Global Enable/Disable Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Configuración Global de Retenciones</h3>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Control Global</span>
                    </div>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Estas configuraciones afectan a TODOS los empleados. Para aplicar una retención, 
                      debe estar habilitada TANTO aquí (global) COMO en la configuración individual del empleado.
                    </p>
                  </div>
                  
                  {/* ISR Configuration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="defaultISR"
                          checked={payrollSettings.isrEnabled}
                          onChange={(e) => setPayrollSettings(prev => ({
                            ...prev,
                            isrEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="defaultISR" className="font-medium">ISR (Impuesto Sobre la Renta)</Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Se aplicará automáticamente a nuevos empleados según la tabla ISR 2024
                    </p>
                  </div>

                  {/* IMSS Configuration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="defaultIMSS"
                          checked={payrollSettings.imssEnabled}
                          onChange={(e) => setPayrollSettings(prev => ({
                            ...prev,
                            imssEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="defaultIMSS" className="font-medium">IMSS (Seguro Social)</Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Empleado: 2.375% | Patrón: 10.525% (según ley vigente)
                    </p>
                  </div>

                  {/* Payment Frequency */}
                  <div className="border rounded-lg p-4">
                    <Label className="font-medium mb-3 block">Frecuencia de Pago por Defecto</Label>
                    <Select 
                      value={payrollSettings.paymentFrequency}
                      onValueChange={(value) => setPayrollSettings(prev => ({
                        ...prev,
                        paymentFrequency: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quincenal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ISR Tax Brackets Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Tabla ISR 2024 (Anual)
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3">Límite Inferior</th>
                            <th className="text-left py-2 px-3">Límite Superior</th>
                            <th className="text-left py-2 px-3">Tasa (%)</th>
                            <th className="text-left py-2 px-3">Cuota Fija</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$0.01</td>
                            <td className="py-2 px-3">$125,900.00</td>
                            <td className="py-2 px-3 text-green-600">1.92%</td>
                            <td className="py-2 px-3">$0.00</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$125,900.01</td>
                            <td className="py-2 px-3">$1,059,650.00</td>
                            <td className="py-2 px-3 text-green-600">6.40%</td>
                            <td className="py-2 px-3">$2,392.10</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$1,059,650.01</td>
                            <td className="py-2 px-3">$1,761,820.00</td>
                            <td className="py-2 px-3 text-orange-600">10.88%</td>
                            <td className="py-2 px-3">$62,070.90</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$1,761,820.01</td>
                            <td className="py-2 px-3">$2,102,550.00</td>
                            <td className="py-2 px-3 text-red-600">16.00%</td>
                            <td className="py-2 px-3">$137,904.60</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$2,102,550.01</td>
                            <td className="py-2 px-3">$2,653,020.00</td>
                            <td className="py-2 px-3 text-red-600">21.36%</td>
                            <td className="py-2 px-3">$192,421.40</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3">$2,653,020.01</td>
                            <td className="py-2 px-3">$3,472,840.00</td>
                            <td className="py-2 px-3 text-red-600">23.52%</td>
                            <td className="py-2 px-3">$311,322.60</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">$3,472,840.01</td>
                            <td className="py-2 px-3">En adelante</td>
                            <td className="py-2 px-3 text-red-700 font-medium">30.00%</td>
                            <td className="py-2 px-3">$516,277.50</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      * Última actualización: Enero 2024 según disposiciones fiscales SAT
                    </div>
                  </div>
                </div>

                {/* IMSS Rates Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Cuotas IMSS 2024
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3">Concepto</th>
                            <th className="text-left py-2 px-3">Trabajador (%)</th>
                            <th className="text-left py-2 px-3">Patrón (%)</th>
                            <th className="text-left py-2 px-3">Total (%)</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 font-medium">Enfermedades y Maternidad</td>
                            <td className="py-2 px-3 text-blue-600">1.125%</td>
                            <td className="py-2 px-3 text-green-600">0.70%</td>
                            <td className="py-2 px-3">1.825%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 font-medium">Invalidez y Vida</td>
                            <td className="py-2 px-3 text-blue-600">0.625%</td>
                            <td className="py-2 px-3 text-green-600">1.75%</td>
                            <td className="py-2 px-3">2.375%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 font-medium">Retiro</td>
                            <td className="py-2 px-3 text-blue-600">0.000%</td>
                            <td className="py-2 px-3 text-green-600">2.00%</td>
                            <td className="py-2 px-3">2.00%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 font-medium">Cesantía en Edad Avanzada y Vejez</td>
                            <td className="py-2 px-3 text-blue-600">1.125%</td>
                            <td className="py-2 px-3 text-green-600">3.150%</td>
                            <td className="py-2 px-3">4.275%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 px-3 font-medium">Infonavit</td>
                            <td className="py-2 px-3 text-blue-600">0.000%</td>
                            <td className="py-2 px-3 text-green-600">5.00%</td>
                            <td className="py-2 px-3">5.00%</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                            <td className="py-2 px-3 font-bold">TOTAL APLICADO</td>
                            <td className="py-2 px-3 font-bold text-blue-600">2.375%</td>
                            <td className="py-2 px-3 font-bold text-green-600">10.525%</td>
                            <td className="py-2 px-3 font-bold">12.90%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      * Según Ley del Seguro Social vigente 2024. Solo se descuenta al trabajador el 2.375%
                    </div>
                  </div>
                </div>

                {/* Editable Default Rates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Tasas por Defecto (Editables)
                  </h3>
                  
                  {/* Default IMSS Rates */}
                  <div className="border rounded-lg p-4">
                    <Label className="font-medium mb-3 block">Porcentajes IMSS por Defecto</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Descuento Trabajador (%)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={payrollSettings.imssEmployeePercentage}
                          onChange={(e) => setPayrollSettings(prev => ({
                            ...prev,
                            imssEmployeePercentage: e.target.value
                          }))}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Cuota Patrón (%)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={payrollSettings.imssEmployerPercentage}
                          onChange={(e) => setPayrollSettings(prev => ({
                            ...prev,
                            imssEmployerPercentage: e.target.value
                          }))}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Estos porcentajes se aplicarán por defecto a nuevos empleados
                    </p>
                  </div>

                  {/* Default Infonavit Rate */}
                  <div className="border rounded-lg p-4">
                    <Label className="font-medium mb-3 block">Porcentaje Infonavit por Defecto</Label>
                    <div className="max-w-xs">
                      <Input
                        type="number"
                        step="0.1"
                        max="5"
                        value={payrollSettings.infonavitPercentage}
                        onChange={(e) => setPayrollSettings(prev => ({
                          ...prev,
                          infonavitPercentage: e.target.value
                        }))}
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo legal: 5% del salario base
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsPayrollConfigOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Configuración guardada",
                        description: "La configuración general de nómina ha sido actualizada",
                      });
                      setIsPayrollConfigOpen(false);
                    }}
                  >
                    Guardar Configuración
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Individual Employee Payroll Modal */}
          <Dialog open={isEmployeePayrollOpen} onOpenChange={setIsEmployeePayrollOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configuración de Nómina - {selectedEmployee?.name}</DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configura salario y retenciones fiscales para este empleado
                </p>
              </DialogHeader>
              {selectedEmployee && (
                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-blue-600 dark:text-blue-300">
                          {selectedEmployee.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{selectedEmployee.name}</h3>
                        <Badge variant="outline">{selectedEmployee.role}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Salary Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configuración Salarial</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Salario Base Mensual</Label>
                        <Input
                          type="number"
                          placeholder="$15,000.00"
                          value={employeePayrollData.basicSalary}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            basicSalary: e.target.value
                          }))}
                          className="text-lg font-medium"
                        />
                        {employeePayrollData.basicSalary && (
                          <div className="text-sm text-gray-600 mt-1">
                            ISR estimado: ${(payrollSettings.isrEnabled && employeePayrollData.isrEnabled) ? 
                              calculateISR(parseFloat(employeePayrollData.basicSalary) || 0).toFixed(2) : '0.00'} mensual
                            {(!payrollSettings.isrEnabled || !employeePayrollData.isrEnabled) && (
                              <span className="text-gray-400 ml-2">(Deshabilitado)</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Frecuencia de Pago</Label>
                        <Select 
                          value={employeePayrollData.paymentFrequency}
                          onValueChange={(value) => setEmployeePayrollData(prev => ({
                            ...prev,
                            paymentFrequency: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quincenal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Tax Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Retenciones Fiscales</h3>
                    
                    {/* ISR Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="empISR"
                          checked={employeePayrollData.isrEnabled}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            isrEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="empISR" className="font-medium">ISR (Impuesto Sobre la Renta)</Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Se calcula automáticamente según la tabla ISR 2024 vigente
                      </p>
                    </div>

                    {/* IMSS Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="empIMSS"
                          checked={employeePayrollData.imssEnabled}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            imssEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="empIMSS" className="font-medium">IMSS (Seguro Social)</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label className="text-sm">Porcentaje Empleado (%)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={employeePayrollData.imssEmployeePercentage}
                            onChange={(e) => setEmployeePayrollData(prev => ({
                              ...prev,
                              imssEmployeePercentage: e.target.value
                            }))}
                            className="text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Legal: 2.375%</p>
                        </div>
                        <div>
                          <Label className="text-sm">Porcentaje Patrón (%)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={employeePayrollData.imssEmployerPercentage}
                            onChange={(e) => setEmployeePayrollData(prev => ({
                              ...prev,
                              imssEmployerPercentage: e.target.value
                            }))}
                            className="text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Legal: 10.525%</p>
                        </div>
                      </div>
                    </div>

                    {/* Infonavit Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="empInfonavit"
                          checked={employeePayrollData.infonavitEnabled}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            infonavitEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="empInfonavit" className="font-medium">Infonavit</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Porcentaje de descuento (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          max="5"
                          value={employeePayrollData.infonavitPercentage}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            infonavitPercentage: e.target.value
                          }))}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Máximo legal: 5% del salario</p>
                      </div>
                    </div>

                    {/* Fonacot Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="empFonacot"
                          checked={employeePayrollData.fonacotEnabled}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            fonacotEnabled: e.target.checked
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="empFonacot" className="font-medium">Fonacot</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Monto mensual de descuento</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={employeePayrollData.fonacotAmount}
                          onChange={(e) => setEmployeePayrollData(prev => ({
                            ...prev,
                            fonacotAmount: e.target.value
                          }))}
                          placeholder="$0.00"
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Monto fijo según crédito autorizado</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    {/* Left side - Recibo button */}
                    <Button 
                      variant="secondary"
                      onClick={generatePayslipPDF}
                      className="flex items-center gap-2"
                      data-testid="button-generate-payslip"
                    >
                      <Receipt className="w-4 h-4" />
                      Descargar Recibo PDF
                    </Button>
                    
                    {/* Right side - Save/Cancel buttons */}
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setIsEmployeePayrollOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveEmployeePayroll}
                        disabled={isSavingPayroll}
                      >
                        {isSavingPayroll ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar Cambios'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
