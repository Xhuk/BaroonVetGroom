import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { usePagePreCache } from "@/hooks/usePagePreCache";
import { 
  BarChart3, 
  Calendar,
  Users,
  Package, 
  Truck, 
  DollarSign, 
  Settings, 
  Crown,
  Stethoscope,
  Scissors,
  Heart,
  Receipt,
  CreditCard
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { canAccessAdmin, canAccessSuperAdmin } = useAccessControl();
  const { currentTenant } = useTenant();
  const { preCachePage } = usePagePreCache();

  // Get follow-up count for heart animation
  const { data: followUpData } = useQuery<{ count: number }>({
    queryKey: ["/api/medical-appointments/follow-up-count", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get follow-up configuration
  const { data: followUpConfig } = useQuery<{
    followUpNormalThreshold: number;
    followUpUrgentThreshold: number;
    followUpHeartBeatEnabled: boolean;
    followUpShowCount: boolean;
  }>({
    queryKey: ["/api/company/follow-up-config", currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  const followUpCount = followUpData?.count ?? 0;
  
  // Configuration with defaults
  const config = {
    followUpNormalThreshold: followUpConfig?.followUpNormalThreshold ?? 10,
    followUpUrgentThreshold: followUpConfig?.followUpUrgentThreshold ?? 20,
    followUpHeartBeatEnabled: followUpConfig?.followUpHeartBeatEnabled ?? true,
    followUpShowCount: followUpConfig?.followUpShowCount ?? true,
  };

  // Determine heart beat speed based on count and thresholds
  const getHeartBeatClass = () => {
    if (!config.followUpHeartBeatEnabled || followUpCount === 0) {
      return "";
    }

    if (followUpCount >= config.followUpUrgentThreshold) {
      return "animate-heartbeat-fast"; // Fast beat
    } else if (followUpCount >= config.followUpNormalThreshold) {
      return "animate-heartbeat-slow"; // Slow beat
    }

    return "";
  };

  const navigationItems = [
    { icon: BarChart3, label: "Tablero", href: "/" },
    { icon: Calendar, label: "Citas", href: "/appointments" },
    { icon: Users, label: "Clientes", href: "/clients" },
    { icon: Stethoscope, label: "Medical", href: "/medical-appointments" },
    { icon: Scissors, label: "Estética", href: "/grooming-services" },
    { icon: Heart, label: "Seguimientos", href: "/follow-up-tasks" },
    { icon: Package, label: "Inventario", href: "/inventory" },
    { icon: DollarSign, label: "Facturación", href: "/billing" },

  ];

  const adminItems = [
    ...(canAccessAdmin ? [{ icon: Settings, label: "Admin Dashboard", href: "/admin" }] : []),
    ...(canAccessSuperAdmin ? [
      { icon: Crown, label: "Super-Admin Dashboard", href: "/superadmin" }
    ] : []),
  ];

  return (
    <nav className={cn(
      "fixed left-0 top-20 bottom-32 w-64 bg-white shadow-lg z-30 transform -translate-x-full lg:translate-x-0 transition-transform",
      className
    )}>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h3>
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onMouseEnter={() => preCachePage(item.href)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                {item.label === "Seguimientos" ? (
                  <div className="relative flex items-center">
                    <Heart 
                      className={cn(
                        "w-5 h-5 text-red-500", 
                        getHeartBeatClass()
                      )} 
                    />
                    {config.followUpShowCount && followUpCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {followUpCount > 99 ? "99+" : followUpCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
          
          {adminItems.length > 0 && (
            <li className="border-t pt-2 mt-4">
              {adminItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => preCachePage(item.href)}
                  className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-lg mb-2"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              ))}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
