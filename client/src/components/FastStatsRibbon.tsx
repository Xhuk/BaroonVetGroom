import { 
  Scissors, 
  Stethoscope, 
  Syringe, 
  Truck, 
  Calendar, 
  Users, 
  DoorOpen 
} from "lucide-react";
interface DashboardStats {
  appointmentsToday: number;
  groomingToday: number;
  medicalToday: number;
  pendingPayments: number;
  totalClients: number;
  totalPets: number;
  entriesDelivered: number;
  deliveriesToday?: number;
}

interface FastStatsRibbonProps {
  stats?: DashboardStats | null;
}

export function FastStatsRibbon({ stats }: FastStatsRibbonProps) {
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

  const statsConfig = [
    { 
      value: stats.appointmentsToday, 
      label: "Citas Hoy", 
      icon: Calendar, 
      color: "from-blue-500 to-blue-600", 
      textColor: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50"
    },
    { 
      value: stats.groomingToday, 
      label: "Estética", 
      icon: Scissors, 
      color: "from-purple-500 to-purple-600", 
      textColor: "text-purple-700 dark:text-purple-300",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50"
    },
    { 
      value: stats.medicalToday, 
      label: "Médicas", 
      icon: Stethoscope, 
      color: "from-emerald-500 to-emerald-600", 
      textColor: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50"
    },
    { 
      value: stats.pendingPayments, 
      label: "Pagos Pend.", 
      icon: DoorOpen, 
      color: "from-orange-500 to-orange-600", 
      textColor: "text-orange-700 dark:text-orange-300",
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50"
    },
    { 
      value: stats.totalClients, 
      label: "Clientes", 
      icon: Users, 
      color: "from-indigo-500 to-indigo-600", 
      textColor: "text-indigo-700 dark:text-indigo-300",
      bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50"
    },
    { 
      value: stats.totalPets, 
      label: "Mascotas", 
      icon: Syringe, 
      color: "from-pink-500 to-pink-600", 
      textColor: "text-pink-700 dark:text-pink-300",
      bgColor: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/50"
    },
    { 
      value: stats.deliveriesToday || 0, 
      label: "Entregas", 
      icon: Truck, 
      color: "from-amber-500 to-amber-600", 
      textColor: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-slate-700/50 z-20 shadow-2xl">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Enhanced Date Section */}
          <div className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-xl text-gray-800 dark:text-gray-100 leading-none tracking-tight">{dayName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{day} {month}</div>
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
    </div>
  );
}