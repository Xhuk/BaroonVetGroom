import { 
  Scissors, 
  Stethoscope, 
  Syringe, 
  Truck, 
  Calendar, 
  Users, 
  DoorOpen 
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

interface FastStatsRibbonProps {
  stats?: DashboardStats | null;
}

export function FastStatsRibbon({ stats }: FastStatsRibbonProps) {
  if (!stats) {
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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 backdrop-blur-md border-t border-blue-200 dark:border-slate-600/50 z-20 shadow-2xl">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between text-sm">
          {/* Date Section */}
          <div className="flex items-center space-x-3 text-blue-800 dark:text-blue-200">
            <Calendar className="w-5 h-5" />
            <div>
              <div className="font-bold text-lg leading-none">{dayName}</div>
              <div className="text-xs opacity-75">{day} {month}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex items-center space-x-8 lg:space-x-12">
            {/* Today's Appointments */}
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <Calendar className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.appointmentsToday}</div>
                <div className="text-xs opacity-75">Citas Hoy</div>
              </div>
            </div>

            {/* Grooming Services */}
            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
              <Scissors className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.groomingToday}</div>
                <div className="text-xs opacity-75">Estética</div>
              </div>
            </div>

            {/* Medical Services */}
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <Stethoscope className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.medicalToday}</div>
                <div className="text-xs opacity-75">Médicas</div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
              <DoorOpen className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.pendingPayments}</div>
                <div className="text-xs opacity-75">Pagos Pend.</div>
              </div>
            </div>

            {/* Total Clients */}
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
              <Users className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.totalClients}</div>
                <div className="text-xs opacity-75">Clientes</div>
              </div>
            </div>

            {/* Total Pets */}
            <div className="flex items-center space-x-2 text-pink-700 dark:text-pink-300">
              <Syringe className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.totalPets}</div>
                <div className="text-xs opacity-75">Mascotas</div>
              </div>
            </div>

            {/* Deliveries */}
            <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300">
              <Truck className="w-4 h-4" />
              <div className="text-center">
                <div className="font-bold text-lg leading-none">{stats.deliveriesToday || 0}</div>
                <div className="text-xs opacity-75">Entregas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}