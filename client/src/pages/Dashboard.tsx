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
import { Plus, History, Truck } from "lucide-react";

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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
      <main className="lg:ml-64 p-6 pb-40">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Crear Nueva Cita
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-md">
            <History className="w-4 h-4 mr-2" />
            Revisar Citas Anteriores
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 shadow-md">
            <Truck className="w-4 h-4 mr-2" />
            Plan de Entregas
          </Button>
        </div>

        {/* Calendar */}
        <Calendar className="shadow-lg" />
      </main>

      {/* Bottom Statistics Ribbon */}
      <BottomStatsRibbon />
    </div>
  );
}
