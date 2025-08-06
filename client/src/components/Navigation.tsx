import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
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

  // Get follow-up count for heart animation
  const { data: followUpData } = useQuery<{ count: number }>({
    queryKey: ["/api/medical-appointments/follow-up-count", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes instead of 30 seconds
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
    { icon: Users, label: "Clientes", href: "/clients" },
    { icon: Stethoscope, label: "Medical", href: "/medical-appointments" },
    { icon: Scissors, label: "Estética", href: "/grooming-services" },
    { icon: Heart, label: "Seguimientos", href: "/follow-up-tasks" },
    { icon: Truck, label: "Plan de Entregas", href: "/delivery-plan" },
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
      "fixed left-0 w-72 bg-card shadow-lg z-30 transform -translate-x-full lg:translate-x-0 transition-transform border-r border-border",
      className
    )} style={{ top: '77px', bottom: 'calc(10px + 96px)' }}>
      <div className="p-4 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-foreground mb-4">Módulos</h3>
        <ul className="space-y-2 flex-1">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
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
            <li className="border-t border-border pt-2 mt-4">
              {adminItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-muted px-3 py-2 rounded-lg mb-2 transition-colors"
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
