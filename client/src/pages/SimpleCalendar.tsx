import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Users, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { Appointment } from "@shared/schema";

export default function SimpleCalendar() {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant } = useTenant();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Fetch appointments for the current month
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments', currentTenant?.id, format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const response = await fetch(`/api/appointments-fast/${currentTenant.id}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      return data.appointments || [];
    },
    enabled: !!currentTenant?.id,
  });

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

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt: Appointment) => 
      apt.scheduledDate && isSameDay(new Date(apt.scheduledDate), date)
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header with Action Buttons */}
      <div className="sticky top-0 bg-background border-b z-10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </p>
          </div>
          
          {/* Fixed Action Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/booking-wizard">
              <Button className="gap-2" data-testid="button-new-appointment">
                <Plus className="h-4 w-4" />
                Nueva Cita
              </Button>
            </Link>
            
            <Link href="/clients">
              <Button variant="outline" className="gap-2" data-testid="button-manage-clients">
                <Users className="h-4 w-4" />
                Gestionar Clientes
              </Button>
            </Link>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
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

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <Card>
          <CardContent className="p-0">
            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0">
                {/* Header Days */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {calendarDays.map((day, index) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isCurrentMonth = isSameMonth(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border-b border-r border-gray-200 dark:border-gray-700 ${
                        !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                      } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${
                          !isCurrentMonth ? 'text-muted-foreground' : 
                          isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-foreground'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {dayAppointments.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {dayAppointments.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map((apt: Appointment) => (
                          <div
                            key={apt.id}
                            className={`text-xs p-1 rounded text-white truncate ${getStatusColor(apt.status || 'scheduled')}`}
                            title={`${apt.scheduledTime || 'TBD'} - ${apt.type}`}
                          >
                            {apt.scheduledTime || 'TBD'} {apt.type}
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayAppointments.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}