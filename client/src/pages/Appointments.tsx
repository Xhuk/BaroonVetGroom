import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Clock, MapPin, User, Phone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Appointment, Client, Pet, Room, Staff, Service } from "@shared/schema";

export default function Appointments() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: pets } = useQuery<Pet[]>({
    queryKey: ["/api/pets", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: staff } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/appointments`, {
        method: "POST",
        body: JSON.stringify({ ...data, tenantId: currentTenant?.id }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita creada",
        description: "La cita se ha programado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  if (appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Citas</h1>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleCreateAppointment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      clientId: formData.get("clientId"),
      petId: formData.get("petId"),
      serviceId: formData.get("serviceId"),
      roomId: formData.get("roomId"),
      staffId: formData.get("staffId"),
      scheduledDate: formData.get("scheduledDate"),
      scheduledTime: formData.get("scheduledTime"),
      logistics: formData.get("logistics"),
      notes: formData.get("notes"),
    };

    createAppointmentMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getLogisticsIcon = (logistics: string) => {
    return logistics === "pickup" ? <MapPin className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Gestión de Citas</h1>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Programar Nueva Cita</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Cliente</Label>
                <Select name="clientId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="petId">Mascota</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mascota" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceId">Servicio</Label>
                <Select name="serviceId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="logistics">Logística</Label>
                <Select name="logistics" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Recogemos (Van)</SelectItem>
                    <SelectItem value="delivered">Cliente trae mascota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduledDate">Fecha</Label>
                <Input 
                  name="scheduledDate" 
                  type="date" 
                  required 
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="scheduledTime">Hora</Label>
                <Input name="scheduledTime" type="time" required />
              </div>

              <div>
                <Label htmlFor="roomId">Sala</Label>
                <Select name="roomId">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="staffId">Personal</Label>
                <Select name="staffId">
                  <SelectTrigger>
                    <SelectValue placeholder="Asignar personal" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea name="notes" placeholder="Información adicional sobre la cita..." />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createAppointmentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createAppointmentMutation.isPending ? "Programando..." : "Programar Cita"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {appointments?.map((appointment) => (
          <Card key={appointment.id} className="border-l-4 border-l-blue-400">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status === "scheduled" && "Programada"}
                      {appointment.status === "in_progress" && "En Proceso"}
                      {appointment.status === "completed" && "Completada"}
                      {appointment.status === "cancelled" && "Cancelada"}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {getLogisticsIcon(appointment.logistics)}
                      <span>
                        {appointment.logistics === "pickup" ? "Recogemos" : "Cliente trae"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>{appointment.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.scheduledTime}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <User className="w-4 h-4" />
                        <span>Cliente: {clients?.find(c => c.id === appointment.clientId)?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{clients?.find(c => c.id === appointment.clientId)?.phone}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Mascota:</span> {pets?.find(p => p.id === appointment.petId)?.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Tipo:</span> {appointment.type}
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    Ver Detalles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {appointments?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas programadas</h3>
              <p className="text-gray-500 mb-4">Comienza creando tu primera cita para una mascota.</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Cita
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}