import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Building, 
  Trash2, 
  RefreshCw, 
  Plus,
  Database,
  AlertTriangle,
  Calendar,
  UserPlus,
  Loader2,
  Edit,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft,
  Smartphone,
  Monitor,
  Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DemoTenant {
  id: string;
  name: string;
  companyId: string;
  userCount: number;
  appointmentCount: number;
  createdAt: string;
  lastActivity: string;
  status: 'active' | 'inactive';
  demoUsers?: DemoUser[];
  availableRoles?: Role[];
}

interface DemoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  department: string;
  credentials: {
    email: string;
    password: string;
  };
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  department: string;
}

interface CreateDemoForm {
  tenantName: string;
  companyName: string;
  userCount: number;
  appointmentDays: number;
}

export default function SuperAdminDemoManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateVanillaDialogOpen, setIsCreateVanillaDialogOpen] = useState(false);
  const [isClientOnboardingOpen, setIsClientOnboardingOpen] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'demo' | 'vanilla'>('demo');
  const [selectedTenant, setSelectedTenant] = useState<DemoTenant | null>(null);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null);
  const [createForm, setCreateForm] = useState<CreateDemoForm>({
    tenantName: '',
    companyName: '',
    userCount: 5,
    appointmentDays: 7
  });
  const [vanillaForm, setVanillaForm] = useState({
    tenantName: '',
    companyName: '',
    subscriptionType: 'monthly' as 'monthly' | 'yearly',
    subscriptionPlan: 'medium' as 'trial' | 'basic' | 'medium' | 'large' | 'extra_large'
  });
  
  // Subscription monitoring queries
  const subscriptionStatusQuery = useQuery({
    queryKey: ['/api/superadmin/subscriptions/status'],
    refetchInterval: 60000 // Refresh every minute
  });
  
  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/subscriptions/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send reminders');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recordatorios Enviados",
        description: "Se han enviado los recordatorios de suscripción",
      });
      subscriptionStatusQuery.refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron enviar los recordatorios",
        variant: "destructive",
      });
    }
  });



  // Fetch demo tenants
  const { data: demoTenants = [], isLoading: isLoadingTenants, refetch } = useQuery<DemoTenant[]>({
    queryKey: ['/api/superadmin/demo-tenants'],
  });

  // Create demo tenant mutation
  const createDemoTenantMutation = useMutation({
    mutationFn: async (data: CreateDemoForm) => {
      const response = await fetch('/api/superadmin/demo-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create demo tenant');
      return response.json();
    },
    onSuccess: (data) => {
      
      toast({
        title: "Demo Tenant Created Successfully! 🐕",
        description: `✓ Created tenant "${data.tenant.name}" with ${data.appointmentDays || createForm.appointmentDays} days of demo data
✓ Added ${data.userCount} demo user accounts (Password: demo123)
✓ Generated ${data.clientCount} clients with pets
✓ Created ${data.appointmentCount} sample appointments
✓ Tenant ID: ${data.tenant.id}

Demo tenant is ready for demonstrations and can be refreshed or purged anytime.`,
        duration: 5000,
      });
      
      setIsCreateDialogOpen(false);
      setCreateForm({
        tenantName: '',
        companyName: '',
        userCount: 5,
        appointmentDays: 7
      });
      
      // Store the created tenant data for showing users
      if (data.demoUsers && data.availableRoles) {
        setSelectedTenant({
          ...data.tenant,
          demoUsers: data.demoUsers,
          availableRoles: data.availableRoles,
          userCount: data.userCount,
          appointmentCount: data.appointmentCount,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
        
        // Automatically show users dialog after a short delay
        setTimeout(() => setShowUsersDialog(true), 1000);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/demo-tenants'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Demo Tenant",
        description: error?.message || "An error occurred while creating the demo tenant.",
        variant: "destructive",
      });
    },
  });

  // Create vanilla tenant mutation
  const createVanillaTenantMutation = useMutation({
    mutationFn: async (data: { 
      tenantName: string; 
      companyName: string;
      subscriptionType: 'monthly' | 'yearly';
      subscriptionPlan: 'trial' | 'basic' | 'medium' | 'large' | 'extra_large';
    }) => {
      const response = await fetch('/api/superadmin/vanilla-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create vanilla tenant');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Vanilla Tenant Created Successfully! 🏢",
        description: `✓ Created tenant "${data.tenant.name}"
✓ Added basic roles and services
✓ Created admin user: ${data.adminUser.credentials.email}
✓ Password: ${data.adminUser.credentials.password}
✓ Tenant ID: ${data.tenant.id}

Vanilla tenant is ready for customization and client setup.`,
        duration: 5000,
      });
      
      setIsCreateVanillaDialogOpen(false);
      setVanillaForm({
        tenantName: '',
        companyName: ''
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/demo-tenants'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Vanilla Tenant",
        description: error?.message || "An error occurred while creating the vanilla tenant.",
        variant: "destructive",
      });
    },
  });

  // Refresh demo data mutation
  const refreshDemoDataMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`/api/superadmin/demo-tenants/${tenantId}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to refresh demo data');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Data Refreshed",
        description: `Demo data refreshed with ${data.newAppointments} new appointments and ${data.newUsers} new users.`,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Refresh Demo Data",
        description: error?.message || "An error occurred while refreshing demo data.",
        variant: "destructive",
      });
    },
  });

  // Purge demo tenant mutation
  const purgeDemoTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`/api/superadmin/demo-tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to purge demo tenant');
      return response.json();
    },
    onSuccess: () => {
      
      toast({
        title: "Demo Tenant Purged",
        description: "Demo tenant and all associated data have been permanently deleted.",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/demo-tenants'] });
      refetch(); // Force immediate UI refresh
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Purge Demo Tenant",
        description: error?.message || "An error occurred while purging the demo tenant.",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ tenantId, userId, roleId }: { tenantId: string; userId: string; roleId: string }) => {
      const response = await fetch(`/api/superadmin/demo-tenants/${tenantId}/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });
      if (!response.ok) throw new Error('Failed to update user role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Role Updated",
        description: "User role has been updated successfully",
      });
      setEditingUser(null);
      if (selectedTenant) {
        queryClient.invalidateQueries({ queryKey: ['/api/superadmin/demo-tenants'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Copy user credentials to clipboard
  const copyUserCredentials = async (tenant: DemoTenant) => {
    try {
      let credentialsText = '';
      
      if (tenant.id.startsWith('vanilla-')) {
        // For vanilla tenants, show admin credentials
        credentialsText = `Vanilla Tenant: ${tenant.name}\nTenant ID: ${tenant.id}\n\nAdmin Account:\nEmail: admin@${tenant.name.toLowerCase().replace(/\s+/g, '')}.com\nPassword: admin123\nRole: Administrador\n\nLogin URL: /debug-auth`;
      } else {
        // For demo tenants, show all demo users
        if (tenant.demoUsers && tenant.demoUsers.length > 0) {
          credentialsText = `Demo Tenant: ${tenant.name}\nTenant ID: ${tenant.id}\n\nDemo User Accounts:\n\n`;
          tenant.demoUsers.forEach((user, index) => {
            credentialsText += `${index + 1}. ${user.firstName} ${user.lastName}\n   Email: ${user.credentials.email}\n   Password: ${user.credentials.password}\n   Role: ${user.roleName} (${user.department})\n\n`;
          });
          credentialsText += 'Login URL: /debug-auth';
        } else {
          credentialsText = `Demo Tenant: ${tenant.name}\nTenant ID: ${tenant.id}\n\nNo user credentials available. Please refresh demo data to generate users.`;
        }
      }
      
      await navigator.clipboard.writeText(credentialsText);
      toast({
        title: "Credentials Copied!",
        description: "User credentials have been copied to clipboard",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Failed to Copy",
        description: "Could not copy credentials to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      
      
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/superadmin')}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tenant Management</h1>
          <p className="text-muted-foreground">
            Create and manage tenants for demonstrations and client onboarding
          </p>
        </div>

        {/* Mobile-Friendly Client Onboarding */}
        <Card className="mb-6 bg-gray-850 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Onboarding de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Crear tenants para demostraciones o clientes en producción - optimizado para celular
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setOnboardingType('demo');
                  setIsClientOnboardingOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-16 flex-col gap-1"
                data-testid="button-create-demo-simple"
              >
                <Smartphone className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium">Crear Demo</div>
                  <div className="text-xs opacity-80">Para demostraciones</div>
                </div>
              </Button>
              <Button
                onClick={() => {
                  setOnboardingType('vanilla');
                  setIsClientOnboardingOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white h-16 flex-col gap-1"
                data-testid="button-create-vanilla-simple"
              >
                <Monitor className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium">Crear Cliente</div>
                  <div className="text-xs opacity-80">Para producción</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Demo Tenant Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Demo Tenant
              </span>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-demo">
                    <Plus className="w-4 h-4 mr-2" />
                    New Demo Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Demo Tenant</DialogTitle>
                    <DialogDescription>
                      Create a new demo tenant with sample users and appointments for demonstration purposes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tenantName">Tenant Name</Label>
                      <Input
                        id="tenantName"
                        placeholder="Demo Clinic"
                        value={createForm.tenantName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, tenantName: e.target.value }))}
                        data-testid="input-tenant-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Demo Veterinary Corp"
                        value={createForm.companyName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                        data-testid="input-company-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userCount">Number of Demo Users</Label>
                      <Input
                        id="userCount"
                        type="number"
                        min="1"
                        max="20"
                        value={createForm.userCount}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, userCount: parseInt(e.target.value) || 5 }))}
                        data-testid="input-user-count"
                      />
                    </div>
                    <div>
                      <Label htmlFor="appointmentDays">Appointment History (Days)</Label>
                      <Input
                        id="appointmentDays"
                        type="number"
                        min="1"
                        max="30"
                        value={createForm.appointmentDays}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, appointmentDays: parseInt(e.target.value) || 7 }))}
                        data-testid="input-appointment-days"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createDemoTenantMutation.mutate(createForm)}
                        disabled={createDemoTenantMutation.isPending || !createForm.tenantName || !createForm.companyName}
                        data-testid="button-confirm-create"
                      >
                        {createDemoTenantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Demo Tenant
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Demo tenants are automatically populated with sample clients, pets, appointments, and staff members. 
              They can be refreshed with new data or completely purged when no longer needed.
            </p>
          </CardContent>
        </Card>

        {/* Create Vanilla Tenant Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Create Vanilla Tenant
              </span>
              <Dialog open={isCreateVanillaDialogOpen} onOpenChange={setIsCreateVanillaDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950" data-testid="button-create-vanilla">
                    <Plus className="w-4 h-4 mr-2" />
                    New Vanilla Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Vanilla Tenant</DialogTitle>
                    <DialogDescription>
                      Create a new empty tenant with only basic roles and services for client onboarding.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="vanillaTenantName">Tenant Name</Label>
                      <Input
                        id="vanillaTenantName"
                        placeholder="New Veterinary Clinic"
                        value={vanillaForm.tenantName}
                        onChange={(e) => setVanillaForm(prev => ({ ...prev, tenantName: e.target.value }))}
                        data-testid="input-vanilla-tenant-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vanillaCompanyName">Company Name</Label>
                      <Input
                        id="vanillaCompanyName"
                        placeholder="New Veterinary Corp"
                        value={vanillaForm.companyName}
                        onChange={(e) => setVanillaForm(prev => ({ ...prev, companyName: e.target.value }))}
                        data-testid="input-vanilla-company-name"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateVanillaDialogOpen(false)}
                        data-testid="button-cancel-vanilla"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createVanillaTenantMutation.mutate(vanillaForm)}
                        disabled={createVanillaTenantMutation.isPending || !vanillaForm.tenantName || !vanillaForm.companyName}
                        data-testid="button-confirm-vanilla"
                      >
                        {createVanillaTenantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Vanilla Tenant
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vanilla tenants contain only essential roles and services, ready for client customization and onboarding. 
              Perfect for setting up new client accounts from scratch.
            </p>
          </CardContent>
        </Card>

        {/* Demo Tenants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Demo Tenants ({demoTenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTenants ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading demo tenants...</p>
              </div>
            ) : demoTenants.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No demo tenants found</p>
                <p className="text-sm text-muted-foreground">Create your first demo tenant to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {demoTenants.map((tenant: DemoTenant) => (
                  <div key={tenant.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{tenant.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {tenant.id}</p>
                      </div>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{tenant.userCount} users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{tenant.appointmentCount} appointments</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Created:</span><br />
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Last Activity:</span><br />
                        {new Date(tenant.lastActivity).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyUserCredentials(tenant)}
                        data-testid={`button-copy-users-${tenant.id}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Users
                      </Button>
                      
                      {!tenant.id.startsWith('vanilla-') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshDemoDataMutation.mutate(tenant.id)}
                          disabled={refreshDemoDataMutation.isPending}
                          data-testid={`button-refresh-${tenant.id}`}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Data
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-purge-${tenant.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Purge
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Purge Demo Tenant
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the demo tenant "{tenant.name}" and all associated data including:
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All users and staff</li>
                                <li>All clients and pets</li>
                                <li>All appointments and medical records</li>
                                <li>All billing and inventory data</li>
                              </ul>
                              <strong className="text-red-600">This action cannot be undone.</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => purgeDemoTenantMutation.mutate(tenant.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`confirm-purge-${tenant.id}`}
                            >
                              Purge Demo Tenant
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Onboarding Dialog */}
        <Dialog open={isClientOnboardingOpen} onOpenChange={setIsClientOnboardingOpen}>
          <DialogContent className="sm:max-w-md bg-gray-850 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-blue-300">
                {onboardingType === 'demo' ? '📱 Crear Tenant Demo' : '🏢 Onboarding Cliente'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {onboardingType === 'demo' 
                  ? 'Crear un tenant de demostración con datos de ejemplo'
                  : 'Crear un tenant para cliente en producción con cuenta de administrador'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-tenant-name" className="text-gray-300">
                  Nombre del {onboardingType === 'demo' ? 'Demo' : 'Cliente'}
                </Label>
                <Input
                  id="client-tenant-name"
                  value={onboardingType === 'demo' ? '' : vanillaForm.tenantName}
                  onChange={(e) => {
                    if (onboardingType === 'demo') {
                      // Demo form will be handled separately
                    } else {
                      setVanillaForm(prev => ({ ...prev, tenantName: e.target.value }));
                    }
                  }}
                  placeholder={onboardingType === 'demo' ? 'Demo Veterinaria Central' : 'Clínica Veterinaria San Pedro'}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-client-tenant-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-company-name" className="text-gray-300">
                  Nombre de la Empresa
                </Label>
                <Input
                  id="client-company-name"
                  value={onboardingType === 'demo' ? '' : vanillaForm.companyName}
                  onChange={(e) => {
                    if (onboardingType === 'demo') {
                      // Demo form will be handled separately
                    } else {
                      setVanillaForm(prev => ({ ...prev, companyName: e.target.value }));
                    }
                  }}
                  placeholder={onboardingType === 'demo' ? 'Demo Corp Veterinaria' : 'Corporativo Veterinario S.A.'}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-client-company-name"
                />
              </div>
              
              {onboardingType === 'demo' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="client-user-count" className="text-gray-300">
                      Usuarios de Demostración
                    </Label>
                    <Select
                      value="5"
                      onValueChange={(value) => {}}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-client-user-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'usuario' : 'usuarios'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client-days-history" className="text-gray-300">
                      Historial de Citas
                    </Label>
                    <Select
                      value="7"
                      onValueChange={(value) => {}}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-client-days-history">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {[1, 3, 7, 14, 21, 30].map(days => (
                          <SelectItem key={days} value={days.toString()}>
                            {days} {days === 1 ? 'día' : 'días'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {onboardingType === 'vanilla' && (
                <>
                  {/* Subscription Details */}
                  <div className="space-y-4 border border-gray-600 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">💳 Detalles de Suscripción</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-300">Plan de Suscripción</Label>
                      <Select
                        value={vanillaForm.subscriptionPlan}
                        onValueChange={(value: 'trial' | 'basic' | 'medium' | 'large' | 'extra_large') => 
                          setVanillaForm(prev => ({ ...prev, subscriptionPlan: value }))
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-subscription-plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="trial">Trial (Gratis - 30 días)</SelectItem>
                          <SelectItem value="basic">Basic - $29/mes</SelectItem>
                          <SelectItem value="medium">Medium - $59/mes</SelectItem>
                          <SelectItem value="large">Large - $99/mes</SelectItem>
                          <SelectItem value="extra_large">Extra Large - $149/mes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-300">Período de Facturación</Label>
                      <Select
                        value={vanillaForm.subscriptionType}
                        onValueChange={(value: 'monthly' | 'yearly') => 
                          setVanillaForm(prev => ({ ...prev, subscriptionType: value }))
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-subscription-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="monthly">Mensual (cada 30 días)</SelectItem>
                          <SelectItem value="yearly">Anual (12 meses - 20% descuento)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                      <div className="bg-gray-750 p-3 rounded text-xs text-gray-300">
                      <div className="flex justify-between mb-1">
                        <span>Fecha de inicio:</span>
                        <span className="text-blue-300">{new Date().toLocaleDateString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Próximo pago:</span>
                        <span className="text-yellow-300">
                          {new Date(Date.now() + (vanillaForm.subscriptionType === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <span className="text-green-300">Activo</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin Account Info */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">✅ Cuenta de Administrador</h4>
                    <p className="text-xs text-gray-400 mb-2">
                      Se creará automáticamente una cuenta de administrador:
                    </p>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div><strong>Email:</strong> admin@[nombre-tenant].com</div>
                      <div><strong>Password:</strong> admin123</div>
                      <div><strong>Rol:</strong> Administrador</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsClientOnboardingOpen(false)}
                className="flex-1"
                data-testid="button-cancel-client-onboarding"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (onboardingType === 'demo') {
                    // Handle demo creation separately
                  } else {
                    createVanillaTenantMutation.mutate(vanillaForm);
                  }
                  setIsClientOnboardingOpen(false);
                }}
                disabled={onboardingType === 'demo' ? createDemoTenantMutation.isPending : createVanillaTenantMutation.isPending}
                className={`flex-1 ${
                  onboardingType === 'demo' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
                data-testid="button-confirm-client-onboarding"
              >
                {(onboardingType === 'demo' ? createDemoTenantMutation.isPending : createVanillaTenantMutation.isPending) && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                {onboardingType === 'demo' ? 'Crear Demo' : 'Crear Cliente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}