import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Settings,
  Edit,
  Trash2,
  Mail,
  Key
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  systemRoles: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
  }>;
  companyRoles: Array<{
    id: string;
    companyId: string;
    companyName: string;
    roleName: string;
    isSupertenant: boolean;
  }>;
}

interface SystemRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

export function TeamMemberManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    systemRoleId: '',
    sendInvite: true
  });

  // Get team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/superadmin/team-members'],
    retry: false,
  });

  // Get available system roles
  const { data: systemRoles = [], isLoading: rolesLoading } = useQuery<SystemRole[]>({
    queryKey: ['/api/superadmin/system-roles'],
    retry: false,
  });

  // Invite team member mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (memberData: typeof inviteData) => {
      return await apiRequest('/api/superadmin/team-members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/team-members'] });
      setIsInviteDialogOpen(false);
      setInviteData({ email: '', firstName: '', lastName: '', systemRoleId: '', sendInvite: true });
      toast({
        title: "Miembro de equipo invitado",
        description: "El miembro del equipo ha sido agregado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo invitar al miembro del equipo.",
        variant: "destructive",
      });
    },
  });

  // Assign system role mutation
  const assignSystemRoleMutation = useMutation({
    mutationFn: async ({ userId, systemRoleId }: { userId: string; systemRoleId: string }) => {
      return await apiRequest('/api/superadmin/team-members/assign-system-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, systemRoleId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/team-members'] });
      toast({
        title: "Rol asignado",
        description: "El rol del sistema ha sido asignado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el rol del sistema.",
        variant: "destructive",
      });
    },
  });

  // Remove system role mutation
  const removeSystemRoleMutation = useMutation({
    mutationFn: async ({ userId, systemRoleId }: { userId: string; systemRoleId: string }) => {
      return await apiRequest('/api/superadmin/team-members/remove-system-role', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, systemRoleId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/team-members'] });
      toast({
        title: "Rol removido",
        description: "El rol del sistema ha sido removido exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo remover el rol del sistema.",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email || !inviteData.systemRoleId) {
      toast({
        title: "Error de validación",
        description: "Email y rol del sistema son requeridos.",
        variant: "destructive",
      });
      return;
    }
    inviteTeamMemberMutation.mutate(inviteData);
  };

  const handleAssignRole = (userId: string, systemRoleId: string) => {
    assignSystemRoleMutation.mutate({ userId, systemRoleId });
  };

  const handleRemoveRole = (userId: string, systemRoleId: string) => {
    removeSystemRoleMutation.mutate({ userId, systemRoleId });
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'developer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sysadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'debug':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (membersLoading || rolesLoading) {
    return <div className="flex justify-center items-center h-64">Cargando equipo...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestión de Equipo VetGroom</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Administra desarrolladores, super admins y acceso de debug
              </p>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Invitar Miembro</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invitar Miembro del Equipo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="usuario@vetgroom.com"
                      required
                      data-testid="input-invite-email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        value={inviteData.firstName}
                        onChange={(e) => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Juan"
                        data-testid="input-invite-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        value={inviteData.lastName}
                        onChange={(e) => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Pérez"
                        data-testid="input-invite-lastname"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systemRole">Rol del Sistema *</Label>
                    <Select 
                      value={inviteData.systemRoleId} 
                      onValueChange={(value) => setInviteData(prev => ({ ...prev, systemRoleId: value }))}
                    >
                      <SelectTrigger data-testid="select-invite-role">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center space-x-2">
                              <span>{role.displayName}</span>
                              <Badge variant="outline" className="text-xs">
                                {role.name}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {systemRoles.find(r => r.id === inviteData.systemRoleId)?.description}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={inviteTeamMemberMutation.isPending}
                      data-testid="button-send-invite"
                    >
                      {inviteTeamMemberMutation.isPending ? "Invitando..." : "Enviar Invitación"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay miembros del equipo registrados
              </div>
            ) : (
              teamMembers.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.firstName?.[0] || member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.firstName && member.lastName 
                          ? `${member.firstName} ${member.lastName}` 
                          : member.email
                        }
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.systemRoles.map((role) => (
                          <Badge 
                            key={role.id} 
                            variant="outline" 
                            className={getRoleBadgeColor(role.name)}
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            {role.displayName}
                          </Badge>
                        ))}
                        {member.companyRoles.map((role) => (
                          <Badge key={role.id} variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            {role.companyName}
                            {role.isSupertenant && " (Super Admin)"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Select 
                      onValueChange={(roleId) => handleAssignRole(member.id, roleId)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Asignar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {systemRoles
                          .filter(role => !member.systemRoles.some(mr => mr.id === role.id))
                          .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {member.systemRoles.length > 0 && (
                      <Select 
                        onValueChange={(roleId) => handleRemoveRole(member.id, roleId)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Remover rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {member.systemRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              Remover {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Roles Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Roles del Sistema Disponibles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemRoles.map((role) => (
              <div key={role.id} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getRoleBadgeColor(role.name)}>
                    {role.name}
                  </Badge>
                  <span className="font-medium">{role.displayName}</span>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}