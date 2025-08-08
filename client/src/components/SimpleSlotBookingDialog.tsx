import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, User, Heart, Search, X, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [showClientPopover, setShowClientPopover] = useState(false);
  const [showPetPopover, setShowPetPopover] = useState(false);
  const [showServicePopover, setShowServicePopover] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingPet, setIsCreatingPet] = useState(false);

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
    queryKey: ["/api/pets", selectedClient?.id],
    queryFn: async () => {
      const response = await fetch(`/api/pets/client/${selectedClient?.id}`);
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    },
    enabled: !!selectedClient?.id,
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

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(client => 
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone?.includes(clientSearch)
    );
  }, [clients, clientSearch]);

  // Filter pets by search
  const filteredPets = useMemo(() => {
    if (!petSearch) return pets;
    return pets.filter(pet => 
      pet.name.toLowerCase().includes(petSearch.toLowerCase()) ||
      pet.species?.toLowerCase().includes(petSearch.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(petSearch.toLowerCase())
    );
  }, [pets, petSearch]);

  // Filter services by search (exclude already selected)
  const filteredServices = useMemo(() => {
    const selectedServiceIds = selectedServices.map(s => s.id);
    const available = services.filter(service => !selectedServiceIds.includes(service.id));
    
    if (!serviceSearch) return available;
    return available.filter(service => 
      service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      service.type?.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [services, serviceSearch, selectedServices]);

  // Calculate total price
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);

  // Create appointment with smart client/pet creation (using existing booking pattern)
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Use the same pattern as the booking system - single endpoint that handles everything
      const appointments = [];
      
      for (const service of selectedServices) {
        const appointmentData = {
          tenantId,
          // Client info (existing or new) - match the server's expected field names
          customerName: selectedClient?.name || clientSearch.trim(),
          customerEmail: selectedClient?.email || "",
          customerPhone: selectedClient?.phone || "",
          customerAddress: "",
          customerFraccionamiento: "",
          customerPostalCode: "",
          customerLatitude: 0,
          customerLongitude: 0,
          // Pet info (existing or new)
          petName: selectedPet?.name || petSearch.trim(),
          petSpecies: selectedPet?.species || "Unknown",
          petBreed: selectedPet?.breed || "",
          petAge: selectedPet?.registeredAge || 0,
          petWeight: 0,
          petMedicalHistory: "",
          // Service and appointment info
          serviceId: service.id,
          requestedDate: selectedDate,
          requestedTime: selectedTime,
          status: "scheduled",
          logistics: "",
          notes: `Servicios: ${(selectedServices || []).map(s => s?.name || 'Unknown').join(", ")}. Total: $${totalPrice}`,
        };

        const appointment = await apiRequest(`/api/appointments/${tenantId}`, "POST", appointmentData);
        appointments.push(appointment);
      }
      
      return appointments;
    },
    onSuccess: (appointments) => {
      toast({
        title: "¡Cita(s) Creada(s)!",
        description: `${appointments.length} cita(s) programada(s) para ${selectedDate} a las ${selectedTime}. Total: $${totalPrice}`,
      });
      
      // Invalidate all appointment related caches
      queryClient.invalidateQueries({ queryKey: [`/api/appointments-fast/${tenantId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onBookingComplete();
      
      // Reset form
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cita",
        description: error.message || "No se pudo crear la cita. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedPet(null);
    setSelectedServices([]);
    setClientSearch("");
    setPetSearch("");
    setServiceSearch("");
    setShowClientPopover(false);
    setShowPetPopover(false);
    setShowServicePopover(false);
  };

  const handleSubmit = () => {
    const hasClient = selectedClient || clientSearch.trim();
    const hasPet = selectedPet || petSearch.trim();
    
    if (!hasClient || !hasPet || selectedServices.length === 0) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa cliente, mascota y al menos un servicio",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addService = (service: Service) => {
    setSelectedServices(prev => [...prev, service]);
    setServiceSearch("");
    setShowServicePopover(false);
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
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

          {/* Client Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </label>
            <Popover open={showClientPopover} onOpenChange={setShowClientPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={showClientPopover}
                  className="w-full justify-between"
                >
                  {selectedClient ? selectedClient.name : "Buscar cliente..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Buscar por nombre, email o teléfono..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {clientSearch.trim() ? (
                        <div className="p-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            Cliente no encontrado
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClient({
                                id: `new-${Date.now()}`,
                                name: clientSearch.trim(),
                                tenantId,
                                email: "",
                                phone: "",
                              } as Client);
                              setSelectedPet(null);
                              setShowClientPopover(false);
                            }}
                            className="w-full"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear "{clientSearch.trim()}"
                          </Button>
                        </div>
                      ) : (
                        "No se encontraron clientes."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.id}
                          onSelect={() => {
                            setSelectedClient(client);
                            setSelectedPet(null); // Reset pet when client changes
                            setShowClientPopover(false);
                            setClientSearch("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {client.email} • {client.phone}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pet Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Mascota
            </label>
            <Popover open={showPetPopover} onOpenChange={setShowPetPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={showPetPopover}
                  className="w-full justify-between"
                  disabled={!selectedClient}
                >
                  {selectedPet ? `${selectedPet.name} (${selectedPet.species})` : "Buscar mascota..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Buscar por nombre, especie o raza..." 
                    value={petSearch}
                    onValueChange={setPetSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {petSearch.trim() ? (
                        <div className="p-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            Mascota no encontrada
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPet({
                                id: `new-${Date.now()}`,
                                name: petSearch.trim(),
                                clientId: selectedClient?.id || "",
                                species: "Unknown",
                                breed: "",
                                registeredAge: 0,
                              } as Pet);
                              setShowPetPopover(false);
                            }}
                            className="w-full"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear "{petSearch.trim()}"
                          </Button>
                        </div>
                      ) : (
                        "No se encontraron mascotas."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredPets.map((pet) => (
                        <CommandItem
                          key={pet.id}
                          value={pet.id}
                          onSelect={() => {
                            setSelectedPet(pet);
                            setShowPetPopover(false);
                            setPetSearch("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{pet.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {pet.species} • {pet.breed} • {pet.registeredAge || 'N/A'} años
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Services Multi-Select with Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Servicios</label>
            
            {/* Selected Services Tags */}
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
                {selectedServices.map((service) => (
                  <Badge key={service.id} variant="secondary" className="flex items-center gap-1">
                    {service.name} - ${service.price}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeService(service.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Add Service Popover */}
            <Popover open={showServicePopover} onOpenChange={setShowServicePopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={showServicePopover}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar servicio...
                  </span>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Buscar servicios..." 
                    value={serviceSearch}
                    onValueChange={setServiceSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                    <CommandGroup>
                      {filteredServices.map((service) => (
                        <CommandItem
                          key={service.id}
                          value={service.id}
                          onSelect={() => addService(service)}
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{service.name}</span>
                              <span className="text-sm font-medium text-green-600">${service.price}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{service.type}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Price Summary */}
          {selectedServices.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Servicios:</span>
                <span className="text-lg font-bold text-blue-600">${totalPrice}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedServices.length} servicio(s) seleccionado(s)
              </p>
            </div>
          )}

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