import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useFastLoad, useFastFetch } from "@/hooks/useFastLoad";
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
import { Plus, User, Phone, Mail, MapPin, Heart, Camera, QrCode, History } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Pet, Appointment, PetMedia } from "@shared/schema";

export default function Clients() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { isInstant } = useFastLoad();
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

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
      return apiRequest(`/api/clients`, {
        method: "POST",
        body: JSON.stringify({ ...data, tenantId: currentTenant?.id }),
      });
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
      return apiRequest(`/api/pets`, {
        method: "POST",
        body: JSON.stringify(data),
      });
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
      age: parseInt(formData.get("age") as string) || null,
      weight: parseFloat(formData.get("weight") as string) || null,
    };

    createPetMutation.mutate(data);
  };

  const getClientPets = (clientId: string) => {
    return pets?.filter(pet => pet.clientId === clientId) || [];
  };

  const getPetAppointments = (petId: string) => {
    return appointments?.filter(apt => apt.petId === petId) || [];
  };

  const generateQRCode = (petId: string) => {
    // In a real app, this would generate an actual QR code
    const qrUrl = `${window.location.origin}/pet/${petId}`;
    toast({
      title: "Código QR generado",
      description: `URL del perfil: ${qrUrl}`,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Clientes y Mascotas</h1>
        <div className="flex items-center space-x-3">
          <DebugControls />
          <Button 
            onClick={() => setShowClientForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {showClientForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Nuevo Cliente</CardTitle>
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
                  className="bg-green-600 hover:bg-green-700"
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Nueva Mascota para {selectedClient.name}</CardTitle>
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
                <Label htmlFor="age">Edad (años)</Label>
                <Input name="age" type="number" min="0" placeholder="Edad en años" />
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

      <div className="grid gap-6">
        {clients?.map((client) => (
          <Card key={client.id} className="border-l-4 border-l-blue-400">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
                    <p className="text-sm text-gray-600 mt-2">{client.address}</p>
                  )}
                </div>

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
              </div>

              {/* Pets Section */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Mascotas ({getClientPets(client.id).length})
                </h4>

                {getClientPets(client.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No hay mascotas registradas para este cliente</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getClientPets(client.id).map((pet) => (
                      <Card key={pet.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h5 className="font-medium text-gray-900">{pet.name}</h5>
                                <Badge variant="secondary">{pet.species}</Badge>
                                {pet.breed && <Badge variant="outline">{pet.breed}</Badge>}
                              </div>
                              
                              <div className="flex gap-4 text-sm text-gray-600">
                                {pet.age && <span>Edad: {pet.age} años</span>}
                                {pet.weight && <span>Peso: {pet.weight} kg</span>}
                              </div>

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
                                          <Badge variant="outline">{appointment.status}</Badge>
                                        </div>
                                      ))}
                                      {getPetAppointments(pet.id).length === 0 && (
                                        <p className="text-gray-500 text-sm">No hay historial de citas</p>
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="medical" className="mt-4">
                                    <div className="text-sm text-gray-600">
                                      <p>Historial médico y notas veterinarias</p>
                                      <div className="mt-2 p-3 bg-white rounded border">
                                        <p className="text-xs text-gray-500">
                                          Los registros médicos se crearán con cada cita completada
                                        </p>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="media" className="mt-4">
                                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                                      <div className="text-center">
                                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Galería de fotos y videos</p>
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
        ))}

        {clients?.length === 0 && (
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