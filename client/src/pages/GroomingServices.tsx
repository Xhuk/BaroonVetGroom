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
import { Checkbox } from "@/components/ui/checkbox";
import { Scissors, Plus, Search, Star, Camera, Clock, DollarSign, Heart, Eye, Play, Pause, Square, Check, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { DebugControls } from "@/components/DebugControls";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { GroomingRecord, InsertGroomingRecord, Pet, Staff } from "@shared/schema";

const groomingRecordSchema = z.object({
  petId: z.string().min(1, "Debe seleccionar una mascota"),
  groomerId: z.string().min(1, "Debe seleccionar un estilista"),
  groomingDate: z.string().min(1, "Debe seleccionar una fecha"),
  servicesProvided: z.array(z.string()).min(1, "Debe seleccionar al menos un servicio"),
  coatCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  skinCondition: z.enum(["healthy", "dry", "irritated", "infected"]).optional(),
  behaviorNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  productsUsed: z.object({
    shampoo: z.string().optional(),
    conditioner: z.string().optional(),
    tools: z.array(z.string()).optional(),
  }).optional(),
  duration: z.coerce.number().optional(),
  totalCost: z.string().optional(),
  clientSatisfaction: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  nextGroomingDate: z.string().optional(),
});

type GroomingRecordFormData = z.infer<typeof groomingRecordSchema>;

const groomingServices = [
  "bath", "haircut", "nail_trim", "ear_cleaning", "teeth_brushing", 
  "flea_treatment", "de_shedding", "paw_care", "anal_glands"
];

const serviceLabels = {
  bath: "Baño",
  haircut: "Corte de Pelo", 
  nail_trim: "Corte de Uñas",
  ear_cleaning: "Limpieza de Oídos",
  teeth_brushing: "Cepillado Dental",
  flea_treatment: "Tratamiento Antipulgas",
  de_shedding: "Eliminación de Pelo Muerto",
  paw_care: "Cuidado de Patas",
  anal_glands: "Glándulas Anales"
};

export default function GroomingServices() {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GroomingRecord | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentGrooming, setCurrentGrooming] = useState<GroomingRecord | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, sessionStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setSessionStartTime(new Date());
    setIsTimerRunning(true);
    setElapsedTime(0);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setShowConfirmation(true);
  };

  const { data: groomingRecords = [], isLoading } = useQuery<GroomingRecord[]>({
    queryKey: ["/api/grooming-records", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const { data: groomers = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff", currentTenant?.id, "groomer"],
    enabled: !!currentTenant?.id,
  });

  const form = useForm<GroomingRecordFormData>({
    resolver: zodResolver(groomingRecordSchema),
    defaultValues: {
      servicesProvided: [],
      coatCondition: "good",
      skinCondition: "healthy",
      clientSatisfaction: 5,
      productsUsed: { tools: [] },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertGroomingRecord) => {
      return await apiRequest(`/api/grooming-records/${currentTenant?.id}`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grooming-records", currentTenant?.id] });
      setShowCreateForm(false);
      form.reset();
    },
  });

  const filteredRecords = groomingRecords.filter((record) => {
    const pet = pets.find(p => p.id === record.petId);
    const groomer = groomers.find(g => g.id === record.groomerId);
    const matchesSearch = !searchTerm || 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      groomer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPet = !selectedPet || selectedPet === "all" || record.petId === selectedPet;
    return matchesSearch && matchesPet;
  });

  const onSubmit = (data: GroomingRecordFormData) => {
    if (!currentTenant?.id) return;
    
    const insertData: InsertGroomingRecord = {
      ...data,
      tenantId: currentTenant.id,
      totalCost: data.totalCost || undefined,
      nextGroomingDate: data.nextGroomingDate || undefined,
    };
    
    createMutation.mutate(insertData);
  };

  const getConditionColor = (condition: string, type: 'coat' | 'skin') => {
    if (type === 'coat') {
      switch (condition) {
        case "excellent": return "bg-green-100 text-green-800";
        case "good": return "bg-blue-100 text-blue-800";
        case "fair": return "bg-yellow-100 text-yellow-800";
        case "poor": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
      }
    } else {
      switch (condition) {
        case "healthy": return "bg-green-100 text-green-800";
        case "dry": return "bg-yellow-100 text-yellow-800";
        case "irritated": return "bg-orange-100 text-orange-800";
        case "infected": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
      }
    }
  };

  const getConditionLabel = (condition: string, type: 'coat' | 'skin') => {
    if (type === 'coat') {
      const labels = { excellent: "Excelente", good: "Bueno", fair: "Regular", poor: "Malo" };
      return labels[condition as keyof typeof labels] || condition;
    } else {
      const labels = { healthy: "Saludable", dry: "Seca", irritated: "Irritada", infected: "Infectada" };
      return labels[condition as keyof typeof labels] || condition;
    }
  };

  if (!currentTenant) {
    return <div>Selecciona una clínica para continuar.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          <h1 className="text-2xl font-bold text-pink-800">Servicios de Estética</h1>
        </div>
        <div className="flex items-center space-x-3">
          <DebugControls />
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="bg-pink-600 hover:bg-pink-700" data-testid="button-create-grooming">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Servicio de Estética</DialogTitle>
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
                      name="groomerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estilista</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-groomer">
                                <SelectValue placeholder="Seleccionar estilista" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {groomers.map((groomer) => (
                                <SelectItem key={groomer.id} value={groomer.id}>
                                  {groomer.name} {groomer.specialization && `- ${groomer.specialization}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="groomingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha del Servicio</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-grooming-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duración (minutos)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="120" {...field} data-testid="input-duration" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Total</FormLabel>
                          <FormControl>
                            <Input placeholder="$500.00" {...field} data-testid="input-total-cost" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="servicesProvided"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Servicios Realizados *</FormLabel>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {groomingServices.map((service) => (
                            <FormField
                              key={service}
                              control={form.control}
                              name="servicesProvided"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={service}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(service)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, service])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== service
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-service-${service}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {serviceLabels[service as keyof typeof serviceLabels]}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="coatCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condición del Pelaje</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-coat-condition">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">Excelente</SelectItem>
                              <SelectItem value="good">Bueno</SelectItem>
                              <SelectItem value="fair">Regular</SelectItem>
                              <SelectItem value="poor">Malo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="skinCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condición de la Piel</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-skin-condition">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="healthy">Saludable</SelectItem>
                              <SelectItem value="dry">Seca</SelectItem>
                              <SelectItem value="irritated">Irritada</SelectItem>
                              <SelectItem value="infected">Infectada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="behaviorNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas de Comportamiento</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Cómo se comportó la mascota durante el servicio..." {...field} data-testid="textarea-behavior-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instrucciones Especiales</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Instrucciones especiales del cliente..." {...field} data-testid="textarea-special-instructions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientSatisfaction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Satisfacción del Cliente (1-5)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-satisfaction">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 - Muy Insatisfecho</SelectItem>
                              <SelectItem value="2">2 - Insatisfecho</SelectItem>
                              <SelectItem value="3">3 - Neutral</SelectItem>
                              <SelectItem value="4">4 - Satisfecho</SelectItem>
                              <SelectItem value="5">5 - Muy Satisfecho</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nextGroomingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próxima Cita Sugerida</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-next-grooming-date" />
                          </FormControl>
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
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-grooming">
                      {createMutation.isPending ? "Guardando..." : "Guardar Servicio"}
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
                  placeholder="Buscar por mascota o estilista..."
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

      {/* Grooming Records List */}
      {isLoading ? (
        <div className="text-center py-8">Cargando servicios de estética...</div>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => {
            const pet = pets.find(p => p.id === record.petId);
            const groomer = groomers.find(g => g.id === record.groomerId);
            
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                    onClick={() => setSelectedRecord(record)} data-testid={`card-grooming-${record.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                          <Scissors className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {pet?.name} - Servicio de Estética
                          </h3>
                          <p className="text-sm text-gray-600">
                            {groomer?.name} • {format(new Date(record.groomingDate), "dd 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentGrooming(record);
                        setShowServiceModal(true);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                      data-testid={`button-start-grooming-${record.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Iniciar Sesión
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Servicios:</p>
                      <div className="flex flex-wrap gap-1">
                        {record.services?.slice(0, 3).map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {serviceLabels[service as keyof typeof serviceLabels]}
                          </Badge>
                        ))}
                        {record.services && record.services.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{record.services.length - 3} más
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {record.totalCost && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">Costo:</span>
                          <Badge variant="outline" className="text-xs">
                            ${record.totalCost}
                          </Badge>
                        </div>
                      )}
                      {record.nextAppointmentDate && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">Próxima:</span>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(record.nextAppointmentDate), "dd/MM/yyyy")}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {record.notes && (
                        <div className="flex items-center text-gray-600 text-sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Notas disponibles
                        </div>
                      )}
                      {record.beforePhotos && record.beforePhotos.length > 0 && (
                        <div className="flex items-center text-blue-600 text-sm">
                          <Camera className="w-4 h-4 mr-1" />
                          {record.beforePhotos.length} fotos
                        </div>
                      )}
                    </div>
                    
                    {record.nextAppointmentRecommended && (
                      <div className="text-xs text-green-600">
                        ✓ Seguimiento recomendado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Scissors className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No se encontraron servicios de estética</p>
              <p>Registra el primer servicio de estética para esta clínica.</p>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Scissors className="w-5 h-5 text-pink-600" />
                <span>Servicio de Estética - {pets.find(p => p.id === selectedRecord.petId)?.name}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha del Servicio</p>
                  <p>{format(new Date(selectedRecord.groomingDate), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estilista</p>
                  <p>{groomers.find(g => g.id === selectedRecord.groomerId)?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Duración</p>
                  <p>{selectedRecord.duration ? `${selectedRecord.duration} minutos` : 'No especificada'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Servicios Realizados</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.servicesProvided.map((service) => (
                    <Badge key={service} className="bg-pink-100 text-pink-800">
                      {serviceLabels[service as keyof typeof serviceLabels]}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.coatCondition && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Condición del Pelaje</p>
                    <Badge className={cn("px-2 py-1", getConditionColor(selectedRecord.coatCondition, 'coat'))}>
                      {getConditionLabel(selectedRecord.coatCondition, 'coat')}
                    </Badge>
                  </div>
                )}
                {selectedRecord.skinCondition && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Condición de la Piel</p>
                    <Badge className={cn("px-2 py-1", getConditionColor(selectedRecord.skinCondition, 'skin'))}>
                      {getConditionLabel(selectedRecord.skinCondition, 'skin')}
                    </Badge>
                  </div>
                )}
              </div>

              {selectedRecord.behaviorNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Notas de Comportamiento</p>
                  <p className="p-3 bg-blue-50 rounded-lg">{selectedRecord.behaviorNotes}</p>
                </div>
              )}

              {selectedRecord.specialInstructions && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Instrucciones Especiales</p>
                  <p className="p-3 bg-yellow-50 rounded-lg">{selectedRecord.specialInstructions}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.totalCost && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Costo Total</p>
                    <div className="flex items-center text-green-600 font-semibold">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {selectedRecord.totalCost}
                    </div>
                  </div>
                )}
                {selectedRecord.clientSatisfaction && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Satisfacción del Cliente</p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-4 h-4",
                            i < selectedRecord.clientSatisfaction! 
                              ? "text-yellow-400 fill-current" 
                              : "text-gray-300"
                          )} 
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        ({selectedRecord.clientSatisfaction}/5)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {selectedRecord.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Notas Adicionales</p>
                  <p className="p-3 bg-gray-50 rounded-lg">{selectedRecord.notes}</p>
                </div>
              )}

              {selectedRecord.nextGroomingDate && (
                <div className="flex items-center p-3 bg-blue-50 rounded-lg text-blue-800">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-medium">Próxima cita sugerida:</span>
                  <span className="ml-2">
                    {format(new Date(selectedRecord.nextGroomingDate), "dd 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Focused Visual Grooming Service Modal */}
      {showServiceModal && currentGrooming && (
        <Dialog open={showServiceModal} onOpenChange={() => {
          setShowServiceModal(false);
          setIsTimerRunning(false);
          setShowConfirmation(false);
          setCurrentGrooming(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center justify-center space-x-3 text-2xl font-bold text-pink-700">
                <Scissors className="w-8 h-8" />
                <span>Sesión de Estética en Progreso</span>
              </DialogTitle>
            </DialogHeader>

            {!showConfirmation ? (
              <div className="space-y-6">
                {/* Pet Info Header */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-pink-200 rounded-full flex items-center justify-center">
                        <Heart className="w-8 h-8 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">
                          {pets.find(p => p.id === currentGrooming.petId)?.name}
                        </h3>
                        <p className="text-lg text-gray-600">
                          Estilista: {groomers.find(g => g.id === currentGrooming.groomerId)?.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* Timer Display */}
                    <div className="text-center">
                      <div className="text-4xl font-mono font-bold text-green-600 bg-green-50 px-6 py-3 rounded-xl border-2 border-green-200">
                        {formatTime(elapsedTime)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Tiempo transcurrido</p>
                    </div>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex justify-center space-x-4">
                  {!isTimerRunning && elapsedTime === 0 && (
                    <Button 
                      onClick={startTimer}
                      size="lg"
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl"
                      data-testid="button-start-timer"
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Iniciar Sesión
                    </Button>
                  )}
                  
                  {isTimerRunning && (
                    <>
                      <Button 
                        onClick={pauseTimer}
                        size="lg"
                        variant="outline"
                        className="px-8 py-4 text-xl border-2"
                        data-testid="button-pause-timer"
                      >
                        <Pause className="w-6 h-6 mr-2" />
                        Pausar
                      </Button>
                      <Button 
                        onClick={stopTimer}
                        size="lg"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-xl"
                        data-testid="button-stop-timer"
                      >
                        <Square className="w-6 h-6 mr-2" />
                        Finalizar
                      </Button>
                    </>
                  )}
                  
                  {!isTimerRunning && elapsedTime > 0 && (
                    <>
                      <Button 
                        onClick={() => setIsTimerRunning(true)}
                        size="lg"
                        className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl"
                        data-testid="button-resume-timer"
                      >
                        <Play className="w-6 h-6 mr-2" />
                        Continuar
                      </Button>
                      <Button 
                        onClick={stopTimer}
                        size="lg"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-xl"
                        data-testid="button-finish-timer"
                      >
                        <Check className="w-6 h-6 mr-2" />
                        Finalizar
                      </Button>
                    </>
                  )}
                </div>

                {/* Service Details */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Servicios Programados</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {currentGrooming.servicesProvided.map((service) => (
                      <div key={service} className="bg-pink-100 text-pink-800 px-4 py-3 rounded-lg font-medium text-center">
                        {serviceLabels[service as keyof typeof serviceLabels]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Acciones Rápidas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Document Upload */}
                    <div className="text-center">
                      <h5 className="text-lg font-medium text-gray-700 mb-3">Imágenes y Documentos</h5>
                      <div className="space-y-3">
                        <QRCodeGenerator 
                          uploadUrl={`/mobile-upload?groomingId=${currentGrooming.id}&type=grooming`}
                          label="Escanear para subir fotos"
                        />
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={10485760}
                          onGetUploadParameters={async () => {
                            const response = await fetch('/api/objects/upload', { method: 'POST' });
                            const data = await response.json();
                            return { method: 'PUT' as const, url: data.uploadURL };
                          }}
                          onComplete={(result) => {
                            console.log('Files uploaded:', result);
                          }}
                          buttonClassName="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Subir Archivos
                        </ObjectUploader>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <h5 className="text-lg font-medium text-gray-700 mb-3">Notas Rápidas</h5>
                      <textarea 
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
                        placeholder="Anota observaciones durante el servicio..."
                        data-testid="textarea-session-notes"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Confirmation Screen */
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-12 h-12 text-green-600" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ¡Sesión Completada!
                  </h3>
                  <p className="text-lg text-gray-600">
                    Tiempo total: <span className="font-mono font-bold text-green-600">{formatTime(elapsedTime)}</span>
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Resumen del Servicio</h4>
                  <div className="space-y-3">
                    <p><strong>Mascota:</strong> {pets.find(p => p.id === currentGrooming.petId)?.name}</p>
                    <p><strong>Duración:</strong> {Math.floor(elapsedTime / 60)} minutos</p>
                    <p><strong>Servicios:</strong> {currentGrooming.servicesProvided.length} servicios completados</p>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={() => {
                      setShowServiceModal(false);
                      setShowConfirmation(false);
                      setCurrentGrooming(null);
                      setElapsedTime(0);
                    }}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl"
                    data-testid="button-confirm-complete"
                  >
                    <Check className="w-6 h-6 mr-2" />
                    Confirmar y Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}