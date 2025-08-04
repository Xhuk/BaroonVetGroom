import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Eye, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  AlertTriangle,
  CheckCircle,
  Filter,
  Search,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { DebugControls } from "@/components/DebugControls";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MedicalAppointment, Pet, Client, Staff } from "@shared/schema";

interface FollowUpTask extends MedicalAppointment {
  pet?: Pet;
  client?: Client;
  veterinarian?: Staff;
  daysOverdue?: number;
  priority?: "high" | "medium" | "low";
}

export default function FollowUpTasks() {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all medical appointments that require follow-up
  const { data: followUpTasks = [], isLoading } = useQuery<FollowUpTask[]>({
    queryKey: ["/api/medical-appointments/follow-up", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: veterinarians = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id, "veterinarian"],
    enabled: !!currentTenant?.id,
  });

  // Mark follow-up as completed
  const completeFollowUpMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest(`/api/medical-appointments/${appointmentId}/complete-followup`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments/follow-up"] });
      toast({
        title: "Seguimiento completado",
        description: "El seguimiento ha sido marcado como completado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo completar el seguimiento",
        variant: "destructive",
      });
    },
  });

  // Schedule follow-up appointment
  const scheduleFollowUpMutation = useMutation({
    mutationFn: async ({ appointmentId, followUpDate }: { appointmentId: string; followUpDate: string }) => {
      return apiRequest(`/api/medical-appointments/${appointmentId}/schedule-followup`, {
        method: "PUT",
        body: JSON.stringify({ followUpDate }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments/follow-up"] });
      toast({
        title: "Seguimiento programado",
        description: "La fecha de seguimiento ha sido actualizada",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo programar el seguimiento",
        variant: "destructive",
      });
    },
  });

  // Enhanced follow-up tasks with additional data
  const enrichedTasks = followUpTasks.map(task => {
    const pet = pets.find(p => p.id === task.petId);
    const client = clients.find(c => c.id === task.clientId);
    const veterinarian = veterinarians.find(v => v.id === task.veterinarianId);
    
    // Calculate days overdue
    let daysOverdue = 0;
    let priority: "high" | "medium" | "low" = "low";
    
    if (task.followUpDate) {
      const followUpDate = new Date(task.followUpDate);
      const today = new Date();
      const diffTime = today.getTime() - followUpDate.getTime();
      daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 7) priority = "high";
      else if (daysOverdue > 3) priority = "medium";
      else if (daysOverdue >= 0) priority = "low";
    }

    return {
      ...task,
      pet,
      client,
      veterinarian,
      daysOverdue,
      priority,
    };
  });

  // Filter tasks
  const filteredTasks = enrichedTasks.filter(task => {
    const matchesSearch = 
      !searchTerm ||
      task.pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = 
      priorityFilter === "all" || task.priority === priorityFilter;
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "pending" && task.followUpRequired && !task.isConfirmed) ||
      (statusFilter === "overdue" && task.daysOverdue && task.daysOverdue > 0) ||
      (statusFilter === "completed" && task.isConfirmed);

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-4 h-4" />;
      case "medium": return <Clock className="w-4 h-4" />;
      case "low": return <CheckCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="w-8 h-8 text-pink-600" />
              Tareas de Seguimiento
            </h1>
            <p className="text-muted-foreground">
              Gestión de seguimientos médicos pendientes
            </p>
          </div>
        </div>
        <DebugControls />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Buscar mascota o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-followup"
              />
            </div>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              data-testid="select-priority-filter"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta prioridad</option>
              <option value="medium">Prioridad media</option>
              <option value="low">Baja prioridad</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              data-testid="select-status-filter"
            >
              <option value="pending">Pendientes</option>
              <option value="overdue">Vencidos</option>
              <option value="completed">Completados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{enrichedTasks.length}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {enrichedTasks.filter(t => t.followUpRequired && !t.isConfirmed).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">
                  {enrichedTasks.filter(t => t.daysOverdue && t.daysOverdue > 0).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold text-green-600">
                  {enrichedTasks.filter(t => t.isConfirmed).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Cargando tareas de seguimiento...</p>
            </CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay tareas de seguimiento</h3>
              <p className="text-muted-foreground">
                No se encontraron tareas con los filtros seleccionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(task.priority!)}>
                        {getPriorityIcon(task.priority!)}
                        <span className="ml-1 capitalize">{task.priority}</span>
                      </Badge>
                      
                      {task.daysOverdue! > 0 && (
                        <Badge variant="destructive">
                          {task.daysOverdue} días vencido
                        </Badge>
                      )}
                      
                      <Badge variant="outline">
                        {task.visitType}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">
                        {task.pet?.name} - {task.client?.name}
                      </h3>
                      <p className="text-muted-foreground">
                        Veterinario: {task.veterinarian?.name}
                      </p>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p><strong>Diagnóstico:</strong> {task.diagnosis || "No especificado"}</p>
                      <p><strong>Instrucciones:</strong> {task.followUpInstructions || "No especificado"}</p>
                      {task.followUpDate && (
                        <p>
                          <strong>Fecha programada:</strong> {" "}
                          {format(new Date(task.followUpDate), "PPP", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {!task.followUpDate && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-schedule-followup">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Programar
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                scheduleFollowUpMutation.mutate({
                                  appointmentId: task.id,
                                  followUpDate: date.toISOString(),
                                });
                              }
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    
                    {!task.isConfirmed && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => completeFollowUpMutation.mutate(task.id)}
                        disabled={completeFollowUpMutation.isPending}
                        data-testid="button-complete-followup"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}