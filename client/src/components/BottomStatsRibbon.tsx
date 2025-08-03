import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { StatsCard } from "@/components/ui/stats-card";
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

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !stats) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-20">
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-20">
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatsCard
            title="Citas de Estética"
            value={stats.groomingAppointments}
            icon={<Scissors />}
            className="bg-gradient-to-r from-green-500 to-green-600"
            availability={{
              available: stats.groomingRoomAvailability,
              total: stats.groomingRoomAvailability + stats.groomingAppointments,
              status: stats.groomingRoomAvailability > 1 ? "available" : stats.groomingRoomAvailability > 0 ? "limited" : "full"
            }}
          />

          <StatsCard
            title="Citas Médicas"
            value={stats.medicalAppointments}
            icon={<Stethoscope />}
            className="bg-gradient-to-r from-blue-500 to-blue-600"
            availability={{
              available: stats.medicalRoomAvailability,
              total: stats.medicalRoomAvailability + stats.medicalAppointments,
              status: stats.medicalRoomAvailability > 1 ? "available" : stats.medicalRoomAvailability > 0 ? "limited" : "full"
            }}
          />

          <StatsCard
            title="Citas de Vacunación"
            value={stats.vaccinationAppointments}
            icon={<Syringe />}
            className="bg-gradient-to-r from-purple-500 to-purple-600"
            availability={{
              available: stats.vaccinationRoomAvailability,
              total: stats.vaccinationRoomAvailability + stats.vaccinationAppointments,
              status: stats.vaccinationRoomAvailability > 0 ? "available" : "full"
            }}
          />

          <StatsCard
            title="Entregas Programadas"
            value={stats.scheduledDeliveries}
            icon={<Truck />}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
            subtitle={`${stats.totalDeliveryWeight.toFixed(1)}kg total`}
          />

          <StatsCard
            title="Fecha Actual"
            value={dayName}
            subtitle={`${day} ${month}`}
            icon={<Calendar />}
            className="bg-gradient-to-r from-gray-600 to-gray-700"
          />

          <StatsCard
            title="Miembros del Equipo"
            value={stats.teamMembers}
            icon={<Users />}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600"
            availability={{
              available: stats.activeStaffToday,
              total: stats.teamMembers,
              status: stats.activeStaffToday === stats.teamMembers ? "available" : "limited"
            }}
          />

          <StatsCard
            title="Utilización de Salas"
            value={`${stats.roomUtilization}%`}
            subtitle={`${stats.totalRooms - Math.floor(stats.totalRooms * stats.roomUtilization / 100)}/${stats.totalRooms} salas disponibles`}
            icon={<DoorOpen />}
            className="bg-gradient-to-r from-pink-500 to-pink-600"
          />
        </div>
      </div>
    </div>
  );
}
