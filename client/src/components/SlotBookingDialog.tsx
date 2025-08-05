import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertCircle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SlotBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  selectedDate: string;
  selectedTime: string;
  onBookingComplete?: () => void;
}

interface SlotReservation {
  id: string;
  expiresAt: string;
  expiresIn: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  clientId: string;
}

interface Service {
  id: string;
  name: string;
  type: string;
  duration: number;
  price: number;
}

export function SlotBookingDialog({
  open,
  onOpenChange,
  tenantId,
  selectedDate,
  selectedTime,
  onBookingComplete
}: SlotBookingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reservation, setReservation] = useState<SlotReservation | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Generate session ID for reservations
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    enabled: open,
  });

  // Fetch pets for selected client
  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets", selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/pets/client/${selectedClientId}`);
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services", tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/services/${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
    enabled: open,
  });

  // Create slot reservation
  const reserveSlotMutation = useMutation({
    mutationFn: async (): Promise<{ reservation: SlotReservation; expiresIn: number }> => {
      const response = await apiRequest("/api/slot-reservations", "POST", {
        tenantId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        serviceId: selectedServiceId,
      });
      return response as { reservation: SlotReservation; expiresIn: number };
    },
    onSuccess: (data) => {
      setReservation(data.reservation);
      setTimeLeft(data.expiresIn);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reserve slot",
        variant: "destructive",
      });
      onOpenChange(false);
    },
  });

  // Release reservation
  const releaseReservationMutation = useMutation({
    mutationFn: async () => {
      if (reservation) {
        return await apiRequest(`/api/slot-reservations/${reservation.id}`, "DELETE", {});
      }
    },
    onSuccess: () => {
      setReservation(null);
      setTimeLeft(0);
    },
  });

  // Create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/appointments", "POST", {
        tenantId,
        clientId: selectedClientId,
        petId: selectedPetId,
        serviceId: selectedServiceId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        status: "scheduled",
        type: services.find(s => s.id === selectedServiceId)?.type || "general",
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita Creada",
        description: "La cita ha sido programada exitosamente",
      });
      
      // Release the reservation
      if (reservation) {
        releaseReservationMutation.mutate();
      }
      
      // Invalidate appointments cache
      queryClient.invalidateQueries({ queryKey: ["/api/appointments-fast"] });
      
      onBookingComplete?.();
      onOpenChange(false);
      
      // Reset form
      setSelectedClientId("");
      setSelectedPetId("");
      setSelectedServiceId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    },
  });

  // Countdown timer for reservation
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setReservation(null);
            toast({
              title: "Reserva Expirada",
              description: "La reserva del horario ha expirado",
              variant: "destructive",
            });
            onOpenChange(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, toast, onOpenChange]);

  // Create reservation when dialog opens
  useEffect(() => {
    if (open && !reservation) {
      reserveSlotMutation.mutate();
    }
  }, [open]);

  // Release reservation when dialog closes
  useEffect(() => {
    if (!open && reservation) {
      releaseReservationMutation.mutate();
    }
  }, [open]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimeSlot = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canCreateAppointment = selectedClientId && selectedPetId && selectedServiceId && reservation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reservar Cita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Slot Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {formatDate(selectedDate)}
                </span>
              </div>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {formatTimeSlot(selectedTime)}
              </Badge>
            </div>
            
            {reservation && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  Reservado por {formatTime(timeLeft)} minutos
                </span>
              </div>
            )}
          </div>

          {/* Booking Form */}
          {reservation && (
            <div className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pet Selection */}
              {selectedClientId && (
                <div className="space-y-2">
                  <Label htmlFor="pet">Mascota</Label>
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mascota" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Service Selection */}
              <div className="space-y-2">
                <Label htmlFor="service">Servicio</Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-booking"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            {reservation && (
              <Button
                onClick={() => createAppointmentMutation.mutate()}
                disabled={!canCreateAppointment || createAppointmentMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-booking"
              >
                {createAppointmentMutation.isPending ? "Creando..." : "Confirmar Cita"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}