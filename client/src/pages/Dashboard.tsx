import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useFastLoad, useFastFetch } from "@/hooks/useFastLoad";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { useScreenSize } from "@/hooks/useScreenSize";
import { FastCalendar } from "@/components/FastCalendar";
import { FastStatsRibbon } from "@/components/FastStatsRibbon";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Truck, Phone, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import type { Appointment } from "@shared/schema";
import { getTodayInUserTimezone } from "@shared/timeUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading, isDebugMode } = useTenant();
  const { isInstant, startBackgroundLoad, completeLoad } = useFastLoad();
  const { shouldHideBottomRibbon } = useScreenSize();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use timezone-aware today calculation to prevent tomorrow's date
    const today = getTodayInUserTimezone();
    console.log(`Dashboard initialized with today: ${today}`);
    return today;
  });
  
  // Fast fetch data after UI is shown - now date-specific
  const { data: appointmentData } = useFastFetch<{appointments: Appointment[]}>(
    `/api/appointments-fast/${currentTenant?.id}?date=${selectedDate}`,
    !!currentTenant?.id && !isInstant
  );
  
  const { data: stats } = useFastFetch<any>(
    `/api/dashboard/stats/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  // Progressive enhancement: show calendar and stats after UI loads
  useEffect(() => {
    if (!isInstant && currentTenant) {
      const timer1 = setTimeout(() => setShowCalendar(true), 100);
      const timer2 = setTimeout(() => setShowStats(true), 300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isInstant, currentTenant]);

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

  // Render layout immediately instead of waiting for loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Show layout with loading state while tenant loads, or no tenant message if loading is done
  if (!currentTenant) {
    if (tenantLoading) {
      // Show layout with loading state
      return (
        <div className="min-h-screen bg-background font-sans">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando tenant...</p>
            </div>
          </div>
        </div>
      );
    } else {
      // No tenant assigned and not loading
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No hay tenant asignado
            </h2>
            <p className="text-muted-foreground">
              Contacta al administrador para obtener acceso a un tenant.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <ResponsiveLayout>
      {/* Action Buttons - Fixed positioning above calendar */}
      <div className="px-6 py-4 bg-background border-b border-border">
        <div className="flex gap-4 max-w-7xl mx-auto">
          <Link href="/booking">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-md dark:bg-green-700 dark:hover:bg-green-800">
              <Phone className="w-4 h-4 mr-2" />
              Nueva Cita por Teléfono
            </Button>
          </Link>
          <Link href="/appointments">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 shadow-md dark:bg-blue-700 dark:hover:bg-blue-800">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Gestionar Citas
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-40">

        {/* Fast Calendar - positioned to end at same level as navigation */}
        {showCalendar ? (
          <FastCalendar 
            appointments={appointmentData?.appointments || []} 
            className="shadow-lg"
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            tenantId={currentTenant?.id}

          />
        ) : (
          <div className="bg-card rounded-lg shadow-lg animate-pulse flex items-center justify-center h-96 tablet-card">
            <div className="text-muted-foreground">Cargando calendario...</div>
          </div>
        )}
      </div>

      {/* Fast Stats Ribbon - Hide in tablet portrait mode */}
      {!shouldHideBottomRibbon && showStats ? (
        <FastStatsRibbon stats={stats} />
      ) : !shouldHideBottomRibbon ? (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 backdrop-blur-md border-t border-slate-600/50 z-20 shadow-2xl">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-slate-600/50 animate-pulse rounded-lg w-32"></div>
              <div className="flex items-center space-x-12">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="h-5 bg-slate-600/50 animate-pulse rounded-lg w-20"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ResponsiveLayout>
  );
}
