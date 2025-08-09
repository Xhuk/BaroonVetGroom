import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useFastLoad, useFastFetch } from "@/hooks/useFastLoad";
import { useInstantLoad } from "@/hooks/useInstantLoad";
import { BackButton } from "@/components/BackButton";
import { DebugControls } from "@/components/DebugControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, User, Phone, Mail, MapPin, Heart, Camera, QrCode, History, Power, Edit, Save, X, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Pet, Appointment } from "@shared/schema";

// Status translation utilities
const getStatusTranslation = (status: string | null) => {
  if (status === null || status === undefined) {
    return "Sin estado";
  }
  
  const translations: Record<string, string> = {
    'scheduled': 'Programada',
    'in_progress': 'En Proceso',
    'completed': 'Completada',
    'confirmed': 'Confirmada',
    'pending': 'Pendiente',
    'cancelled': 'Cancelada'
  };
  return translations[status] || status;
};

const getStatusColor = (status: string | null) => {
  if (status === null || status === undefined) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400";
  }
  
  switch (status) {
    case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "in_progress": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "confirmed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export default function Clients() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { isInstant } = useFastLoad();
  useInstantLoad(); // Enable instant loading for this page
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients, isLoading: clientsLoading } = useFastFetch<Client[]>(
    `/api/clients/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const { data: pets } = useFastFetch<Pet[]>(
    `/api/pets/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const { data: appointments } = useFastFetch<Appointment[]>(
    `/api/appointments/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/clients`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Cliente creado",
        description: "El cliente se ha registrado exitosamente.",
      });
      // Trigger manual refresh with fast loading
      window.location.reload();
      setShowClientForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cliente",
        variant: "destructive",
      });
    },
  });

  const createPetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pets`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Mascota registrada",
        description: "La mascota se ha registrado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setShowPetForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la mascota",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/clients/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "La información del cliente se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingClient(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el cliente",
        variant: "destructive",
      });
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/pets/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Mascota actualizada",
        description: "La información de la mascota se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setEditingPet(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la mascota",
        variant: "destructive",
      });
    },
  });

  const togglePetStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/pets/${id}`, "PATCH", { isActive });
    },
    onSuccess: (_, { isActive }) => {
      toast({
        title: isActive ? "Mascota activada" : "Mascota desactivada", 
        description: isActive 
          ? "La mascota ha sido marcada como activa." 
          : "La mascota ha sido marcada como inactiva.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado de la mascota",
        variant: "destructive",
      });
    },
  });

  // Always show UI immediately - no conditional rendering that causes white screens

  const handleCreateClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      fraccionamiento: formData.get("fraccionamiento"),
    };

    createClientMutation.mutate(data);
  };

  const handleCreatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      clientId: selectedClient?.id,
      name: formData.get("name"),
      species: formData.get("species"),
      breed: formData.get("breed"),
      registeredAge: parseInt(formData.get("registeredAge") as string) || null,
      birthDate: formData.get("birthDate") || null,
      weight: parseFloat(formData.get("weight") as string) || null,
    };

    createPetMutation.mutate(data);
  };

  const handleUpdateClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      fraccionamiento: formData.get("fraccionamiento"),
    };

    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient, data });
    }
  };

  const handleUpdatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      species: formData.get("species"),
      breed: formData.get("breed"),
      registeredAge: parseInt(formData.get("registeredAge") as string) || null,
      birthDate: formData.get("birthDate") || null,
      weight: parseFloat(formData.get("weight") as string) || null,
    };

    if (editingPet) {
      updatePetMutation.mutate({ id: editingPet, data });
    }
  };

  const togglePetStatus = (petId: string, currentStatus: boolean = true) => {
    togglePetStatusMutation.mutate({ id: petId, isActive: !currentStatus });
  };

  // Calculate current age from birth date
  const calculateCurrentAge = (birthDate: string | null, registeredAge: number | null) => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - birth.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
      return diffYears;
    }
    return registeredAge || 0;
  };

  const getClientPets = (clientId: string) => {
    return pets?.filter(pet => pet.clientId === clientId) || [];
  };

  const getPetAppointments = (petId: string) => {
    return appointments?.filter(apt => apt.petId === petId) || [];
  };

  const generateQRCode = (petId: string) => {
    // Generate QR code URL for pet medical records access
    const qrUrl = `${window.location.origin}/pet-records/${petId}`;
    navigator.clipboard.writeText(qrUrl).then(() => {
      toast({
        title: "Código QR - URL copiada",
        description: `URL del perfil médico copiada al portapapeles: ${qrUrl}`,
      });
    }).catch(() => {
      toast({
        title: "Código QR generado",
        description: `URL del perfil médico: ${qrUrl}`,
      });
    });
  };

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clients || !searchQuery.trim()) return clients || [];
    
    const query = searchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.phone && client.phone.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  return (
    <div className="p-6 container-fluid responsive-typography">
      <BackButton className="mb-4" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300">Gestión de Clientes y Mascotas - Actualización de Información</h1>
        <div className="flex items-center space-x-3">
          <DebugControls />
          <Button 
            onClick={() => setShowClientForm(true)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <Card className="mb-6 dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">
              <strong>Tenant:</strong> {currentTenant?.id || 'No tenant selected'} | 
              <strong> Total Clientes:</strong> {clients?.length || 0}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar clientes por nombre, email o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-client-search"
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''} de {clients?.length || 0}
            </div>
          )}
        </CardContent>
      </Card>

      {showClientForm && (
        <Card className="mb-6 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Registrar Nuevo Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input name="name" required placeholder="Nombre del cliente" />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input name="phone" required placeholder="Número de contacto" />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" placeholder="correo@ejemplo.com" />
              </div>

              <div>
                <Label htmlFor="fraccionamiento">Fraccionamiento</Label>
                <Input name="fraccionamiento" placeholder="Colonia o fraccionamiento" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección Completa</Label>
                <Textarea name="address" placeholder="Dirección detallada del cliente" />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  {createClientMutation.isPending ? "Guardando..." : "Registrar Cliente"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowClientForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showPetForm && selectedClient && (
        <Card className="mb-6 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Registrar Nueva Mascota para {selectedClient.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePet} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre de la Mascota</Label>
                <Input name="name" required placeholder="Nombre de la mascota" />
              </div>

              <div>
                <Label htmlFor="species">Especie</Label>
                <Input name="species" required placeholder="Perro, Gato, etc." />
              </div>

              <div>
                <Label htmlFor="breed">Raza</Label>
                <Input name="breed" placeholder="Raza de la mascota" />
              </div>

              <div>
                <Label htmlFor="registeredAge">Edad Registrada (años)</Label>
                <Input name="registeredAge" type="number" min="0" placeholder="Edad al momento del registro" />
              </div>

              <div>
                <Label htmlFor="birthDate">Fecha de Nacimiento (para cálculo automático)</Label>
                <Input name="birthDate" type="date" placeholder="Fecha de nacimiento" />
              </div>

              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input name="weight" type="number" step="0.1" min="0" placeholder="Peso en kilogramos" />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createPetMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createPetMutation.isPending ? "Guardando..." : "Registrar Mascota"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowPetForm(false);
                    setSelectedClient(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="auto-grid">
        {filteredClients.length === 0 && searchQuery ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-2">No se encontraron clientes</h3>
              <p className="text-muted-foreground mb-4">
                No hay clientes que coincidan con "{searchQuery}"
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery("")}
              >
                Limpiar búsqueda
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
          <Card key={client.id} className="border-l-4 border-l-blue-400 dark:border-l-blue-500 dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {editingClient === client.id ? (
                    <form onSubmit={handleUpdateClient} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="name" className="text-sm">Nombre Completo</Label>
                          <Input name="name" defaultValue={client.name} required className="h-8" />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                          <Input name="phone" defaultValue={client.phone || ''} required className="h-8" />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-sm">Email</Label>
                          <Input name="email" type="email" defaultValue={client.email || ''} className="h-8" />
                        </div>
                        <div>
                          <Label htmlFor="fraccionamiento" className="text-sm">Fraccionamiento</Label>
                          <Input name="fraccionamiento" defaultValue={client.fraccionamiento || ''} className="h-8" />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="address" className="text-sm">Dirección</Label>
                          <Textarea name="address" defaultValue={client.address || ''} className="min-h-[60px]" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={updateClientMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {updateClientMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingClient(null)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.name}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.fraccionamiento && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{client.fraccionamiento}</span>
                          </div>
                        )}
                      </div>

                      {client.address && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{client.address}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {editingClient !== client.id && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingClient(client.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Cliente
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedClient(client);
                          setShowPetForm(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Mascota
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Pets Section */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Mascotas ({getClientPets(client.id).length})
                </h4>

                {getClientPets(client.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                    <p>No hay mascotas registradas para este cliente</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getClientPets(client.id).map((pet) => (
                      <Card key={pet.id} className={`${(pet as any).isActive === false ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {editingPet === pet.id ? (
                                  <form onSubmit={handleUpdatePet} className="flex items-center gap-2 flex-1">
                                    <Input 
                                      name="name" 
                                      defaultValue={pet.name} 
                                      className="h-8 w-32"
                                      required 
                                    />
                                    <Input 
                                      name="species" 
                                      defaultValue={pet.species} 
                                      className="h-8 w-24"
                                      required 
                                    />
                                    <Input 
                                      name="breed" 
                                      defaultValue={pet.breed || ''} 
                                      className="h-8 w-24"
                                      placeholder="Raza" 
                                    />
                                    <Input 
                                      name="registeredAge" 
                                      type="number"
                                      defaultValue={pet.registeredAge || ''} 
                                      className="h-8 w-16"
                                      placeholder="Edad" 
                                    />
                                    <Input 
                                      name="birthDate" 
                                      type="date"
                                      defaultValue={pet.birthDate || ''} 
                                      className="h-8 w-32"
                                    />
                                    <Input 
                                      name="weight" 
                                      type="number"
                                      step="0.1"
                                      defaultValue={pet.weight || ''} 
                                      className="h-8 w-20"
                                      placeholder="Peso" 
                                    />
                                    <Button type="submit" size="sm" className="h-8">
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8"
                                      onClick={() => setEditingPet(null)}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </form>
                                ) : (
                                  <>
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100">{pet.name}</h5>
                                    <Badge variant="secondary">{pet.species}</Badge>
                                    {pet.breed && <Badge variant="outline">{pet.breed}</Badge>}
                                    {(pet as any).isActive === false && (
                                      <Badge variant="destructive" className="text-xs">Inactiva</Badge>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {editingPet !== pet.id && (
                                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                                  {pet.registeredAge && <span>Edad Registrada: {pet.registeredAge} años</span>}
                                  {pet.birthDate && (
                                    <span>Edad Actual: {calculateCurrentAge(pet.birthDate, pet.registeredAge)} años</span>
                                  )}
                                  {!pet.birthDate && pet.registeredAge && (
                                    <span className="text-orange-600 dark:text-orange-400">Huésped (sin fecha de nacimiento)</span>
                                  )}
                                  {pet.weight && <span>Peso: {pet.weight} kg</span>}
                                </div>
                              )}

                              <div className="mt-3">
                                <Tabs defaultValue="history" className="w-full">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="history">Historial</TabsTrigger>
                                    <TabsTrigger value="medical">Médico</TabsTrigger>
                                    <TabsTrigger value="media">Galería</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="history" className="mt-4">
                                    <div className="space-y-2">
                                      {getPetAppointments(pet.id).slice(0, 3).map((appointment) => (
                                        <div key={appointment.id} className="flex items-center justify-between text-sm">
                                          <span>{appointment.scheduledDate} - {appointment.type}</span>
                                          <Badge className={getStatusColor(appointment.status)}>
                                            {getStatusTranslation(appointment.status)}
                                          </Badge>
                                        </div>
                                      ))}
                                      {getPetAppointments(pet.id).length === 0 && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay historial de citas</p>
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="medical" className="mt-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      <p>Historial médico y notas veterinarias</p>
                                      <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-600">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Los registros médicos se crearán con cada cita completada
                                        </p>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="media" className="mt-4">
                                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                                      <div className="text-center">
                                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Galería de fotos y videos</p>
                                        <Button variant="outline" size="sm" className="mt-2">
                                          <Camera className="w-4 h-4 mr-2" />
                                          Subir Media
                                        </Button>
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {editingPet !== pet.id && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setEditingPet(pet.id)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </Button>
                                  <Button 
                                    variant={(pet as any).isActive === false ? "default" : "destructive"}
                                    size="sm"
                                    onClick={() => togglePetStatus(pet.id, (pet as any).isActive)}
                                    disabled={togglePetStatusMutation.isPending}
                                  >
                                    <Power className="w-4 h-4 mr-2" />
                                    {(pet as any).isActive === false ? "Activar" : "Desactivar"}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => generateQRCode(pet.id)}
                                  >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    QR
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <History className="w-4 h-4 mr-2" />
                                    Ver Todo
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          ))
        )}

        {filteredClients.length === 0 && !searchQuery && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes registrados</h3>
              <p className="text-gray-500 mb-4">Comienza registrando tu primer cliente y sus mascotas.</p>
              <Button onClick={() => setShowClientForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Primer Cliente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}