import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Phone, 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  Navigation,
  Plus,
  Minus
} from "lucide-react";

import markerIconPath from "@assets/marker-icon_1754279780257.png";
import blueMarkerIconPath from "@assets/marker-icon_1754283680600.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Pet, Service } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function BookingWizard() {
  const { currentTenant } = useTenant();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  
  // Form data
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    postalCode: "",
    fraccionamiento: "",
    latitude: "",
    longitude: ""
  });
  
  const [petData, setPetData] = useState({
    name: "",
    species: "",
    breed: "",
    age: 0,
    weight: ""
  });
  
  const [bookingData, setBookingData] = useState({
    serviceId: "",
    requestedDate: "",
    requestedTime: "17:00", // 5 PM as requested
    logistics: "pickup",
    notes: ""
  });
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);
  const [mapCoordinates, setMapCoordinates] = useState({ lat: 25.6866, lng: -100.3161 }); // Monterrey default
  const [tenantLocation, setTenantLocation] = useState({ lat: 25.740586082849077, lng: -100.40735989019088 });
  const [mapDiameterKm, setMapDiameterKm] = useState(8); // Configurable from admin
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: 0, lng: 0 });
  
  // Load map settings from localStorage (admin configuration)
  useEffect(() => {
    if (currentTenant?.id) {
      const savedSettings = localStorage.getItem(`mapSettings_${currentTenant.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setMapDiameterKm(settings.diameterKm || 8);
      }
    }
  }, [currentTenant?.id]);

  // Queries
  const { data: services } = useQuery({
    queryKey: ["/api/services", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Remove staff query - not needed for delivery planning

  // Update tenant location and center map when currentTenant changes
  useEffect(() => {
    if (currentTenant?.latitude && currentTenant?.longitude) {
      const tenantLat = parseFloat(currentTenant.latitude);
      const tenantLng = parseFloat(currentTenant.longitude);
      setTenantLocation({ lat: tenantLat, lng: tenantLng });
      // Always center map on tenant location
      setMapCoordinates({ lat: tenantLat, lng: tenantLng });
    }
  }, [currentTenant]);

  // Initialize map centered on tenant location for delivery planning
  useEffect(() => {
    setMapCoordinates(tenantLocation);
  }, [tenantLocation]);

  // Geocoding function for address with postal code fallback
  const geocodeAddress = async (address: string, fraccionamiento: string, postalCode?: string) => {
    if (!address || !fraccionamiento) return null;
    
    try {
      console.log("Geocoding address:", address, fraccionamiento, postalCode);
      
      // Try with full address first
      let fullAddress = `${address}, ${fraccionamiento}, Monterrey, Nuevo León, México`;
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=mx&addressdetails=1`
      );
      let data = await response.json();
      console.log("First geocoding attempt:", data);
      
      // If no results and we have postal code, try with postal code
      if (data.length === 0 && postalCode) {
        console.log("Trying with postal code:", postalCode);
        fullAddress = `${postalCode}, Monterrey, Nuevo León, México`;
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=mx&addressdetails=1`
        );
        data = await response.json();
        console.log("Postal code geocoding attempt:", data);
      }
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        console.log("Setting coordinates:", newCoords);
        setMapCoordinates(newCoords);
        setCustomerData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));
        return newCoords;
      } else {
        // Use tenant default coordinates or fallback
        console.log("No geocoding results found, using default coordinates");
        const defaultCoords = {
          lat: currentTenant?.latitude ? parseFloat(currentTenant.latitude) : 25.740586082849077,
          lng: currentTenant?.longitude ? parseFloat(currentTenant.longitude) : -100.40735989019088
        };
        setMapCoordinates(defaultCoords);
        setCustomerData(prev => ({
          ...prev,
          latitude: defaultCoords.lat.toString(),
          longitude: defaultCoords.lng.toString()
        }));
        toast({
          title: "Usando ubicación por defecto",
          description: "No se encontró la dirección exacta. Se usa la ubicación de la clínica.",
          variant: "default",
        });
        return defaultCoords;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      // Use default coordinates on error
      const defaultCoords = {
        lat: currentTenant?.latitude ? parseFloat(currentTenant.latitude) : 25.740586082849077,
        lng: currentTenant?.longitude ? parseFloat(currentTenant.longitude) : -100.40735989019088
      };
      setMapCoordinates(defaultCoords);
      toast({
        title: "Error de geocodificación",
        description: "Error al buscar la ubicación. Se usa la ubicación por defecto.",
        variant: "destructive",
      });
      return defaultCoords;
    }
  };

  // Check available slots when service and date are selected
  const checkAvailableSlots = async () => {
    if (!bookingData.serviceId || !bookingData.requestedDate) return;
    
    try {
      const response = await apiRequest('GET', 
        `/api/appointments/check-availability/${currentTenant?.id}?date=${bookingData.requestedDate}&serviceId=${bookingData.serviceId}&time=${bookingData.requestedTime}`
      ) as { available: boolean; alternativeSlots: string[] };
      
      if (response.available) {
        setAvailableSlots([bookingData.requestedTime]);
      } else {
        setAvailableSlots(response.alternativeSlots || []);
        toast({
          title: "Horario no disponible",
          description: `Lo siento, no tenemos disponibilidad a las ${bookingData.requestedTime}. Te mostramos horarios alternativos.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailableSlots([]);
    }
  };

  // Reserve a time slot temporarily
  const reserveSlotMutation = useMutation({
    mutationFn: async (slotTime: string) => {
      return apiRequest('POST', `/api/appointments/reserve-slot/${currentTenant?.id}`, {
        sessionId,
        scheduledDate: bookingData.requestedDate,
        scheduledTime: slotTime,
        serviceId: bookingData.serviceId
      });
    },
    onSuccess: (data, slotTime) => {
      setReservedSlots([slotTime]);
      setSelectedSlot(slotTime);
      toast({
        title: "Horario reservado temporalmente",
        description: "Tienes 10 minutos para confirmar la cita.",
      });
      
      // Auto-expire reservation after 10 minutes
      setTimeout(() => {
        setReservedSlots([]);
        setSelectedSlot("");
        toast({
          title: "Reserva expirada",
          description: "La reserva temporal ha expirado. Por favor selecciona otro horario.",
          variant: "destructive",
        });
      }, 10 * 60 * 1000); // 10 minutes
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para reservar horarios",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo reservar el horario",
        variant: "destructive",
      });
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // First create/find client
      let clientResponse: Client;
      try {
        clientResponse = await apiRequest('POST', `/api/clients/${currentTenant?.id}`, customerData) as Client;
      } catch (error) {
        // If client exists, try to get by phone
        clientResponse = await apiRequest('GET', `/api/clients/by-phone/${currentTenant?.id}/${customerData.phone}`) as Client;
      }
      
      // Create pet
      const petResponse = await apiRequest('POST', `/api/pets`, {
        ...petData,
        clientId: clientResponse.id
      }) as Pet;
      
      // Create appointment
      const selectedService = (services || []).find((s: Service) => s.id === bookingData.serviceId);
      const appointmentData = {
        clientId: clientResponse.id,
        petId: petResponse.id,
        serviceId: bookingData.serviceId,
        scheduledDate: bookingData.requestedDate,
        scheduledTime: selectedSlot,
        logistics: bookingData.logistics,
        notes: bookingData.notes,
        status: 'scheduled',
        type: selectedService?.type || 'grooming'
      };
      
      return apiRequest('POST', `/api/appointments/${currentTenant?.id}`, appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "¡Cita programada exitosamente!",
        description: `Cita confirmada para ${customerData.name} el ${bookingData.requestedDate} a las ${selectedSlot}`,
      });
      
      // Clear reserved slots
      setReservedSlots([]);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      // Reset form or redirect
      setCurrentStep(5); // Success step
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para crear citas",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  // Handle next step
  const nextStep = async () => {
    if (currentStep === 2 && customerData.address && customerData.fraccionamiento) {
      await geocodeAddress(customerData.address, customerData.fraccionamiento, customerData.postalCode);
    }
    if (currentStep === 4 && bookingData.serviceId && bookingData.requestedDate) {
      checkAvailableSlots();
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
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
    "Información del Cliente",
    "Dirección y Ubicación", 
    "Información de la Mascota",
    "Selección de Servicio y Horario",
    "Confirmación"
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <BackButton className="mb-4" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Programar Nueva Cita</h1>
        <p className="text-gray-600">Completa los siguientes pasos para programar la cita</p>
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
          {/* Step 1: Customer Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) }))}
                    placeholder="María González"
                    required
                    className="capitalize"
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
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                    placeholder="maria@ejemplo.com"
                    className="lowercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address and Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address">Dirección completa *</Label>
                  <Input
                    id="address"
                    value={customerData.address}
                    onChange={(e) => {
                      const formattedValue = e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                      setCustomerData(prev => ({ ...prev, address: formattedValue }));
                      // Auto-geocode after both fields are filled
                      if (formattedValue && customerData.fraccionamiento) {
                        setTimeout(() => geocodeAddress(formattedValue, customerData.fraccionamiento, customerData.postalCode), 1000);
                      }
                    }}
                    placeholder="Calle Gracias 345"
                    required
                    className="capitalize"
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
                      // Auto-geocode after both fields are filled
                      if (customerData.address && formattedValue) {
                        setTimeout(() => geocodeAddress(customerData.address, formattedValue, customerData.postalCode), 1000);
                      }
                    }}
                    placeholder="Valle De Cumbres"
                    required
                    className="capitalize"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    value={customerData.postalCode}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="66260"
                  />
                </div>
              </div>
              
              {/* Advanced Interactive Map with Staff Tracking */}
              <div className="mt-4">
                <Label>Mapa de ubicación para entrega</Label>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  {/* Map is always displayed when tenant coordinates are available */}
                  {(tenantLocation.lat && tenantLocation.lng) ? (
                    <div>
                      {/* Professional Interactive Map with Custom Drag Support */}
                      <div className="h-80 relative border-b">
                        {/* Custom Overlay Layer for Interactive Markers */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                          {/* Interactive overlay for mouse events */}
                          <div 
                            className="absolute inset-0 z-10 pointer-events-auto cursor-grab active:cursor-grabbing"
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = (e.clientX - rect.left) / rect.width;
                              const y = (e.clientY - rect.top) / rect.height;
                              
                              // Convert screen coordinates to GPS coordinates
                              const lng = (mapCoordinates.lng - mapDiameterKm/111.32) + (x * (mapDiameterKm/111.32) * 2);
                              const lat = (mapCoordinates.lat + mapDiameterKm/110.54) - (y * (mapDiameterKm/110.54) * 2);
                              
                              // Update customer coordinates
                              setCustomerData(prev => ({
                                ...prev,
                                latitude: lat.toString(),
                                longitude: lng.toString()
                              }));
                              
                              toast({
                                title: "Ubicación del cliente establecida",
                                description: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                              });
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Zoom in/out based on wheel direction
                              if (e.deltaY < 0) {
                                // Zoom in (wheel up)
                                if (mapDiameterKm > 0.5) {
                                  setMapDiameterKm(prev => Math.max(0.5, prev - 0.5));
                                }
                              } else {
                                // Zoom out (wheel down)
                                if (mapDiameterKm < 25) {
                                  setMapDiameterKm(prev => Math.min(25, prev + 0.5));
                                }
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = (e.clientX - rect.left) / rect.width;
                              const y = (e.clientY - rect.top) / rect.height;
                              
                              // Convert screen coordinates to GPS coordinates for centering
                              const lng = (mapCoordinates.lng - mapDiameterKm/111.32) + (x * (mapDiameterKm/111.32) * 2);
                              const lat = (mapCoordinates.lat + mapDiameterKm/110.54) - (y * (mapDiameterKm/110.54) * 2);
                              
                              // Center map on double-click location and zoom in
                              setMapCoordinates({ lat, lng });
                              if (mapDiameterKm > 0.5) {
                                setMapDiameterKm(prev => Math.max(0.5, prev - 1));
                              }
                              
                              toast({
                                title: "Mapa centrado y ampliado",
                                description: `Centrado en: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                              });
                            }}
                            onMouseDown={(e) => {
                              if (e.button === 0) { // Left mouse button only
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(true);
                                setDragStart({
                                  x: e.clientX,
                                  y: e.clientY,
                                  lat: mapCoordinates.lat,
                                  lng: mapCoordinates.lng
                                });
                              }
                            }}
                            onMouseMove={(e) => {
                              if (isDragging) {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const rect = e.currentTarget.getBoundingClientRect();
                                const deltaX = e.clientX - dragStart.x;
                                const deltaY = e.clientY - dragStart.y;
                                
                                // Convert pixel movement to coordinate movement
                                const latPerPixel = (mapDiameterKm * 2 / 110.54) / rect.height;
                                const lngPerPixel = (mapDiameterKm * 2 / 111.32) / rect.width;
                                
                                const newLat = dragStart.lat + (deltaY * latPerPixel);
                                const newLng = dragStart.lng - (deltaX * lngPerPixel);
                                
                                setMapCoordinates({ lat: newLat, lng: newLng });
                              }
                            }}
                            onMouseUp={() => {
                              setIsDragging(false);
                            }}
                            onMouseLeave={() => {
                              setIsDragging(false);
                            }}
                          />
                          
                          {/* Clinic Location - Blue Marker (Bound to stored tenant GPS coordinates) */}
                          {currentTenant?.latitude && currentTenant?.longitude && (
                            <div 
                              className="absolute transform -translate-x-1/2 -translate-y-full group pointer-events-none"
                              style={{
                                left: `${((parseFloat(currentTenant.longitude) - (mapCoordinates.lng - mapDiameterKm/111.32)) / ((mapDiameterKm/111.32) * 2)) * 100}%`,
                                top: `${((mapCoordinates.lat + mapDiameterKm/110.54 - parseFloat(currentTenant.latitude)) / ((mapDiameterKm/110.54) * 2)) * 100}%`,
                                zIndex: 30
                              }}
                            >
                              <img 
                                src={blueMarkerIconPath} 
                                alt="Clínica" 
                                className="w-8 h-8 drop-shadow-lg"
                              />
                              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-100 px-3 py-2 rounded shadow text-xs whitespace-nowrap border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="font-semibold">Clínica Veterinaria</div>
                                <div className="text-blue-600">{currentTenant?.name}</div>
                                <div className="text-xs text-gray-500">GPS: {parseFloat(currentTenant.latitude).toFixed(6)}, {parseFloat(currentTenant.longitude).toFixed(6)}</div>
                                <div className="text-xs text-blue-600">Ubicación del Tenant</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Customer Location - Red Pin (placed by right-click) */}
                          {customerData.latitude && customerData.longitude && (
                            <div 
                              className="absolute transform -translate-x-1/2 -translate-y-full group z-40 pointer-events-none"
                              style={{
                                left: `${((parseFloat(customerData.longitude) - (mapCoordinates.lng - mapDiameterKm/111.32)) / ((mapDiameterKm/111.32) * 2)) * 100}%`,
                                top: `${((mapCoordinates.lat + mapDiameterKm/110.54 - parseFloat(customerData.latitude)) / ((mapDiameterKm/110.54) * 2)) * 100}%`
                              }}
                            >
                              <MapPin className="w-8 h-8 text-red-600 drop-shadow-lg animate-bounce" />
                              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-red-50 px-3 py-2 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-red-200">
                                <div className="font-semibold text-red-700">Ubicación del Cliente</div>
                                <div className="text-red-600">{customerData.address || 'Ubicación manual'}</div>
                                <div className="text-red-600">{customerData.fraccionamiento || 'Clic derecho en mapa'}</div>
                                <div className="text-xs text-gray-500">GPS: {parseFloat(customerData.latitude).toFixed(4)}, {parseFloat(customerData.longitude).toFixed(4)}</div>
                              </div>
                            </div>
                          )}


                        </div>

                        {/* Base OpenStreetMap with interactive controls */}
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoordinates.lng-(mapDiameterKm/111.32)},${mapCoordinates.lat-(mapDiameterKm/110.54)},${mapCoordinates.lng+(mapDiameterKm/111.32)},${mapCoordinates.lat+(mapDiameterKm/110.54)}&layer=mapnik`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          title="Mapa navegable para planificación de entrega"
                          className="rounded-t-lg"
                          loading="lazy"
                          key={`${mapCoordinates.lat}-${mapCoordinates.lng}-${mapDiameterKm}`}
                        />
                        
                        {/* Right-side Zoom Controls */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 z-30">
                          <button
                            onClick={() => {
                              if (mapDiameterKm > 0.5) {
                                setMapDiameterKm(prev => Math.max(0.5, prev - 1));
                              }
                            }}
                            className="w-8 h-8 bg-white/90 hover:bg-white border border-gray-300 rounded flex items-center justify-center text-gray-700 hover:text-gray-900 shadow-sm"
                            title="Acercar"
                            data-testid="button-zoom-in"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (mapDiameterKm < 25) {
                                setMapDiameterKm(prev => Math.min(25, prev + 1));
                              }
                            }}
                            className="w-8 h-8 bg-white/90 hover:bg-white border border-gray-300 rounded flex items-center justify-center text-gray-700 hover:text-gray-900 shadow-sm"
                            title="Alejar"
                            data-testid="button-zoom-out"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                        


                        {/* Map navigation instructions */}
                        <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
                          Arrastra para mover • Rueda para zoom • Doble clic para centrar • Clic derecho para ubicar cliente
                        </div>
                      </div>
                      
                      {/* Enhanced Map Info with Legend */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-green-700 mb-3">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">Ubicación confirmada</span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">
                          {customerData.address}, {customerData.fraccionamiento}
                        </p>

                        {/* Map Legend */}
                        <div className="flex justify-center gap-6 mb-3 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-600" />
                            <span>Cliente</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <img src={blueMarkerIconPath} alt="" className="w-3 h-3" />
                            <span>Clínica</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            <p>Centro: {mapCoordinates.lat.toFixed(6)}, {mapCoordinates.lng.toFixed(6)}</p>
                            <p>Radio: {mapDiameterKm}km | {customerData.address ? 'Cliente ubicado' : 'Vista clínica'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => geocodeAddress(customerData.address, customerData.fraccionamiento, customerData.postalCode)}
                              className="text-xs"
                              disabled={!customerData.address || !customerData.fraccionamiento}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              Geocodificar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Center map on customer location if available
                                if (customerData.latitude && customerData.longitude) {
                                  setMapCoordinates({
                                    lat: parseFloat(customerData.latitude),
                                    lng: parseFloat(customerData.longitude)
                                  });
                                  toast({
                                    title: "Vista centrada en cliente",
                                    description: "Mapa centrado en la dirección del cliente.",
                                  });
                                }
                              }}
                              className="text-xs"
                              disabled={!customerData.latitude || !customerData.longitude}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              Ver cliente
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Center map on clinic
                                setMapCoordinates(tenantLocation);
                                toast({
                                  title: "Vista centrada en clínica",
                                  description: "Mapa centrado en las coordenadas de la clínica.",
                                });
                              }}
                              className="text-xs"
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Ver clínica
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Ingresa la dirección para ver la ubicación</p>
                        {customerData.address && customerData.fraccionamiento && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => geocodeAddress(customerData.address, customerData.fraccionamiento, customerData.postalCode)}
                            className="mt-2"
                          >
                            Buscar ubicación
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Manual Coordinates Input */}
                {mapCoordinates.lat !== 25.6866 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="latitude" className="text-xs">Latitud (opcional)</Label>
                      <Input
                        id="latitude"
                        value={customerData.latitude}
                        onChange={(e) => {
                          setCustomerData(prev => ({ ...prev, latitude: e.target.value }));
                          const lat = parseFloat(e.target.value);
                          const lng = parseFloat(customerData.longitude);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setMapCoordinates({ lat, lng });
                          }
                        }}
                        placeholder="25.6866"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-xs">Longitud (opcional)</Label>
                      <Input
                        id="longitude"
                        value={customerData.longitude}
                        onChange={(e) => {
                          setCustomerData(prev => ({ ...prev, longitude: e.target.value }));
                          const lat = parseFloat(customerData.latitude);
                          const lng = parseFloat(e.target.value);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setMapCoordinates({ lat, lng });
                          }
                        }}
                        placeholder="-100.3161"
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Pet Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="petName">Nombre de la mascota *</Label>
                  <Input
                    id="petName"
                    value={petData.name}
                    onChange={(e) => setPetData(prev => ({ ...prev, name: e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) }))}
                    placeholder="Frodo"
                    required
                    className="capitalize"
                  />
                </div>
                <div>
                  <Label htmlFor="species">Especie *</Label>
                  <Select 
                    value={petData.species} 
                    onValueChange={(value) => setPetData(prev => ({ ...prev, species: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar especie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perro">Perro</SelectItem>
                      <SelectItem value="gato">Gato</SelectItem>
                      <SelectItem value="conejo">Conejo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="breed">Raza</Label>
                  <Select 
                    value={petData.breed} 
                    onValueChange={(value) => setPetData(prev => ({ ...prev, breed: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar raza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="golden-retriever">Golden Retriever</SelectItem>
                      <SelectItem value="labrador">Labrador</SelectItem>
                      <SelectItem value="pastor-aleman">Pastor Alemán</SelectItem>
                      <SelectItem value="chihuahua">Chihuahua</SelectItem>
                      <SelectItem value="bulldog-frances">Bulldog Francés</SelectItem>
                      <SelectItem value="poodle">Poodle</SelectItem>
                      <SelectItem value="yorkshire">Yorkshire Terrier</SelectItem>
                      <SelectItem value="husky-siberiano">Husky Siberiano</SelectItem>
                      <SelectItem value="rottweiler">Rottweiler</SelectItem>
                      <SelectItem value="dachshund">Dachshund (Salchicha)</SelectItem>
                      <SelectItem value="beagle">Beagle</SelectItem>
                      <SelectItem value="mestizo">Mestizo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="age">Edad (años)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={petData.age}
                    onChange={(e) => setPetData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    placeholder="3"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    value={petData.weight}
                    onChange={(e) => setPetData(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="25.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Service and Time Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service">Servicio *</Label>
                  <Select 
                    value={bookingData.serviceId} 
                    onValueChange={(value) => setBookingData(prev => ({ ...prev, serviceId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {(services || []).map((service: Service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - ${service.price} ({service.duration} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={bookingData.requestedDate}
                    onChange={(e) => setBookingData(prev => ({ ...prev, requestedDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <Label>Horarios disponibles</Label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedSlot === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => reserveSlotMutation.mutate(slot)}
                        disabled={reserveSlotMutation.isPending}
                        className={`${selectedSlot === slot ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        {slot}
                        {selectedSlot === slot && <CheckCircle className="w-3 h-3 ml-1" />}
                      </Button>
                    ))}
                  </div>
                  
                  {selectedSlot && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          Horario reservado: {selectedSlot}
                        </span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Esta reserva expira en 10 minutos. Completa la cita para confirmar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="logistics">Tipo de servicio *</Label>
                <Select 
                  value={bookingData.logistics} 
                  onValueChange={(value) => setBookingData(prev => ({ ...prev, logistics: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">🚐 Recogemos en su domicilio</SelectItem>
                    <SelectItem value="delivered">🏠 Cliente trae la mascota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  value={bookingData.notes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) }))}
                  placeholder="Información adicional sobre la mascota o el servicio..."
                  className="capitalize"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {createAppointmentMutation.isSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-800 mb-2">¡Cita Confirmada!</h3>
                  <p className="text-gray-600 mb-4">
                    La cita para {petData.name} ha sido programada exitosamente.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                    <h4 className="font-semibold mb-2">Detalles de la cita:</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Cliente:</strong> {customerData.name}</p>
                      <p><strong>Mascota:</strong> {petData.name}</p>
                      <p><strong>Fecha:</strong> {bookingData.requestedDate}</p>
                      <p><strong>Hora:</strong> {selectedSlot}</p>
                      <p><strong>Servicio:</strong> {services?.find(s => s.id === bookingData.serviceId)?.name}</p>
                      <p><strong>Dirección:</strong> {customerData.address}, {customerData.fraccionamiento}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Confirmar detalles de la cita</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Cliente
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>{customerData.name}</p>
                        <p>{customerData.phone}</p>
                        <p>{customerData.address}, {customerData.fraccionamiento}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Mascota</h4>
                      <div className="text-sm space-y-1">
                        <p>{petData.name} ({petData.species})</p>
                        {petData.breed && <p>Raza: {petData.breed}</p>}
                        {petData.age > 0 && <p>Edad: {petData.age} años</p>}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Fecha y Hora
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>{bookingData.requestedDate}</p>
                        <p>{selectedSlot}</p>
                        <Badge variant="outline">
                          {bookingData.logistics === 'pickup' ? 'Recogemos' : 'Cliente trae'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Servicio</h4>
                      <div className="text-sm space-y-1">
                        <p>{(services || []).find((s: Service) => s.id === bookingData.serviceId)?.name}</p>
                        <p>${(services || []).find((s: Service) => s.id === bookingData.serviceId)?.price}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
              disabled={currentStep === 1 || createAppointmentMutation.isSuccess}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && (!customerData.name || !customerData.phone)) ||
                  (currentStep === 2 && (!customerData.address || !customerData.fraccionamiento)) ||
                  (currentStep === 3 && (!petData.name || !petData.species)) ||
                  (currentStep === 4 && (!selectedSlot || !bookingData.serviceId))
                }
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              !createAppointmentMutation.isSuccess && (
                <Button
                  onClick={() => createAppointmentMutation.mutate()}
                  disabled={createAppointmentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createAppointmentMutation.isPending ? 'Confirmando...' : 'Confirmar Cita'}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}