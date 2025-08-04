import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, CalendarIcon, Plus, Search, Stethoscope, FileText, Clock, 
  AlertCircle, CheckCircle, User, MapPin, Camera, Upload, Download 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { DebugControls } from "@/components/DebugControls";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { 
  MedicalAppointment, InsertMedicalAppointment, Pet, Staff, Client, Room,
  MedicalDocument, InvoiceQueue 
} from "@shared/schema";

const medicalAppointmentSchema = z.object({
  petId: z.string().min(1, "Debe seleccionar una mascota"),
  clientId: z.string().min(1, "Debe seleccionar un cliente"),
  veterinarianId: z.string().min(1, "Debe seleccionar un veterinario"),
  roomId: z.string().optional(),
  visitDate: z.string().min(1, "Debe seleccionar una fecha y hora"),
  visitType: z.enum(["consultation", "checkup", "surgery", "emergency", "follow_up"]),
  chiefComplaint: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  medicines: z.any().optional(),
  followUpInstructions: z.string().optional(),
  notes: z.string().optional(),
  vitals: z.object({
    temperature: z.string().optional(),
    weight: z.string().optional(),
    heartRate: z.string().optional(),
    respiratoryRate: z.string().optional(),
  }).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
});

type MedicalAppointmentFormData = z.infer<typeof medicalAppointmentSchema>;

export default function MedicalAppointments() {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<MedicalAppointment | null>(null);
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Data queries
  const { data: medicalAppointments = [], isLoading } = useQuery<MedicalAppointment[]>({
    queryKey: ["/api/medical-appointments", currentTenant?.id],
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

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const form = useForm<MedicalAppointmentFormData>({
    resolver: zodResolver(medicalAppointmentSchema),
    defaultValues: {
      visitType: "consultation",
      status: "scheduled",
      followUpRequired: false,
    },
  });

  const diagnosisForm = useForm({
    defaultValues: {
      diagnosis: "",
      treatment: "",
      treatmentPlan: "",
      medicines: [],
      followUpInstructions: "",
      notes: "",
      vitals: {
        temperature: "",
        weight: "",
        heartRate: "",
        respiratoryRate: "",
      },
      followUpRequired: false,
      followUpDate: "",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertMedicalAppointment) => {
      const response = await apiRequest("POST", `/api/medical-appointments/${currentTenant?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      setShowCreateForm(false);
      form.reset();
      toast({
        title: "Cita médica creada",
        description: "La cita médica ha sido registrada exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la cita médica. Intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  const confirmAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, diagnosisData }: { appointmentId: string, diagnosisData: any }) => {
      // Update appointment with diagnosis
      await apiRequest("PUT", `/api/medical-appointments/${currentTenant?.id}/${appointmentId}`, {
        ...diagnosisData,
        status: "completed",
        isConfirmed: true,
        confirmedAt: new Date().toISOString(),
      });
      
      // Generate invoice if configured
      await apiRequest("POST", `/api/invoice-queue/${currentTenant?.id}`, {
        serviceType: "medical",
        serviceId: appointmentId,
        serviceName: "Consulta Médica",
        serviceDescription: diagnosisData.diagnosis || "Servicio médico",
        amount: 500.00, // Default amount - should be configurable
        clientId: selectedAppointment?.clientId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-appointments"] });
      setShowDiagnosisForm(false);
      setSelectedAppointment(null);
      diagnosisForm.reset();
      toast({
        title: "Cita confirmada",
        description: "La cita ha sido completada y enviada a facturación.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo confirmar la cita médica.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MedicalAppointmentFormData) => {
    if (!currentTenant) return;
    
    const appointmentData: InsertMedicalAppointment = {
      ...data,
      tenantId: currentTenant.id,
      visitDate: new Date(data.visitDate),
      vitals: data.vitals || {},
      medicines: data.medicines || [],
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    };

    createMutation.mutate(appointmentData);
  };

  const onConfirmAppointment = (diagnosisData: any) => {
    if (!selectedAppointment) return;
    
    confirmAppointmentMutation.mutate({
      appointmentId: selectedAppointment.id,
      diagnosisData,
    });
  };

  const openDiagnosisForm = (appointment: MedicalAppointment) => {
    setSelectedAppointment(appointment);
    diagnosisForm.reset({
      diagnosis: appointment.diagnosis || "",
      treatment: appointment.treatment || "",
      treatmentPlan: appointment.treatmentPlan || "",
      medicines: appointment.medicines || [],
      followUpInstructions: appointment.followUpInstructions || "",
      notes: appointment.notes || "",
      vitals: {
        temperature: appointment.vitals?.temperature || "",
        weight: appointment.vitals?.weight || "",
        heartRate: appointment.vitals?.heartRate || "",
        respiratoryRate: appointment.vitals?.respiratoryRate || "",
      },
      followUpRequired: appointment.followUpRequired || false,
      followUpDate: appointment.followUpDate ? format(new Date(appointment.followUpDate), "yyyy-MM-dd") : "",
    });
    setShowDiagnosisForm(true);
  };

  const filteredAppointments = medicalAppointments.filter(appointment => {
    const pet = pets.find(p => p.id === appointment.petId);
    const client = clients.find(c => c.id === appointment.clientId);
    const veterinarian = veterinarians.find(v => v.id === appointment.veterinarianId);
    
    const matchesSearch = !searchTerm || 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      veterinarian?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPet = !selectedPet || selectedPet === "all" || appointment.petId === selectedPet;
    
    return matchesSearch && matchesPet;
  });

  // Sort by visit date (most recent first, in_progress at top)
  const sortedAppointments = filteredAppointments.sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Clock className="w-4 h-4" />;
      case "in_progress": return <AlertCircle className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!currentTenant) {
    return <div>Selecciona una clínica para continuar.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pt-8">
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <DebugControls />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Stethoscope className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-blue-800">Citas Médicas</h1>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-appointment">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cita Médica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Cita Médica</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} - {client.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mascota</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field. value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-pet">
                              <SelectValue placeholder="Seleccionar mascota" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pets.map((pet) => (
                              <SelectItem key={pet.id} value={pet.id}>
                                {pet.name} - {pet.species} ({pet.breed})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="veterinarianId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Veterinario</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-veterinarian">
                              <SelectValue placeholder="Seleccionar veterinario" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {veterinarians.map((vet) => (
                              <SelectItem key={vet.id} value={vet.id}>
                                Dr. {vet.name} {vet.specialization && `- ${vet.specialization}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sala (Informativo)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room">
                              <SelectValue placeholder="Seleccionar sala" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name} - {room.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="visitDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha y Hora</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-visit-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Visita</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-visit-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="consultation">Consulta</SelectItem>
                            <SelectItem value="checkup">Chequeo</SelectItem>
                            <SelectItem value="surgery">Cirugía</SelectItem>
                            <SelectItem value="emergency">Emergencia</SelectItem>
                            <SelectItem value="follow_up">Seguimiento</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo Principal</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describir el motivo de la consulta..."
                          {...field}
                          data-testid="textarea-chief-complaint"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-2">
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por mascota, cliente o veterinario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
          <Select value={selectedPet} onValueChange={setSelectedPet}>
            <SelectTrigger className="w-64" data-testid="select-filter-pet">
              <SelectValue placeholder="Filtrar por mascota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las mascotas</SelectItem>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.name} - {pet.species}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando citas médicas...</p>
        </div>
      ) : sortedAppointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay citas médicas registradas.</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || selectedPet ? "Intenta cambiar los filtros de búsqueda." : "Crea la primera cita médica para comenzar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedAppointments.map((appointment) => {
            const pet = pets.find(p => p.id === appointment.petId);
            const client = clients.find(c => c.id === appointment.clientId);
            const veterinarian = veterinarians.find(v => v.id === appointment.veterinarianId);
            const room = rooms.find(r => r.id === appointment.roomId);

            return (
              <Card 
                key={appointment.id} 
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  appointment.status === "in_progress" && "ring-2 ring-yellow-400"
                )}
                onClick={() => openDiagnosisForm(appointment)}
                data-testid={`card-appointment-${appointment.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pet?.name || "Mascota desconocida"}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {client?.name} • {veterinarian ? `Dr. ${veterinarian.name}` : "Veterinario no asignado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("flex items-center space-x-1", getStatusColor(appointment.status))}>
                        {getStatusIcon(appointment.status)}
                        <span>
                          {appointment.status === "scheduled" && "Programada"}
                          {appointment.status === "in_progress" && "En Progreso"}
                          {appointment.status === "completed" && "Completada"}
                          {appointment.status === "cancelled" && "Cancelada"}
                        </span>
                      </Badge>
                      {appointment.isConfirmed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Confirmada
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{format(new Date(appointment.visitDate), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>
                        {appointment.visitType === "consultation" && "Consulta"}
                        {appointment.visitType === "checkup" && "Chequeo"}
                        {appointment.visitType === "surgery" && "Cirugía"}
                        {appointment.visitType === "emergency" && "Emergencia"}
                        {appointment.visitType === "follow_up" && "Seguimiento"}
                      </span>
                    </div>
                    {room && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{room.name}</span>
                      </div>
                    )}
                    {appointment.chiefComplaint && (
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-gray-600 truncate" title={appointment.chiefComplaint}>
                          {appointment.chiefComplaint}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {appointment.diagnosis && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-800">Diagnóstico:</p>
                      <p className="text-sm text-blue-700">{appointment.diagnosis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diagnosis Form Dialog */}
      <Dialog open={showDiagnosisForm} onOpenChange={setShowDiagnosisForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <span>Diagnóstico y Tratamiento</span>
            </DialogTitle>
            {selectedAppointment && (
              <div className="text-sm text-gray-600">
                {pets.find(p => p.id === selectedAppointment.petId)?.name} - {" "}
                {clients.find(c => c.id === selectedAppointment.clientId)?.name}
              </div>
            )}
          </DialogHeader>
          
          <Form {...diagnosisForm}>
            <form onSubmit={diagnosisForm.handleSubmit(onConfirmAppointment)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={diagnosisForm.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción del diagnóstico..."
                          {...field}
                          data-testid="textarea-diagnosis"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={diagnosisForm.control}
                  name="treatment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tratamiento</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tratamiento administrado..."
                          {...field}
                          data-testid="textarea-treatment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={diagnosisForm.control}
                name="treatmentPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan de Tratamiento</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Plan de tratamiento recomendado..."
                        {...field}
                        data-testid="textarea-treatment-plan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={diagnosisForm.control}
                name="followUpInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrucciones de Seguimiento</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instrucciones para el dueño..."
                        {...field}
                        data-testid="textarea-followup-instructions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={diagnosisForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observaciones adicionales..."
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Signos Vitales</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Temperatura (°C)</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      placeholder="38.5"
                      value={diagnosisForm.watch("vitals.temperature") || ""}
                      onChange={(e) => diagnosisForm.setValue("vitals.temperature", e.target.value)}
                      data-testid="input-temperature"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Peso (kg)</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      placeholder="15.2"
                      value={diagnosisForm.watch("vitals.weight") || ""}
                      onChange={(e) => diagnosisForm.setValue("vitals.weight", e.target.value)}
                      data-testid="input-weight"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Freq. Cardíaca</label>
                    <Input 
                      type="number"
                      placeholder="95"
                      value={diagnosisForm.watch("vitals.heartRate") || ""}
                      onChange={(e) => diagnosisForm.setValue("vitals.heartRate", e.target.value)}
                      data-testid="input-heart-rate"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Freq. Respiratoria</label>
                    <Input 
                      type="number"
                      placeholder="24"
                      value={diagnosisForm.watch("vitals.respiratoryRate") || ""}
                      onChange={(e) => diagnosisForm.setValue("vitals.respiratoryRate", e.target.value)}
                      data-testid="input-respiratory-rate"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Catálogo de Imágenes</h4>
                    <p className="text-sm text-gray-600">Documentos médicos asociados</p>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-2" />
                    Agregar Imagen
                  </Button>
                </div>
                <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
                  <p className="text-xs">Rayos X, resultados de laboratorio, fotografías, etc.</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <FormField
                  control={diagnosisForm.control}
                  name="followUpRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-followup-required"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Requiere seguimiento</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={diagnosisForm.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de seguimiento</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-followup-date"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDiagnosisForm(false)}
                  data-testid="button-cancel-diagnosis"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={confirmAppointmentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-appointment"
                >
                  {confirmAppointmentMutation.isPending ? "Confirmando..." : "Confirmar y Enviar a Facturación"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}