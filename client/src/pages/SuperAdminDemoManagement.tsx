import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import anime from "animejs/lib/anime.es.js";
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
  Loader2
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

interface DemoTenant {
  id: string;
  name: string;
  companyId: string;
  userCount: number;
  appointmentCount: number;
  createdAt: string;
  lastActivity: string;
  status: 'active' | 'inactive';
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showTrashAnimation, setShowTrashAnimation] = useState(false);
  const trashAnimationRef = useRef<HTMLDivElement>(null);
  const [createForm, setCreateForm] = useState<CreateDemoForm>({
    tenantName: '',
    companyName: '',
    userCount: 5,
    appointmentDays: 7
  });

  // Function to trigger floating trash animation
  const triggerTrashAnimation = () => {
    setShowTrashAnimation(true);
    
    // Animate the trash can
    if (trashAnimationRef.current) {
      anime({
        targets: trashAnimationRef.current,
        translateY: [-50, -120, -100, -80, -40],
        translateX: [0, 20, -15, 10, -5, 0],
        scale: [1, 1.2, 1.1, 1.3, 1.0],
        rotate: [0, 10, -8, 5, -3, 0],
        opacity: [1, 0.9, 1, 0.8, 0.6, 0],
        duration: 4000,
        easing: 'easeOutBounce',
        complete: () => {
          setShowTrashAnimation(false);
        }
      });
    }
  };

  // Fetch demo tenants
  const { data: demoTenants = [], isLoading: isLoadingTenants, refetch } = useQuery({
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
        title: "Demo Tenant Created Successfully!",
        description: `✓ Created tenant "${data.tenant.name}" with ${data.appointmentDays || createForm.appointmentDays} days of demo data
✓ Added ${data.userCount} demo user accounts 
✓ Generated ${data.clientCount} clients with pets
✓ Created ${data.appointmentCount} sample appointments
✓ Tenant ID: ${data.tenant.id}

Demo tenant is ready for demonstrations and can be refreshed or purged anytime.`,
      });
      setIsCreateDialogOpen(false);
      setCreateForm({
        tenantName: '',
        companyName: '',
        userCount: 5,
        appointmentDays: 7
      });
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
      // Trigger the floating trash animation
      triggerTrashAnimation();
      
      toast({
        title: "Demo Tenant Purged",
        description: "Demo tenant and all associated data have been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/demo-tenants'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Purge Demo Tenant",
        description: error?.message || "An error occurred while purging the demo tenant.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      
      {/* Floating Trash Animation */}
      {showTrashAnimation && (
        <div 
          ref={trashAnimationRef}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ 
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
            willChange: 'transform, opacity'
          }}
        >
          <Trash2 className="w-16 h-16 text-red-500 fill-red-400" />
        </div>
      )}
      
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Demo Tenant Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and purge demo tenants for demonstration purposes
          </p>
        </div>

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
                        onClick={() => refreshDemoDataMutation.mutate(tenant.id)}
                        disabled={refreshDemoDataMutation.isPending}
                        data-testid={`button-refresh-${tenant.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                      </Button>
                      
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
      </div>
    </div>
  );
}