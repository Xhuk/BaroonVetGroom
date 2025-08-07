import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CreditCard, 
  CheckCircle, 
  ArrowRight,
  Plus,
  Trash2,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingData {
  // Company Information
  legalName: string;
  businessType: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  // Main Address
  mainAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: string;
  longitude?: string;
  // Contact Person
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  contactPersonRole: string;
  // Sites Setup
  sitesRequested: number;
  sites: OnboardingSite[];
}

interface OnboardingSite {
  siteName: string;
  siteType: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: string;
  longitude?: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  timeSlotDuration: number;
  isMainSite: boolean;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const businessTypes = [
  { value: "clinic", label: "Clínica Veterinaria" },
  { value: "hospital", label: "Hospital Veterinario" },
  { value: "grooming_salon", label: "Estética Canina" },
  { value: "mixed", label: "Clínica y Estética" }
];

const siteTypes = [
  { value: "main", label: "Sede Principal" },
  { value: "branch", label: "Sucursal" },
  { value: "mobile", label: "Servicio Móvil" }
];

const mexicanStates = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const { toast } = useToast();

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    legalName: "",
    businessType: "clinic",
    taxId: "",
    phone: "",
    email: "",
    website: "",
    mainAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "MX",
    contactPersonName: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    contactPersonRole: "owner",
    sitesRequested: 3, // Default for Medium plan
    sites: [
      {
        siteName: "",
        siteType: "main",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        phone: "",
        email: "",
        openTime: "08:00",
        closeTime: "18:00",
        timeSlotDuration: 30,
        isMainSite: true
      }
    ]
  });

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Información de la Empresa",
      description: "Datos legales y de contacto",
      completed: currentStep > 1
    },
    {
      id: 2,
      title: "Configuración de Clínicas",
      description: "Direcciones y horarios de atención",
      completed: currentStep > 2
    },
    {
      id: 3,
      title: "Activación de Cuenta",
      description: "Revisión final y activación",
      completed: currentStep > 3
    }
  ];

  // Get GPS coordinates from address
  const getLocationFromAddress = async (address: string, isMainAddress = false) => {
    setIsGeolocating(true);
    try {
      // Using a geocoding service (this would need to be implemented with actual API)
      const fullAddress = `${address}, México`;
      
      // Placeholder for actual geocoding implementation
      // You could use Google Maps Geocoding API, MapBox, or similar
      console.log("Geocoding address:", fullAddress);
      
      // For now, we'll simulate the geocoding
      setTimeout(() => {
        toast({
          title: "Ubicación obtenida",
          description: "Se han agregado las coordenadas GPS automáticamente",
        });
        setIsGeolocating(false);
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error al obtener ubicación",
        description: "No se pudieron obtener las coordenadas. Puedes continuar sin ellas.",
        variant: "destructive",
      });
      setIsGeolocating(false);
    }
  };

  const addSite = () => {
    if (onboardingData.sites.length < onboardingData.sitesRequested) {
      setOnboardingData(prev => ({
        ...prev,
        sites: [
          ...prev.sites,
          {
            siteName: "",
            siteType: "branch",
            address: "",
            city: "",
            state: "",
            postalCode: "",
            phone: "",
            email: "",
            openTime: "08:00",
            closeTime: "18:00",
            timeSlotDuration: 30,
            isMainSite: false
          }
        ]
      }));
    }
  };

  const removeSite = (index: number) => {
    if (onboardingData.sites.length > 1 && !onboardingData.sites[index].isMainSite) {
      setOnboardingData(prev => ({
        ...prev,
        sites: prev.sites.filter((_, i) => i !== index)
      }));
    }
  };

  const updateSite = (index: number, field: keyof OnboardingSite, value: string | number | boolean) => {
    setOnboardingData(prev => ({
      ...prev,
      sites: prev.sites.map((site, i) => 
        i === index ? { ...site, [field]: value } : site
      )
    }));
  };

  const submitOnboardingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/company-onboarding", onboardingData);
    },
    onSuccess: () => {
      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido creada. Recibirás un email con la guía de inicio.",
      });
      setCurrentStep(4);
    },
    onError: (error) => {
      toast({
        title: "Error en el registro",
        description: "No se pudo completar el registro. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          onboardingData.legalName &&
          onboardingData.email &&
          onboardingData.contactPersonName &&
          onboardingData.contactPersonEmail
        );
      case 2:
        return onboardingData.sites.every(site => 
          site.siteName && site.address && site.city && site.state
        );
      default:
        return true;
    }
  };

  const renderCompanyInfoStep = () => (
    <Card className="bg-gray-850 border-gray-700">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Información de la Empresa
        </CardTitle>
        <CardDescription className="text-gray-400">
          Proporciona los datos legales y de contacto de tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="legalName" className="text-gray-300">
              Razón Social *
            </Label>
            <Input
              id="legalName"
              value={onboardingData.legalName}
              onChange={(e) => setOnboardingData(prev => ({...prev, legalName: e.target.value}))}
              placeholder="Clínica Veterinaria San Pedro S.A. de C.V."
              className="bg-gray-800 border-gray-600 text-white"
              data-testid="input-legal-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessType" className="text-gray-300">
              Tipo de Negocio
            </Label>
            <Select 
              value={onboardingData.businessType} 
              onValueChange={(value) => setOnboardingData(prev => ({...prev, businessType: value}))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-business-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {businessTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxId" className="text-gray-300">
              RFC
            </Label>
            <Input
              id="taxId"
              value={onboardingData.taxId}
              onChange={(e) => setOnboardingData(prev => ({...prev, taxId: e.target.value}))}
              placeholder="ABC123456789"
              className="bg-gray-800 border-gray-600 text-white"
              data-testid="input-tax-id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="text-gray-300">
              Sitio Web
            </Label>
            <Input
              id="website"
              value={onboardingData.website}
              onChange={(e) => setOnboardingData(prev => ({...prev, website: e.target.value}))}
              placeholder="https://miveterinaria.com"
              className="bg-gray-800 border-gray-600 text-white"
              data-testid="input-website"
            />
          </div>
        </div>

        <Separator className="bg-gray-600" />

        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Persona de Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName" className="text-gray-300">
                Nombre Completo *
              </Label>
              <Input
                id="contactName"
                value={onboardingData.contactPersonName}
                onChange={(e) => setOnboardingData(prev => ({...prev, contactPersonName: e.target.value}))}
                placeholder="Dr. Juan Pérez"
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactRole" className="text-gray-300">
                Cargo
              </Label>
              <Select 
                value={onboardingData.contactPersonRole} 
                onValueChange={(value) => setOnboardingData(prev => ({...prev, contactPersonRole: value}))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-contact-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-gray-300">
                Email *
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={onboardingData.contactPersonEmail}
                onChange={(e) => setOnboardingData(prev => ({...prev, contactPersonEmail: e.target.value}))}
                placeholder="doctor@miveterinaria.com"
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-gray-300">
                Teléfono
              </Label>
              <Input
                id="contactPhone"
                value={onboardingData.contactPersonPhone}
                onChange={(e) => setOnboardingData(prev => ({...prev, contactPersonPhone: e.target.value}))}
                placeholder="+52 55 1234 5678"
                className="bg-gray-800 border-gray-600 text-white"
                data-testid="input-contact-phone"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSitesSetupStep = () => (
    <div className="space-y-6">
      <Card className="bg-gray-850 border-gray-700">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Configuración de Clínicas
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configura las direcciones y horarios de tus {onboardingData.sitesRequested} clínicas
          </CardDescription>
        </CardHeader>
      </Card>

      {onboardingData.sites.map((site, index) => (
        <Card key={index} className="bg-gray-850 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {site.isMainSite ? "Sede Principal" : `Clínica ${index + 1}`}
                {site.isMainSite && <Badge className="bg-blue-600">Principal</Badge>}
              </CardTitle>
              {!site.isMainSite && onboardingData.sites.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSite(index)}
                  className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  data-testid={`button-remove-site-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre de la Clínica *</Label>
                <Input
                  value={site.siteName}
                  onChange={(e) => updateSite(index, 'siteName', e.target.value)}
                  placeholder="Veterinaria San Pedro Centro"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-name-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Tipo de Sede</Label>
                <Select 
                  value={site.siteType} 
                  onValueChange={(value) => updateSite(index, 'siteType', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid={`select-site-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {siteTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Dirección *</Label>
              <div className="flex gap-2">
                <Input
                  value={site.address}
                  onChange={(e) => updateSite(index, 'address', e.target.value)}
                  placeholder="Av. Insurgentes Sur 123, Col. Roma Norte"
                  className="bg-gray-800 border-gray-600 text-white flex-1"
                  data-testid={`input-site-address-${index}`}
                />
                <Button
                  variant="outline"
                  onClick={() => getLocationFromAddress(site.address)}
                  disabled={!site.address || isGeolocating}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid={`button-geolocate-${index}`}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Ciudad *</Label>
                <Input
                  value={site.city}
                  onChange={(e) => updateSite(index, 'city', e.target.value)}
                  placeholder="Ciudad de México"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-city-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Estado *</Label>
                <Select 
                  value={site.state} 
                  onValueChange={(value) => updateSite(index, 'state', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid={`select-site-state-${index}`}>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {mexicanStates.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Código Postal</Label>
                <Input
                  value={site.postalCode}
                  onChange={(e) => updateSite(index, 'postalCode', e.target.value)}
                  placeholder="06700"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-postal-${index}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Teléfono</Label>
                <Input
                  value={site.phone}
                  onChange={(e) => updateSite(index, 'phone', e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-phone-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={site.email}
                  onChange={(e) => updateSite(index, 'email', e.target.value)}
                  placeholder="centro@miveterinaria.com"
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-email-${index}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Horario de Apertura</Label>
                <Input
                  type="time"
                  value={site.openTime}
                  onChange={(e) => updateSite(index, 'openTime', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-open-time-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Horario de Cierre</Label>
                <Input
                  type="time"
                  value={site.closeTime}
                  onChange={(e) => updateSite(index, 'closeTime', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid={`input-site-close-time-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Duración de Citas (min)</Label>
                <Select 
                  value={site.timeSlotDuration.toString()} 
                  onValueChange={(value) => updateSite(index, 'timeSlotDuration', parseInt(value))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid={`select-site-duration-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="20">20 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {onboardingData.sites.length < onboardingData.sitesRequested && (
        <Card className="bg-gray-850 border-gray-700 border-dashed">
          <CardContent className="p-6">
            <Button
              onClick={addSite}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              data-testid="button-add-site"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Clínica ({onboardingData.sites.length}/{onboardingData.sitesRequested})
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderActivationStep = () => (
    <Card className="bg-gray-850 border-gray-700">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Activación de Cuenta
        </CardTitle>
        <CardDescription className="text-gray-400">
          Revisión final antes de activar tu cuenta VetGroom
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Resumen de Configuración</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Empresa:</span>
              <span className="text-white">{onboardingData.legalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Clínicas configuradas:</span>
              <span className="text-white">{onboardingData.sites.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Contacto:</span>
              <span className="text-white">{onboardingData.contactPersonEmail}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-950/30 border border-blue-600/30 rounded-lg p-4">
          <h4 className="text-blue-300 font-semibold mb-2">Próximos Pasos</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Se activará tu cuenta con acceso completo</li>
            <li>• Recibirás credenciales de acceso por email</li>
            <li>• Te enviaremos una guía completa de configuración inicial</li>
            <li>• Nuestro equipo te contactará para el acompañamiento</li>
          </ul>
        </div>

        <Button
          onClick={() => submitOnboardingMutation.mutate()}
          disabled={submitOnboardingMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          data-testid="button-activate-account"
        >
          {submitOnboardingMutation.isPending ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Activando cuenta...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Activar Cuenta VetGroom
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="bg-gray-850 border-gray-700">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Cuenta Activada Exitosamente!
        </h2>
        <p className="text-gray-400 mb-6">
          Tu cuenta VetGroom ha sido creada y configurada. En breve recibirás un email con las credenciales de acceso y la guía de inicio.
        </p>
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">¿Qué sigue?</h3>
          <ul className="text-sm text-gray-300 space-y-1 text-left">
            <li>• Revisa tu email para las credenciales de acceso</li>
            <li>• Accede a tu dashboard de administración</li>
            <li>• Configura tu primer usuario y servicios</li>
            <li>• Programa una llamada de acompañamiento</li>
          </ul>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.location.href = "/"}
          data-testid="button-go-to-dashboard"
        >
          Ir al Dashboard
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-300 mb-2">
            Configuración de Cuenta VetGroom
          </h1>
          <p className="text-gray-400">
            Configura tu empresa y clínicas para comenzar a usar VetGroom
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.completed || currentStep === step.id
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-gray-600 text-gray-400"
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="ml-3 hidden md:block">
                <div className={`text-sm font-medium ${
                  step.completed || currentStep === step.id ? "text-blue-300" : "text-gray-400"
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-600 mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && renderCompanyInfoStep()}
          {currentStep === 2 && renderSitesSetupStep()}
          {currentStep === 3 && renderActivationStep()}
          {currentStep === 4 && renderSuccessStep()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              data-testid="button-previous-step"
            >
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
              disabled={!isStepValid(currentStep)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-next-step"
            >
              {currentStep === 3 ? "Finalizar" : "Siguiente"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}