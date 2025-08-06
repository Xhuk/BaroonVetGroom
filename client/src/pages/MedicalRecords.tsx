import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarIcon, Plus, Search, Stethoscope, FileText, Clock, AlertCircle } from "lucide-react";
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
import type { MedicalRecord, InsertMedicalRecord, Pet, Staff } from "@shared/schema";

const medicalRecordSchema = z.object({
  petId: z.string().min(1, "Debe seleccionar una mascota"),
  veterinarianId: z.string().min(1, "Debe seleccionar un veterinario"),
  visitDate: z.string().min(1, "Debe seleccionar una fecha"),
  visitType: z.enum(["consultation", "checkup", "surgery", "emergency"]),
  chiefComplaint: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  diagnosis: z.string().min(1, "El diagnóstico es requerido"),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
  vitals: z.object({
    temperature: z.string().optional(),
    weight: z.string().optional(),
    heartRate: z.string().optional(),
    respiratoryRate: z.string().optional(),
  }).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional(),
  status: z.enum(["active", "resolved", "ongoing"]).default("active"),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

function MedicalRecords() {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const queryClient = useQueryClient();

  const { data: medicalRecords = [], isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ["/api/medical-records", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: veterinarians = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id, "veterinarian"],
    enabled: !!currentTenant?.id,
  });

  const form = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      visitType: "consultation",
      status: "active",
      followUpRequired: false,
      symptoms: [],
      vitals: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMedicalRecord) => {
      return await apiRequest(`/api/medical-records/${currentTenant?.id}`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records", currentTenant?.id] });
      setShowCreateForm(false);
      form.reset();
    },
  });

  const filteredRecords = medicalRecords.filter((record) => {
    const pet = pets.find(p => p.id === record.petId);
    const vet = veterinarians.find(v => v.id === record.veterinarianId);
    const matchesSearch = !searchTerm || 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vet?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPet = !selectedPet || selectedPet === "all" || record.petId === selectedPet;
    return matchesSearch && matchesPet;
  });

  const onSubmit = (data: MedicalRecordFormData) => {
    if (!currentTenant?.id) return;
    
    const insertData: InsertMedicalRecord = {
      ...data,
      tenantId: currentTenant.id,
      visitDate: data.visitDate,
      followUpDate: data.followUpDate || undefined,
    };
    
    createMutation.mutate(insertData);
  };

  const getVisitTypeLabel = (type: string) => {
    const types = {
      consultation: "Consulta",
      checkup: "Revisión",
      surgery: "Cirugía", 
      emergency: "Emergencia"
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-800 border-green-200";
      case "ongoing": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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
          <h1 className="text-2xl font-bold text-blue-800">Expedientes Médicos</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-record">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Expediente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Expediente Médico</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="petId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mascota</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="visitDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Visita</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-visit-date" />
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
                              <SelectItem value="checkup">Revisión</SelectItem>
                              <SelectItem value="surgery">Cirugía</SelectItem>
                              <SelectItem value="emergency">Emergencia</SelectItem>
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
                        <FormLabel>Motivo Principal de Consulta</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe el motivo principal de la visita..." {...field} data-testid="textarea-chief-complaint" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnóstico *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Diagnóstico detallado..." {...field} data-testid="textarea-diagnosis" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="treatmentPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan de Tratamiento</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Plan de tratamiento recomendado..." {...field} data-testid="textarea-treatment-plan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Signos Vitales</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Temperatura °C" data-testid="input-temperature" />
                        <Input placeholder="Peso kg" data-testid="input-weight" />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="ongoing">En Progreso</SelectItem>
                              <SelectItem value="resolved">Resuelto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Adicionales</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observaciones adicionales..." {...field} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} data-testid="button-cancel">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-record">
                      {createMutation.isPending ? "Guardando..." : "Guardar Expediente"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por mascota, diagnóstico o veterinario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={selectedPet} onValueChange={setSelectedPet}>
              <SelectTrigger className="w-48" data-testid="select-filter-pet">
                <SelectValue placeholder="Todas las mascotas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las mascotas</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medical Records List */}
      {isLoading ? (
        <div className="text-center py-8">Cargando expedientes médicos...</div>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => {
            const pet = pets.find(p => p.id === record.petId);
            const vet = veterinarians.find(v => v.id === record.veterinarianId);
            
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                    onClick={() => setSelectedRecord(record)} data-testid={`card-record-${record.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {pet?.name} - {getVisitTypeLabel(record.visitType)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Dr. {vet?.name} • {format(new Date(record.visitDate), "dd 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Diagnóstico:</p>
                          <p className="text-sm text-gray-600">{record.diagnosis}</p>
                        </div>
                        {record.chiefComplaint && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Motivo de Consulta:</p>
                            <p className="text-sm text-gray-600">{record.chiefComplaint}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4">
                        <Badge className={cn("px-2 py-1", getStatusColor(record.status))}>
                          {record.status === 'active' ? 'Activo' : 
                           record.status === 'resolved' ? 'Resuelto' : 'En Progreso'}
                        </Badge>
                        {record.followUpRequired && (
                          <div className="flex items-center text-orange-600 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            Seguimiento requerido
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No se encontraron expedientes médicos</p>
              <p>Crea el primer expediente médico para esta clínica.</p>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <span>Expediente Médico - {pets.find(p => p.id === selectedRecord.petId)?.name}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de Visita</p>
                  <p>{format(new Date(selectedRecord.visitDate), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo de Visita</p>
                  <p>{getVisitTypeLabel(selectedRecord.visitType)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Veterinario</p>
                  <p>Dr. {veterinarians.find(v => v.id === selectedRecord.veterinarianId)?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado</p>
                  <Badge className={cn("px-2 py-1", getStatusColor(selectedRecord.status))}>
                    {selectedRecord.status === 'active' ? 'Activo' : 
                     selectedRecord.status === 'resolved' ? 'Resuelto' : 'En Progreso'}
                  </Badge>
                </div>
              </div>

              {selectedRecord.chiefComplaint && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Motivo Principal de Consulta</p>
                  <p className="p-3 bg-gray-50 rounded-lg">{selectedRecord.chiefComplaint}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Diagnóstico</p>
                <p className="p-3 bg-blue-50 rounded-lg">{selectedRecord.diagnosis}</p>
              </div>

              {selectedRecord.treatmentPlan && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Plan de Tratamiento</p>
                  <p className="p-3 bg-green-50 rounded-lg">{selectedRecord.treatmentPlan}</p>
                </div>
              )}

              {selectedRecord.vitals && typeof selectedRecord.vitals === 'object' && Object.keys(selectedRecord.vitals).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Signos Vitales</p>
                  <div className="grid grid-cols-2 gap-4 p-3 bg-yellow-50 rounded-lg">
                    {(selectedRecord.vitals as any).temperature && (
                      <div>
                        <span className="text-sm font-medium">Temperatura:</span>
                        <span className="ml-2">{(selectedRecord.vitals as any).temperature}°C</span>
                      </div>
                    )}
                    {(selectedRecord.vitals as any).weight && (
                      <div>
                        <span className="text-sm font-medium">Peso:</span>
                        <span className="ml-2">{(selectedRecord.vitals as any).weight} kg</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Notas Adicionales</p>
                  <p className="p-3 bg-gray-50 rounded-lg">{selectedRecord.notes}</p>
                </div>
              )}

              {selectedRecord.followUpRequired && (
                <div className="flex items-center p-3 bg-orange-50 rounded-lg text-orange-800">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Seguimiento requerido</span>
                  {selectedRecord.followUpDate && (
                    <span className="ml-2">
                      - {format(new Date(selectedRecord.followUpDate), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Apply dark theme wrapper for MedicalRecords
const MedicalRecordsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MedicalRecords />
    </div>
  );
};

export default MedicalRecordsPage;