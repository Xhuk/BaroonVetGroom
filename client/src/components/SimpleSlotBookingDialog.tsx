import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Pet, Service } from "@shared/schema";

interface SimpleSlotBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  selectedDate: string;
  selectedTime: string;
  onBookingComplete: () => void;
}

export function SimpleSlotBookingDialog({
  open,
  onOpenChange,
  tenantId,
  selectedDate,
  selectedTime,
  onBookingComplete,
}: SimpleSlotBookingDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const queryClient = useQueryClient();

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

  // Create appointment directly
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
        title: "¡Cita Creada!",
        description: `Cita programada para ${selectedDate} a las ${selectedTime}`,
      });
      
      // Invalidate cache and close dialog
      queryClient.invalidateQueries({ queryKey: ["/api/appointments-fast"] });
      onBookingComplete();
      
      // Reset form
      setSelectedClientId("");
      setSelectedPetId("");
      setSelectedServiceId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cita",
        description: error.message || "No se pudo crear la cita. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedClientId || !selectedPetId || !selectedServiceId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona cliente, mascota y servicio",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate();
  };

  const handleClose = () => {
    setSelectedClientId("");
    setSelectedPetId("");
    setSelectedServiceId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nueva Cita
          </DialogTitle>
          <DialogDescription>
            Crear cita para {selectedDate} a las {selectedTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Display */}
          <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{selectedDate} - {selectedTime}</span>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
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
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Mascota
            </label>
            <Select 
              value={selectedPetId} 
              onValueChange={setSelectedPetId}
              disabled={!selectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mascota..." />
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

          {/* Service Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Servicio</label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio..." />
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

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createAppointmentMutation.isPending}
              className="flex-1"
            >
              {createAppointmentMutation.isPending ? "Creando..." : "Crear Cita"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}