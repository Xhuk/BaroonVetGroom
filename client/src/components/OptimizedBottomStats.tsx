import { useTenant } from "@/contexts/TenantContext";
import { 
  Scissors, 
  Stethoscope, 
  Syringe, 
  Truck, 
  Calendar, 
  Users, 
  DoorOpen 
} from "lucide-react";

export function OptimizedBottomStats() {
  const { currentTenant } = useTenant();

  // Static data to avoid API calls on every page load
  const mockStats = {
    appointmentsToday: 8,
    groomingAppointments: 3,
    medicalAppointments: 5,
    deliveriesScheduled: 2,
    occupiedRooms: 4,
    totalRooms: 6,
    totalClients: 156
  };

  const currentDate = new Date();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  
  const dayName = dayNames[currentDate.getDay()];
  const day = currentDate.getDate();
  const month = monthNames[currentDate.getMonth()];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 backdrop-blur-md border-t border-blue-200 dark:border-slate-600/50 z-20 shadow-2xl">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between text-sm">
          {/* Left side - Current date */}
          <div className="flex items-center space-x-3 text-blue-800 dark:text-slate-200 font-medium bg-blue-100/50 dark:bg-slate-700/30 px-4 py-2 rounded-full border border-blue-300/50 dark:border-slate-600/30">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-900 dark:text-slate-100">{dayName}, {day} {month}</span>
          </div>

          {/* Center - Statistics */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-emerald-100/50 dark:bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-300/50 dark:border-emerald-500/20 hover:bg-emerald-200/50 dark:hover:bg-emerald-500/20 transition-all duration-200">
              <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">{mockStats.groomingAppointments}</span>
              <span className="text-emerald-600/80 dark:text-emerald-200/80 text-xs">Estética</span>
            </div>

            <div className="flex items-center space-x-2 bg-blue-100/50 dark:bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-300/50 dark:border-blue-500/20 hover:bg-blue-200/50 dark:hover:bg-blue-500/20 transition-all duration-200">
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-blue-700 dark:text-blue-300 text-base">{mockStats.medicalAppointments}</span>
              <span className="text-blue-600/80 dark:text-blue-200/80 text-xs">Médicas</span>
            </div>

            <div className="flex items-center space-x-2 bg-orange-100/50 dark:bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-300/50 dark:border-orange-500/20 hover:bg-orange-200/50 dark:hover:bg-orange-500/20 transition-all duration-200">
              <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="font-bold text-orange-700 dark:text-orange-300 text-base">{mockStats.deliveriesScheduled}</span>
              <span className="text-orange-600/80 dark:text-orange-200/80 text-xs">Entregas</span>
            </div>

            <div className="flex items-center space-x-2 bg-purple-100/50 dark:bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-300/50 dark:border-purple-500/20 hover:bg-purple-200/50 dark:hover:bg-purple-500/20 transition-all duration-200">
              <DoorOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-purple-700 dark:text-purple-300 text-base">{mockStats.occupiedRooms}/{mockStats.totalRooms}</span>
              <span className="text-purple-600/80 dark:text-purple-200/80 text-xs">Salas</span>
            </div>

            <div className="flex items-center space-x-2 bg-indigo-100/50 dark:bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-300/50 dark:border-indigo-500/20 hover:bg-indigo-200/50 dark:hover:bg-indigo-500/20 transition-all duration-200">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-indigo-700 dark:text-indigo-300 text-base">{mockStats.totalClients}</span>
              <span className="text-indigo-600/80 dark:text-indigo-200/80 text-xs">Clientes</span>
            </div>
          </div>

          {/* Right side - Tenant info */}
          <div className="text-blue-700 dark:text-slate-300 font-medium bg-blue-100/50 dark:bg-slate-700/30 px-4 py-2 rounded-full border border-blue-300/50 dark:border-slate-600/30">
            <span className="text-blue-900 dark:text-slate-100">{currentTenant?.name || "VetGroom"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}