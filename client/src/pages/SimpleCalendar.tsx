import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "wouter";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function SimpleCalendar() {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant } = useTenant();
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !currentTenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No hay acceso al calendario
          </h2>
          <p className="text-muted-foreground">
            Inicia sesión para acceder al calendario completo.
          </p>
        </div>
      </div>
    );
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendario Completo</h1>
          <p className="text-muted-foreground">Vista avanzada del calendario con todas las citas</p>
        </div>
        
        <Link href="/appointments/new">
          <Button className="gap-2" data-testid="button-new-appointment">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </Link>
      </div>

      {/* Calendar Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold">
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Vista de Calendario Avanzada
            </h3>
            <p className="text-muted-foreground mb-4">
              Esta página mostrará una vista completa del calendario con todas las citas programadas.
            </p>
            <p className="text-sm text-muted-foreground">
              Por ahora, puedes usar el <Link href="/dashboard" className="text-primary hover:underline">calendario del dashboard</Link> para ver las citas del día.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}