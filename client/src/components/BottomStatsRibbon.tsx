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
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200 z-20">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-blue-200 animate-pulse rounded w-32"></div>
            <div className="flex items-center space-x-8">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-4 bg-blue-200 animate-pulse rounded w-16"></div>
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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200 z-20">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          {/* Left side - Current date */}
          <div className="flex items-center space-x-2 text-blue-800 font-medium">
            <Calendar className="w-4 h-4" />
            <span>{dayName}, {day} {month}</span>
          </div>

          {/* Center - Statistics */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2 text-green-700">
              <Scissors className="w-4 h-4" />
              <span className="font-medium">{stats.groomingAppointments}</span>
              <span className="text-green-600">Estética</span>
            </div>

            <div className="flex items-center space-x-2 text-blue-700">
              <Stethoscope className="w-4 h-4" />
              <span className="font-medium">{stats.medicalAppointments}</span>
              <span className="text-blue-600">Médicas</span>
            </div>

            <div className="flex items-center space-x-2 text-purple-700">
              <Syringe className="w-4 h-4" />
              <span className="font-medium">{stats.vaccinationAppointments}</span>
              <span className="text-purple-600">Vacunas</span>
            </div>

            <div className="flex items-center space-x-2 text-orange-700">
              <Truck className="w-4 h-4" />
              <span className="font-medium">{stats.scheduledDeliveries}</span>
              <span className="text-orange-600">Entregas</span>
            </div>

            <div className="flex items-center space-x-2 text-indigo-700">
              <Users className="w-4 h-4" />
              <span className="font-medium">{stats.activeStaffToday}/{stats.teamMembers}</span>
              <span className="text-indigo-600">Equipo</span>
            </div>
          </div>

          {/* Right side - Room utilization */}
          <div className="flex items-center space-x-2 text-pink-700">
            <DoorOpen className="w-4 h-4" />
            <span className="font-medium">{stats.roomUtilization}%</span>
            <span className="text-pink-600">Salas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
