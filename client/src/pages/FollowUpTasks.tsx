import { useState } from 'react';
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
import { Plus, AlertCircle, CheckCircle, Clock, Trash2, Edit } from 'lucide-react';
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

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface FollowUpTasksProps {
  tenantId: string;
}

export default function FollowUpTasks({ tenantId }: FollowUpTasksProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
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

  // Fetch follow-up tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/follow-up-tasks', tenantId, statusFilter, priorityFilter],
    queryFn: async (): Promise<FollowUpTask[]> => {
      const params = new URLSearchParams({ 
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter })
      });
      const response = await fetch(`/api/follow-up-tasks/${tenantId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

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
        title: 'Tarea creada',
        description: 'La tarea de seguimiento ha sido creada exitosamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarea de seguimiento.',
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
        title: 'Tarea actualizada',
        description: 'La tarea de seguimiento ha sido actualizada exitosamente.',
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
        title: 'Tarea completada',
        description: 'La tarea de seguimiento ha sido marcada como completada.',
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
        title: 'Tarea eliminada',
        description: 'La tarea de seguimiento ha sido eliminada exitosamente.',
      });
    },
  });

  // Auto-generate tasks mutation
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/follow-up-tasks/auto-generate/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to auto-generate tasks');
      return response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-tasks'] });
      toast({
        title: 'Tareas generadas',
        description: `Se generaron ${response.generated} tareas de seguimiento automáticamente.`,
      });
    },
  });

  const onSubmit = (data: FollowUpTaskFormData) => {
    const taskData: InsertFollowUpTask = {
      ...data,
      tenantId,
      clientId: 'temp-client', // This would need to be selected from a dropdown
      petId: 'temp-pet', // This would need to be selected from a dropdown
    };

    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, updates: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="follow-up-tasks-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tareas de Seguimiento
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona las tareas de seguimiento y información faltante
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending}
            variant="outline"
            data-testid="button-auto-generate"
          >
            Generar Automático
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea de Seguimiento'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingresa el título de la tarea" {...field} />
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
                          <Textarea placeholder="Describe la tarea..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="taskType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Tarea</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medical_follow_up">Seguimiento Médico</SelectItem>
                            <SelectItem value="grooming_follow_up">Seguimiento Grooming</SelectItem>
                            <SelectItem value="missing_diagnosis">Diagnóstico Faltante</SelectItem>
                            <SelectItem value="missing_treatment">Tratamiento Faltante</SelectItem>
                            <SelectItem value="missing_price">Precio Faltante</SelectItem>
                            <SelectItem value="incomplete_record">Registro Incompleto</SelectItem>
                            <SelectItem value="general">General</SelectItem>
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
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    >
                      {editingTask ? 'Actualizar' : 'Crear'} Tarea
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Cargando tareas...</div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No hay tareas de seguimiento disponibles.
              </p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  {getPriorityIcon(task.priority || 'normal')}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                        {task.priority === 'low' ? 'Baja' : 
                         task.priority === 'normal' ? 'Normal' :
                         task.priority === 'high' ? 'Alta' : 'Urgente'}
                      </Badge>
                      <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                        {task.status === 'pending' ? 'Pendiente' :
                         task.status === 'in_progress' ? 'En Progreso' :
                         task.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </Badge>
                    </div>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Fecha límite: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      disabled={completeTaskMutation.isPending}
                      data-testid={`button-complete-${task.id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
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
                    data-testid={`button-edit-${task.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    disabled={deleteTaskMutation.isPending}
                    data-testid={`button-delete-${task.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}