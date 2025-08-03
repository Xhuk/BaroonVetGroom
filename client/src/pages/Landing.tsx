import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VetGroomLogo } from "@/components/VetGroomLogo";
import { 
  Stethoscope, 
  Scissors, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Users 
} from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <VetGroomLogo className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">VetGroom</h1>
              <span className="text-sm text-gray-500">Gestión Veterinaria</span>
            </div>
          </div>
          <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
            Iniciar Sesión
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Gestión Veterinaria
            <span className="text-blue-600"> Profesional</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma SaaS completa para clínicas veterinarias con gestión de citas, 
            salas, personal y entregas. Optimiza tu operación con herramientas profesionales.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
          >
            Comenzar Ahora
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Gestión de Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Sistema de calendario inteligente con gestión de capacidad de salas 
                para consultas médicas, estética y vacunación.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Servicios Especializados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manejo integral de servicios veterinarios y de estética con 
                asignación automática de salas y personal especializado.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Plan de Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Optimización de rutas de entrega por fraccionamiento con 
                gestión de capacidad de peso y programación inteligente.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Multi-Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Arquitectura de dos niveles: gestión de empresa y múltiples 
                ubicaciones de clínica con equipos independientes.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Seguridad Avanzada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Autenticación segura, control de acceso por roles y 
                gestión de permisos a nivel de empresa y tenant.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-6 h-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl">Monitoreo en Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Dashboard con estadísticas en vivo, utilización de salas 
                y métricas de rendimiento operacional.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para optimizar tu clínica veterinaria?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de clínicas que ya confían en VetGroom para su gestión diaria.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-3"
          >
            Comenzar Gratis
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <VetGroomLogo className="w-10 h-10" />
            <span className="text-xl font-bold">VetGroom</span>
          </div>
          <p className="text-gray-400">
            © 2025 VetGroom. Plataforma profesional para clínicas veterinarias.
          </p>
        </div>
      </footer>
    </div>
  );
}
