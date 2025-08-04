import { useState, useEffect, useMemo, Suspense, useRef, lazy } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle, MapPin, Building, User, Heart } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { debounce } from "lodash";

// Lazy load map component to prevent SSR issues
const LeafletMap = lazy(() => import("@/components/LeafletMap"));

interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  fraccionamiento: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

interface PetData {
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: string;
  medicalHistory: string;
}

interface BookingData {
  serviceId: string;
  requestedDate: string;
  requestedTime: string;
  logistics: string;
  notes: string;
}

const BREED_CACHE = new Map<string, { breeds: string[], timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function BookingWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<any>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    fraccionamiento: "",
    postalCode: "",
    latitude: "",
    longitude: ""
  });
  
  const [petData, setPetData] = useState<PetData>({
    name: "",
    species: "",
    breed: "",
    age: 0,
    weight: "",
    medicalHistory: ""
  });
  
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: "",
    requestedDate: "",
    requestedTime: "",
    logistics: "pickup",
    notes: ""
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([25.7617, -100.1950]);

  // Get tenant location
  const tenantLocation = useMemo(() => {
    if (currentTenant?.latitude && currentTenant?.longitude) {
      return {
        lat: parseFloat(currentTenant.latitude),
        lng: parseFloat(currentTenant.longitude)
      };
    }
    return { lat: 25.7617, lng: -100.1950 };
  }, [currentTenant]);

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ['/api/services', currentTenant?.id],
    enabled: !!currentTenant?.id
  });

  // Fetch pet breeds with caching
  const { data: allBreeds = [] } = useQuery({
    queryKey: ['/api/pet-breeds'],
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION,
    enabled: true
  });

  // Filter breeds based on selected species with caching
  const filteredBreeds = useMemo(() => {
    if (!petData.species) return [];
    
    const cacheKey = petData.species;
    const cached = BREED_CACHE.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.breeds;
    }
    
    const breeds = allBreeds.filter((breed: any) => 
      breed.species.toLowerCase() === petData.species.toLowerCase()
    ).map((breed: any) => breed.breed);
    
    BREED_CACHE.set(cacheKey, { breeds, timestamp: Date.now() });
    return breeds;
  }, [petData.species, allBreeds]);

  // Geocoding function
  const geocodeAddress = async (address: string, fraccionamiento: string, postalCode: string) => {
    try {
      const fullAddress = `${address}, ${fraccionamiento}, García, Nuevo León, México`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const exactLat = parseFloat(data[0].lat).toFixed(6);
        const exactLng = parseFloat(data[0].lon).toFixed(6);
        
        setCustomerData(prev => ({
          ...prev,
          latitude: exactLat,
          longitude: exactLng
        }));
        
        setMapCenter([parseFloat(exactLat), parseFloat(exactLng)]);
      }
    } catch (error) {
      console.log('Geocoding failed:', error);
    }
  };

  const debouncedGeocode = debounce(geocodeAddress, 1000);

  // Auto-select "Otro" breed when "Otro" species is selected
  useEffect(() => {
    if (petData.species === 'otro') {
      setPetData(prev => ({ ...prev, breed: 'otro' }));
    }
  }, [petData.species]);

  // Update map center when tenant location changes
  useEffect(() => {
    if (tenantLocation.lat && tenantLocation.lng) {
      setMapCenter([tenantLocation.lat, tenantLocation.lng]);
    }
  }, [tenantLocation]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...appointmentData,
          tenantId: currentTenant?.id
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Cita creada exitosamente",
        description: "La cita ha sido programada correctamente",
        variant: "default"
      });
      setLocation('/appointments');
    },
    onError: (error) => {
      toast({
        title: "Error al crear la cita",
        description: "Hubo un problema al crear la cita. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });

  // Handle final submission
  const handleSubmit = () => {
    const appointmentData = {
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerData.email,
      customerAddress: customerData.address,
      customerFraccionamiento: customerData.fraccionamiento,
      customerPostalCode: customerData.postalCode,
      customerLatitude: customerData.latitude,
      customerLongitude: customerData.longitude,
      petName: petData.name,
      petSpecies: petData.species,
      petBreed: petData.breed,
      petAge: petData.age,
      petWeight: petData.weight,
      petMedicalHistory: petData.medicalHistory,
      serviceId: bookingData.serviceId,
      requestedDate: bookingData.requestedDate,
      requestedTime: bookingData.requestedTime,
      logistics: bookingData.logistics,
      notes: bookingData.notes,
      status: "pending"
    };
    
    createAppointmentMutation.mutate(appointmentData);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Debes iniciar sesión para acceder al sistema de citas",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de citas...</p>
        </div>
      </div>
    );
  }

  const steps = [
    "Información Completa",
    "Selección de Servicio y Horario",
    "Confirmación"
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <BackButton className="mb-4" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Programar Nueva Cita</h1>
        <p className="text-gray-600">Completa la información para programar la cita</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              index + 1 <= currentStep 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1 <= currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
            </div>
            <span className="text-xs mt-1 text-center max-w-20">{step}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1]}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Complete Information (Customer, Address, Pet) */}
          {currentStep === 1 && (
            <div className="space-y-8">
              {/* Customer Information Section */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="mr-2 h-5 w-5 text-blue-600" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={customerData.name}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) }))}
                      placeholder="María González"
                      required
                      className="capitalize"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="000 000 0000"
                      required
                      data-testid="input-customer-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                      placeholder="maria@ejemplo.com"
                      className="lowercase"
                      data-testid="input-customer-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Dirección completa *</Label>
                    <Input
                      id="address"
                      value={customerData.address}
                      onChange={(e) => {
                        const formattedValue = e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                        setCustomerData(prev => ({ ...prev, address: formattedValue }));
                        // Trigger geocoding with debounce
                        debouncedGeocode(formattedValue, customerData.fraccionamiento || '', customerData.postalCode || '');
                      }}
                      placeholder="Calle Gracias 345"
                      required
                      className="capitalize"
                      data-testid="input-customer-address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fraccionamiento">Fraccionamiento *</Label>
                    <Input
                      id="fraccionamiento"
                      value={customerData.fraccionamiento}
                      onChange={(e) => {
                        const formattedValue = e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                        setCustomerData(prev => ({ ...prev, fraccionamiento: formattedValue }));
                        // Trigger geocoding with debounce
                        debouncedGeocode(customerData.address || '', formattedValue, customerData.postalCode || '');
                      }}
                      placeholder="Valle De Cumbres"
                      required
                      className="capitalize"
                      data-testid="input-customer-fraccionamiento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input
                      id="postalCode"
                      value={customerData.postalCode}
                      onChange={(e) => {
                        setCustomerData(prev => ({ ...prev, postalCode: e.target.value }));
                        // Trigger geocoding with debounce
                        debouncedGeocode(customerData.address || '', customerData.fraccionamiento || '', e.target.value);
                      }}
                      placeholder="66260"
                      data-testid="input-customer-postal-code"
                    />
                  </div>
                </div>
              </div>

              {/* Pet Information Section */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Heart className="mr-2 h-5 w-5 text-green-600" />
                  Información de la Mascota
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="petName">Nombre de la mascota *</Label>
                    <Input
                      id="petName"
                      value={petData.name}
                      onChange={(e) => setPetData(prev => ({ ...prev, name: e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) }))}
                      placeholder="Frodo"
                      required
                      className="capitalize"
                      data-testid="input-pet-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="species">Especie *</Label>
                    <Select 
                      value={petData.species} 
                      onValueChange={(value) => {
                        setPetData(prev => ({ ...prev, species: value }));
                        // Auto-select "Otro" breed for "Otro" species
                        if (value === 'otro') {
                          setPetData(prev => ({ ...prev, breed: 'otro' }));
                          // Focus on age field after auto-selection
                          setTimeout(() => {
                            const ageInput = document.getElementById('age');
                            if (ageInput) ageInput.focus();
                          }, 100);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-pet-species">
                        <SelectValue placeholder="Seleccionar especie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="perro">🐕 Perro</SelectItem>
                        <SelectItem value="gato">🐱 Gato</SelectItem>
                        <SelectItem value="ave">🦜 Ave</SelectItem>
                        <SelectItem value="reptil">🦎 Reptil</SelectItem>
                        <SelectItem value="conejo">🐰 Conejo</SelectItem>
                        <SelectItem value="otro">🐾 Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="breed">Raza *</Label>
                    <Select 
                      value={petData.breed} 
                      onValueChange={(value) => setPetData(prev => ({ ...prev, breed: value }))}
                    >
                      <SelectTrigger data-testid="select-pet-breed">
                        <SelectValue placeholder="Seleccionar raza" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredBreeds.length > 0 ? (
                          filteredBreeds.map((breed) => (
                            <SelectItem key={breed} value={breed.toLowerCase().replace(/\s+/g, '-')}>
                              {breed}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="placeholder" disabled>
                            Selecciona una especie primero
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="age">Edad (años) *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={petData.age}
                      onChange={(e) => setPetData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                      placeholder="3"
                      required
                      data-testid="input-pet-age"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    <Label htmlFor="weight">Peso *</Label>
                    <Input
                      id="weight"
                      value={petData.weight}
                      onChange={(e) => setPetData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="5.5 kg"
                      required
                      data-testid="input-pet-weight"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Label htmlFor="medicalHistory">Historial médico / Notas especiales</Label>
                    <Input
                      id="medicalHistory"
                      value={petData.medicalHistory}
                      onChange={(e) => setPetData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                      placeholder="Condiciones médicas, alergias, comportamiento especial..."
                      data-testid="input-pet-medical-history"
                    />
                  </div>
                </div>
              </div>

              {/* Location and Map Section */}
              <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 p-6 rounded-lg border-2 border-dashed border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-blue-600" />
                  📍 Ubicación GPS del Cliente
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Haz clic derecho en el mapa para establecer la ubicación exacta del cliente. 
                  Esto ayudará a planificar las rutas de entrega.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
                      <Suspense fallback={<div className="h-full w-full bg-gray-100 flex items-center justify-center">Cargando mapa...</div>}>
                        <LeafletMap
                          center={mapCenter}
                          zoom={13}
                          tenantLocation={tenantLocation}
                          customerLocation={
                            customerData.latitude && customerData.longitude && 
                            !isNaN(parseFloat(customerData.latitude)) && 
                            !isNaN(parseFloat(customerData.longitude))
                              ? {
                                  lat: parseFloat(customerData.latitude),
                                  lng: parseFloat(customerData.longitude),
                                  address: customerData.address,
                                  fraccionamiento: customerData.fraccionamiento,
                                  clientName: customerData.name,
                                  petName: petData.name
                                }
                              : null
                          }
                          onMapClick={(lat, lng) => {
                            // Set coordinates immediately without any delay
                            const exactLat = lat.toFixed(6);
                            const exactLng = lng.toFixed(6);
                            
                            setCustomerData(prev => ({
                              ...prev,
                              latitude: exactLat,
                              longitude: exactLng
                            }));
                            
                            toast({
                              title: "Ubicación del cliente establecida",
                              description: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                              variant: "default"
                            });
                          }}
                        />
                      </Suspense>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        🏥 Información de la Clínica
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Ubicación:</strong> Centro del mapa</p>
                        <p><strong>GPS:</strong> {tenantLocation.lat.toFixed(4)}, {tenantLocation.lng.toFixed(4)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          setMapCenter([tenantLocation.lat, tenantLocation.lng]);
                          if (mapRef.current) {
                            mapRef.current.setView([tenantLocation.lat, tenantLocation.lng], 15);
                          }
                        }}
                        data-testid="button-view-clinic"
                      >
                        <Building className="mr-1 h-4 w-4" />
                        Ver clínica
                      </Button>
                    </div>
                    
                    {customerData.latitude && customerData.longitude && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-3 flex items-center">
                          🐾 Ubicación del Cliente
                        </h4>
                        <div className="text-sm text-green-700 space-y-1">
                          <p><strong>GPS:</strong> {parseFloat(customerData.latitude).toFixed(4)}, {parseFloat(customerData.longitude).toFixed(4)}</p>
                          {customerData.address && <p><strong>Dir:</strong> {customerData.address}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full border-green-300 text-green-700 hover:bg-green-100"
                          onClick={() => {
                            const lat = parseFloat(customerData.latitude);
                            const lng = parseFloat(customerData.longitude);
                            setMapCenter([lat, lng]);
                            if (mapRef.current) {
                              mapRef.current.setView([lat, lng], 16);
                            }
                          }}
                          data-testid="button-view-customer"
                        >
                          <MapPin className="mr-1 h-4 w-4" />
                          Ver cliente
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/appointments')}
                  data-testid="button-cancel"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Validation for customer data
                    if (!customerData.name.trim()) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa el nombre del cliente",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!customerData.phone.trim()) {
                      toast({
                        title: "Campo requerido", 
                        description: "Por favor ingresa el teléfono del cliente",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!customerData.address.trim()) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa la dirección del cliente",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!customerData.fraccionamiento.trim()) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa el fraccionamiento/colonia",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Validation for pet data
                    if (!petData.name.trim()) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa el nombre de la mascota",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!petData.species) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor selecciona la especie de la mascota",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!petData.breed) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor selecciona la raza de la mascota",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!petData.age) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa la edad de la mascota",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!petData.weight?.trim()) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor ingresa el peso de la mascota",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    setCurrentStep(2);
                  }}
                  data-testid="button-next-to-service"
                >
                  Siguiente: Seleccionar Servicio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Service Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services?.map((service: any) => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      bookingData.serviceId === service.id
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : "hover:ring-1 hover:ring-gray-300"
                    }`}
                    onClick={() => setBookingData(prev => ({ ...prev, serviceId: service.id }))}
                    data-testid={`service-card-${service.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">
                          {service.type === 'grooming' && '✂️'}
                          {service.type === 'medical' && '🏥'}
                          {service.type === 'delivery' && '🚗'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-lg font-bold text-green-600">
                              ${service.price}
                            </span>
                            <span className="text-xs text-gray-500">
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {bookingData.serviceId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requestedDate">Fecha preferida *</Label>
                      <Input
                        id="requestedDate"
                        type="date"
                        value={bookingData.requestedDate}
                        onChange={(e) => setBookingData(prev => ({ ...prev, requestedDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        data-testid="input-requested-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="requestedTime">Hora preferida *</Label>
                      <Input
                        id="requestedTime"
                        type="time"
                        value={bookingData.requestedTime}
                        onChange={(e) => setBookingData(prev => ({ ...prev, requestedTime: e.target.value }))}
                        required
                        data-testid="input-requested-time"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logistics">Logística</Label>
                    <Select
                      value={bookingData.logistics}
                      onValueChange={(value) => setBookingData(prev => ({ ...prev, logistics: value }))}
                    >
                      <SelectTrigger data-testid="select-logistics">
                        <SelectValue placeholder="Seleccionar opción de logística" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Recoger en clínica</SelectItem>
                        <SelectItem value="delivery">Entrega a domicilio</SelectItem>
                        <SelectItem value="both">Recoger y entregar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas adicionales</Label>
                    <Input
                      id="notes"
                      value={bookingData.notes}
                      onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Instrucciones especiales, horarios preferidos, etc."
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  data-testid="button-back-to-info"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!bookingData.serviceId) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor selecciona un servicio",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!bookingData.requestedDate) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor selecciona una fecha",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (!bookingData.requestedTime) {
                      toast({
                        title: "Campo requerido",
                        description: "Por favor selecciona una hora",
                        variant: "destructive"
                      });
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  data-testid="button-next-to-confirmation"
                >
                  Siguiente: Confirmar Cita
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer & Pet Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      Resumen del Cliente y Mascota
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <strong>Cliente:</strong> {customerData.name}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {customerData.phone}
                      </div>
                      {customerData.email && (
                        <div>
                          <strong>Email:</strong> {customerData.email}
                        </div>
                      )}
                      <div>
                        <strong>Dirección:</strong> {customerData.address}, {customerData.fraccionamiento}
                      </div>
                      <hr className="my-3" />
                      <div>
                        <strong>Mascota:</strong> {petData.name}
                      </div>
                      <div>
                        <strong>Especie:</strong> {petData.species}
                      </div>
                      <div>
                        <strong>Raza:</strong> {petData.breed}
                      </div>
                      <div>
                        <strong>Edad:</strong> {petData.age} años
                      </div>
                      <div>
                        <strong>Peso:</strong> {petData.weight}
                      </div>
                      {petData.medicalHistory && (
                        <div>
                          <strong>Historial médico:</strong> {petData.medicalHistory}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Service Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Resumen del Servicio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {services && (
                        <div>
                          <strong>Servicio:</strong> {services.find((s: any) => s.id === bookingData.serviceId)?.name}
                        </div>
                      )}
                      <div>
                        <strong>Fecha:</strong> {bookingData.requestedDate}
                      </div>
                      <div>
                        <strong>Hora:</strong> {bookingData.requestedTime}
                      </div>
                      <div>
                        <strong>Logística:</strong> {
                          bookingData.logistics === 'pickup' ? 'Recoger en clínica' :
                          bookingData.logistics === 'delivery' ? 'Entrega a domicilio' :
                          'Recoger y entregar'
                        }
                      </div>
                      {bookingData.notes && (
                        <div>
                          <strong>Notas:</strong> {bookingData.notes}
                        </div>
                      )}
                      {services && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-800">
                            Precio: ${services.find((s: any) => s.id === bookingData.serviceId)?.price}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  data-testid="button-back-to-service"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createAppointmentMutation.isPending}
                  data-testid="button-confirm-appointment"
                >
                  {createAppointmentMutation.isPending ? (
                    "Creando cita..."
                  ) : (
                    "Confirmar Cita"
                  )}
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}