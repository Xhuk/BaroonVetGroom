import { useState } from "react";
import { 
  Scissors, 
  Stethoscope, 
  Syringe, 
  Truck, 
  Calendar, 
  Users, 
  DoorOpen,
  Receipt,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
interface DashboardStats {
  appointmentsToday: number;
  groomingToday: number;
  medicalToday: number;
  pendingPayments: number;
  totalClients: number;
  totalPets: number;
  entriesDelivered: number;
  deliveriesToday?: number;
  serviciosServidos: number;
}

interface FastStatsRibbonProps {
  stats?: DashboardStats | null;
}

export function FastStatsRibbon({ stats }: FastStatsRibbonProps) {
  const accessControl = useAccessControl();
  const [, navigate] = useLocation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      navigate(`/?date=${dateString}`);
      setShowCalendar(false);
    }
  };

  const handleCalendarClick = () => {
    setShowCalendar(true);
  };
  
  if (!stats) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-slate-700/50 z-20 shadow-2xl">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300/70 dark:bg-slate-600/70 animate-pulse rounded-md w-28"></div>
                <div className="h-3 bg-gray-200/50 dark:bg-slate-700/50 animate-pulse rounded-md w-20"></div>
              </div>
            </div>
            <div className="flex items-center space-x-8 lg:space-x-12">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-600 dark:to-slate-700 rounded-lg animate-pulse"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-300/70 dark:bg-slate-600/70 animate-pulse rounded-md w-8"></div>
                    <div className="h-2 bg-gray-200/50 dark:bg-slate-700/50 animate-pulse rounded-md w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  
  const dayName = dayNames[currentDate.getDay()];
  const day = currentDate.getDate();
  const month = monthNames[currentDate.getMonth()];

  const allStatsConfig = [
    { 
      value: stats.appointmentsToday, 
      label: "Citas Hoy", 
      icon: Calendar, 
      color: "from-blue-500 to-blue-600", 
      textColor: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
      permission: "canManageAppointments"
    },
    { 
      value: stats.groomingToday, 
      label: "Estética", 
      icon: Scissors, 
      color: "from-purple-500 to-purple-600", 
      textColor: "text-purple-700 dark:text-purple-300",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50",
      permission: "canManageAppointments"
    },
    { 
      value: stats.medicalToday, 
      label: "Médicas", 
      icon: Stethoscope, 
      color: "from-emerald-500 to-emerald-600", 
      textColor: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50",
      permission: "canManageAppointments"
    },
    { 
      value: stats.pendingPayments, 
      label: "Pagos Pend.", 
      icon: DoorOpen, 
      color: "from-orange-500 to-orange-600", 
      textColor: "text-orange-700 dark:text-orange-300",
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50",
      permission: "canViewReports"
    },
    { 
      value: stats.totalClients, 
      label: "Clientes", 
      icon: Users, 
      color: "from-indigo-500 to-indigo-600", 
      textColor: "text-indigo-700 dark:text-indigo-300",
      bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50",
      permission: "canManageClients"
    },
    { 
      value: stats.serviciosServidos || 0, 
      label: "Servicios Servidos", 
      icon: Receipt, 
      color: "from-teal-500 to-teal-600", 
      textColor: "text-teal-700 dark:text-teal-300",
      bgColor: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50",
      permission: "canViewReports"
    },
    { 
      value: stats.deliveriesToday || 0, 
      label: "Entregas", 
      icon: Truck, 
      color: "from-amber-500 to-amber-600", 
      textColor: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50",
      permission: "canAccessDeliveryTracking"
    }
  ];

  // Filter stats based on user permissions
  const statsConfig = allStatsConfig.filter(stat => {
    // Always show appointments today
    if (stat.label === "Citas Hoy") return true;
    
    // Check specific permissions for other stats
    const hasPermission = accessControl[stat.permission as keyof typeof accessControl] as boolean;
    return hasPermission;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-slate-700/50 z-20 shadow-2xl">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Enhanced Date Section - Clickable */}
          <div className="flex items-center space-x-4 group cursor-pointer" onClick={handleCalendarClick} data-testid="button-date-selector">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-xl text-gray-800 dark:text-gray-100 leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{dayName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">{day} {month}</div>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="flex items-center space-x-6 lg:space-x-8">
            {statsConfig.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="group cursor-pointer">
                  <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-md">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-110`}>
                      <IconComponent className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                    <div className="space-y-0.5">
                      <div className={`font-bold text-xl leading-none ${stat.textColor} transition-colors duration-300`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-md w-full mx-4 p-0 gap-0 bg-white dark:bg-slate-900 border-0 shadow-2xl" aria-label="Seleccionar Fecha">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Seleccionar Fecha</h2>
              <p className="text-blue-100 text-sm">Navega por el calendario de citas</p>
            </div>
          </div>

          {/* Calendar Body */}
          <div className="p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCurrentMonth(newMonth);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCurrentMonth(newMonth);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
                <div key={day} className="h-8 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="ghost"
                onClick={() => setShowCalendar(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleDateSelect(new Date())}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                data-testid="button-today"
              >
                Hoy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Enhanced Calendar Grid Component
interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

function CalendarGrid({ currentMonth, selectedDate, onDateSelect }: CalendarGridProps) {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Get first day of month and calculate offset
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month days (grayed out)
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonth.getDate() - i;
    const date = new Date(year, month - 1, dayNum);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
    
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday,
      isSelected
    });
  }
  
  // Next month days (grayed out)
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    });
  }
  
  return (
    <div className="grid grid-cols-7 gap-1" data-testid="calendar-picker">
      {calendarDays.map((day, index) => {
        const dayNum = day.date.getDate();
        
        return (
          <button
            key={index}
            onClick={() => day.isCurrentMonth ? onDateSelect(day.date) : null}
            disabled={!day.isCurrentMonth}
            className={`
              h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 relative
              ${day.isCurrentMonth 
                ? 'hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer'
                : 'cursor-not-allowed'
              }
              ${day.isSelected 
                ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600' 
                : day.isToday && day.isCurrentMonth
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold border-2 border-blue-300 dark:border-blue-600'
                  : day.isCurrentMonth 
                    ? 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400'
                    : 'text-gray-300 dark:text-gray-600'
              }
            `}
          >
            {dayNum}
            {day.isToday && day.isCurrentMonth && !day.isSelected && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}