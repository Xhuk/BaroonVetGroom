import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { ArrowRight, Star, Users, Calendar, FileText, BarChart3, LogIn, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function LandingPage() {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu email y contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // For now, redirect to Replit auth - this can be replaced with custom auth later
      toast({
        title: "Iniciando sesión...",
        description: "Redirigiendo al sistema de autenticación",
      });
      
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error de autenticación",
        description: "No se pudo iniciar sesión. Intenta nuevamente.",
        variant: "destructive",
      });
      setIsLoggingIn(false);
    }
  };


  const openLoginDialog = () => {
    setIsLoginDialogOpen(true);
    setLoginForm({ email: '', password: '' });
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">VetGroom</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/marketing/brochure.html">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Folleto
              </Button>
            </Link>
            <Button 
              onClick={openLoginDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-login-header"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Gestión Veterinaria
            <span className="text-blue-600 block">de Nueva Generación</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Optimiza tu clínica veterinaria con tecnología de vanguardia. 
            Gestiona citas, expedientes médicos, facturación y comunicación con clientes 
            desde una sola plataforma intuitiva y potente.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={openLoginDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              data-testid="button-login-hero"
            >
              Comenzar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/marketing/brochure.html">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                Ver Folleto
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Todo lo que necesitas para tu clínica
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Herramientas profesionales diseñadas específicamente para veterinarios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Gestión de Citas Inteligente
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Sistema avanzado de programación con recordatorios automáticos y optimización de horarios.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Expedientes Médicos Digitales
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Historial médico completo de mascotas con imágenes, tratamientos y seguimiento.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Sistema de Facturación Integrado
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Facturación automática, control de inventario y reportes financieros detallados.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Comunicación con Clientes
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              WhatsApp integrado, recordatorios automáticos y portal de clientes.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Optimización de Rutas
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Sistema VRP para optimizar rutas de entrega y recolección de mascotas.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Analytics y Reportes
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Reportes detallados de rendimiento, ingresos y estadísticas de la clínica.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para transformar tu clínica?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a cientos de veterinarias que ya confían en VetGroom
          </p>
          <Button 
            size="lg" 
            onClick={openLoginDialog}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            data-testid="button-login-cta"
          >
            Comenzar Prueba Gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold">VetGroom</span>
            </div>
            
            <div className="flex space-x-6">
              <Link href="/marketing/brochure.html">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Folleto
                </Button>
              </Link>
              <Link href="/marketing/editor">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Editor
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 VetGroom. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <LogIn className="w-6 h-6 text-blue-600" />
              Iniciar Sesión
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Ingresa tus credenciales para acceder a VetGroom
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full"
                data-testid="input-email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full pr-10"
                  data-testid="input-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLoginDialogOpen(false)}
                className="flex-1"
                data-testid="button-cancel-login"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-login"
              >
                {isLoggingIn ? "Iniciando..." : "Iniciar Sesión"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}