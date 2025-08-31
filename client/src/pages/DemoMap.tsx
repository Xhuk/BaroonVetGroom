import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

export default function DemoMap() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log("✅ Demo map component loaded successfully");
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando mapa demo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-500" />
              Mapa Demo - Sistema Veterinario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Demostración del sistema de gestión veterinaria con ubicaciones en Culiacán, Sinaloa.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { name: "Clínica Veterinaria Principal", address: "Centro de Culiacán", coords: "24.8066, -107.3938" },
            { name: "Sucursal Las Flores", address: "Fraccionamiento Las Flores", coords: "24.8166, -107.4038" },
            { name: "Sucursal El Bosque", address: "Colonia El Bosque", coords: "24.7966, -107.3838" },
            { name: "Sucursal Villa Real", address: "Villa Real", coords: "24.8266, -107.3738" },
          ].map((location, index) => (
            <Card key={index} className="hover:bg-gray-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-sm">{location.name}</h3>
                    <p className="text-gray-600 text-xs mt-1">{location.address}</p>
                    <p className="text-gray-500 text-xs mt-1">{location.coords}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div 
              className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23e5e7eb" fill-opacity="0.4"%3E%3Cpath d="M20 20c0-11.046-8.954-20-20-20v20h20zM0 20v20h20c0-11.046-8.954-20-20-20z"/%3E%3C/g%3E%3C/svg%3E")'
              }}
            >
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Demo Mapa Interactivo</h3>
                <p className="text-gray-500 text-sm max-w-md">
                  Aquí se mostraría un mapa interactivo con las ubicaciones de las clínicas veterinarias.
                  Funcionalidades incluyen: rutas de entrega, tracking en tiempo real, y gestión de zonas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
