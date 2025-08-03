import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import type { DashboardStats } from "@shared/schema";
import { 
  Scissors, 
  Stethoscope, 
  Syringe, 
  Truck, 
  Calendar, 
  Users, 
  DoorOpen 
} from "lucide-react";

export function BottomStatsRibbon() {
  const { currentTenant } = useTenant();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !stats) {
    return (
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
    );
  }

  const currentDate = new Date();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  
  const dayName = dayNames[currentDate.getDay()];
  const day = currentDate.getDate();
  const month = monthNames[currentDate.getMonth()];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 backdrop-blur-md border-t border-slate-600/50 z-20 shadow-2xl">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between text-sm">
          {/* Left side - Current date */}
          <div className="flex items-center space-x-3 text-slate-200 font-medium bg-slate-700/30 px-4 py-2 rounded-full border border-slate-600/30">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-slate-100">{dayName}, {day} {month}</span>
          </div>

          {/* Center - Statistics */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200">
              <Scissors className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-300 text-base">{stats.groomingAppointments}</span>
              <span className="text-emerald-200/80 text-xs">Estética</span>
            </div>

            <div className="flex items-center space-x-2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-200">
              <Stethoscope className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-blue-300 text-base">{stats.medicalAppointments}</span>
              <span className="text-blue-200/80 text-xs">Médicas</span>
            </div>

            <div className="flex items-center space-x-2 bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-200">
              <Syringe className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-purple-300 text-base">{stats.vaccinationAppointments}</span>
              <span className="text-purple-200/80 text-xs">Vacunas</span>
            </div>

            <div className="flex items-center space-x-2 bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-all duration-200">
              <Truck className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-orange-300 text-base">{stats.scheduledDeliveries}</span>
              <span className="text-orange-200/80 text-xs">Entregas</span>
            </div>

            <div className="flex items-center space-x-2 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all duration-200">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-indigo-300 text-base">{stats.activeStaffToday}/{stats.teamMembers}</span>
              <span className="text-indigo-200/80 text-xs">Equipo</span>
            </div>
          </div>

          {/* Right side - Room utilization */}
          <div className="flex items-center space-x-3 bg-slate-700/30 px-4 py-2 rounded-full border border-slate-600/30">
            <DoorOpen className="w-4 h-4 text-pink-400" />
            <span className="font-bold text-pink-300 text-base">{stats.roomUtilization}%</span>
            <span className="text-slate-200/80 text-xs">Salas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
