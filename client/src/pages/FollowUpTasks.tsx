import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, AlertCircle, CheckCircle, Clock, Trash2, Edit, Search, 
  TrendingUp, AlertTriangle, Calendar, User, Target, Zap,
  Filter, MoreHorizontal, Eye, ChevronDown, ArrowLeft
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { FollowUpTask, InsertFollowUpTask } from '@shared/schema';

const followUpTaskSchema = z.object({
  title: z.string().min(1, 'Título es requerido'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  taskType: z.string().min(1, 'Tipo de tarea es requerido'),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

type FollowUpTaskFormData = z.infer<typeof followUpTaskSchema>;

const priorityConfig = {
  low: { 
    label: 'Baja', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-400',
    icon: Clock
  },
  normal: { 
    label: 'Normal', 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-400',
    icon: Target
  },
  high: { 
    label: 'Alta', 
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-400',
    icon: AlertTriangle
  },
  urgent: { 
    label: 'Urgente', 
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-400',
    icon: Zap
  },
};

const statusConfig = {
  pending: { 
    label: 'Pendientes', 
    color: 'bg-yellow-50 dark:bg-yellow-950', 
    border: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-700 dark:text-yellow-300'
  },
  in_progress: { 
    label: 'En Progreso', 
    color: 'bg-blue-50 dark:bg-blue-950', 
    border: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  completed: { 
    label: 'Completadas', 
    color: 'bg-emerald-50 dark:bg-emerald-950', 
    border: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300'
  },
  cancelled: { 
    label: 'Canceladas', 
    color: 'bg-gray-50 dark:bg-gray-950', 
    border: 'border-gray-200 dark:border-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300'
  },
};

interface FollowUpTasksProps {
  tenantId: string;
}

export default function FollowUpTasks({ tenantId }: FollowUpTasksProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedPriority, setPriority] = useState<string>('all');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUpTask | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FollowUpTaskFormData>({
    resolver: zodResolver(followUpTaskSchema),
    defaultValues: {
      priority: 'normal',
      taskType: 'general',
    },
  });

  // Fetch all tasks for stats
  const { data: allTasksResponse } = useQuery({
    queryKey: ['/api/follow-up-tasks', tenantId, 'all', 'all', 'createdAt', 'desc', 1],
    queryFn: async () => {
      const response = await fetch(`/api/follow-up-tasks/${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  // Fetch filtered tasks
  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['/api/follow-up-tasks', tenantId, selectedStatus, selectedPriority, searchQuery],
    queryFn: async (): Promise<{ tasks: FollowUpTask[], total: number }> => {
      const params = new URLSearchParams({ 
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedPriority !== 'all' && { priority: selectedPriority }),
        ...(searchQuery && { search: searchQuery }),
        limit: '500'
      });
      const response = await fetch(`/api/follow-up-tasks/${tenantId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  // Calculate statistics
  const stats = allTasksResponse ? {
    total: allTasksResponse.tasks?.length || 0,
    pending: allTasksResponse.tasks?.filter((t: FollowUpTask) => t.status === 'pending').length || 0,
    inProgress: allTasksResponse.tasks?.filter((t: FollowUpTask) => t.status === 'in_progress').length || 0,
    completed: allTasksResponse.tasks?.filter((t: FollowUpTask) => t.status === 'completed').length || 0,
    urgent: allTasksResponse.tasks?.filter((t: FollowUpTask) => t.priority === 'urgent').length || 0,
    high: allTasksResponse.tasks?.filter((t: FollowUpTask) => t.priority === 'high').length || 0,
  } : { total: 0, pending: 0, inProgress: 0, completed: 0, urgent: 0, high: 0 };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertFollowUpTask) => {
      const response = await fetch('/api/follow-up-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-tasks'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: '✅ Tarea creada exitosamente',
        description: 'La nueva tarea de seguimiento ha sido añadida al sistema.',
      });
    },
    onError: () => {
      toast({
        title: '❌ Error al crear tarea',
        description: 'No se pudo crear la tarea de seguimiento. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<InsertFollowUpTask> }) => {
      const response = await fetch(`/api/follow-up-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-tasks'] });
      setEditingTask(null);
      toast({
        title: '✅ Tarea actualizada',
        description: 'Los cambios han sido guardados correctamente.',
      });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/follow-up-tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: 'current-user' }),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-tasks'] });
      toast({
        title: '🎉 ¡Tarea completada!',
        description: 'Excelente trabajo. La tarea ha sido marcada como completada.',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/follow-up-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-tasks'] });
      toast({
        title: '🗑️ Tarea eliminada',
        description: 'La tarea ha sido eliminada permanentemente.',
      });
    },
  });

  const onSubmit = (data: FollowUpTaskFormData) => {
    const taskData: InsertFollowUpTask = {
      ...data,
      tenantId,
      clientId: 'temp-client',
      petId: 'temp-pet',
    };

    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, updates: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const TaskCard = ({ task }: { task: FollowUpTask }) => {
    const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig];
    const PriorityIcon = priorityInfo.icon;

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 border-l-4" 
            style={{ borderLeftColor: priorityInfo.dot.replace('bg-', '#') }}>
        <CardContent className="p-6 space-y-4">
          {/* Header with priority indicator */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${priorityInfo.color}`}>
                <PriorityIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                  {task.title}
                </h3>
                <Badge variant="outline" className={priorityInfo.color}>
                  {priorityInfo.label}
                </Badge>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Meta information */}
          <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Vence: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Creada: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {task.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => completeTaskMutation.mutate(task.id)}
                disabled={completeTaskMutation.isPending}
                className="flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950"
                data-testid={`button-complete-${task.id}`}
              >
                <CheckCircle className="h-4 w-4" />
                Completar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingTask(task);
                form.reset({
                  title: task.title,
                  description: task.description || '',
                  priority: task.priority as any,
                  taskType: task.taskType,
                  dueDate: task.dueDate || '',
                });
                setIsCreateDialogOpen(true);
              }}
              className="flex items-center gap-2"
              data-testid={`button-edit-${task.id}`}
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteTaskMutation.mutate(task.id)}
              disabled={deleteTaskMutation.isPending}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950"
              data-testid={`button-delete-${task.id}`}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6" data-testid="follow-up-tasks-page">
      {/* Modern Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => window.history.back()}
                className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              📋 Tareas de Seguimiento
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
              Gestiona y supervisa todas las tareas pendientes, información faltante y seguimientos 
              requeridos para mantener la operación al día.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg" data-testid="button-create-task">
                <Plus className="h-5 w-5 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingTask ? '✏️ Editar Tarea' : '✨ Nueva Tarea de Seguimiento'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título de la Tarea</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Completar diagnóstico de Luna" 
                            className="h-12" 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe los detalles de la tarea..." 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Selecciona prioridad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">🟢 Baja</SelectItem>
                              <SelectItem value="normal">🔵 Normal</SelectItem>
                              <SelectItem value="high">🟡 Alta</SelectItem>
                              <SelectItem value="urgent">🔴 Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Límite</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-12" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="taskType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Tarea</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medical_follow_up">🏥 Seguimiento Médico</SelectItem>
                            <SelectItem value="grooming_follow_up">✂️ Seguimiento Grooming</SelectItem>
                            <SelectItem value="missing_diagnosis">🔍 Diagnóstico Faltante</SelectItem>
                            <SelectItem value="missing_treatment">💊 Tratamiento Faltante</SelectItem>
                            <SelectItem value="missing_price">💰 Precio Faltante</SelectItem>
                            <SelectItem value="incomplete_record">📝 Registro Incompleto</SelectItem>
                            <SelectItem value="general">📋 General</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="px-6"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                      className="px-6"
                    >
                      {editingTask ? '💾 Actualizar' : '✨ Crear'} Tarea
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats.total}
            </div>
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
              {stats.pending}
            </div>
            <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pendientes</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats.inProgress}
            </div>
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">En Progreso</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {stats.completed}
            </div>
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Completadas</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
              {stats.urgent}
            </div>
            <div className="text-sm font-medium text-red-700 dark:text-red-300">Urgentes</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {stats.high}
            </div>
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Alta Prioridad</div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar tareas por título o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {Object.entries(statusConfig).map(([status, config]) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 ${selectedStatus === status ? '' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  {config.label}
                </Button>
              ))}
            </div>

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={setPriority}>
              <SelectTrigger className="w-48 h-12 bg-white dark:bg-gray-950">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🔘 Todas las Prioridades</SelectItem>
                <SelectItem value="low">🟢 Baja</SelectItem>
                <SelectItem value="normal">🔵 Normal</SelectItem>
                <SelectItem value="high">🟡 Alta</SelectItem>
                <SelectItem value="urgent">🔴 Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">Cargando tareas...</p>
          </div>
        ) : !tasksResponse || tasksResponse.tasks.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
            <CardContent className="text-center py-16">
              <div className="text-6xl mb-6">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No hay tareas de seguimiento
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {selectedStatus === 'all' 
                  ? 'Aún no hay tareas creadas. ¡Crea la primera tarea para comenzar!'
                  : `No hay tareas con estado "${statusConfig[selectedStatus as keyof typeof statusConfig]?.label.toLowerCase()}".`}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Crear Primera Tarea
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {tasksResponse.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}