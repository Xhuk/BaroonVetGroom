import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Calendar } from "@/components/Calendar";
import { BottomStatsRibbon } from "@/components/BottomStatsRibbon";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, History, Truck, Phone, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { PageLoader } from "@/components/LoadingSpinner";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Debes iniciar sesión para acceder al tablero",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || tenantLoading) {
    return <PageLoader text="Cargando tablero..." />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No hay tenant asignado
          </h2>
          <p className="text-gray-600">
            Contacta al administrador para obtener acceso a un tenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <Navigation />
      
      {/* Main Content */}
      <main className="lg:ml-64 pb-40">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4 px-6">
          <Link href="/booking">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-md">
              <Phone className="w-4 h-4 mr-2" />
              Nueva Cita por Teléfono
            </Button>
          </Link>
          <Link href="/appointments">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 shadow-md">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Gestionar Citas
            </Button>
          </Link>
          <Link href="/delivery">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 shadow-md">
              <Truck className="w-4 h-4 mr-2" />
              Plan de Entregas
            </Button>
          </Link>
        </div>

        {/* Calendar */}
        <Calendar className="shadow-lg" />
      </main>

      {/* Bottom Statistics Ribbon */}
      <BottomStatsRibbon />
    </div>
  );
}
