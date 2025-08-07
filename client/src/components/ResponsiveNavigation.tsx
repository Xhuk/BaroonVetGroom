import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useScreenSize } from "@/hooks/useScreenSize";
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

interface ResponsiveNavigationProps {
  className?: string;
}

export function ResponsiveNavigation({ className }: ResponsiveNavigationProps) {
  const { canAccessAdmin, canAccessSuperAdmin } = useAccessControl();
  const { currentTenant } = useTenant();
  const { deviceType, shouldCollapseNavigation, isSmallTablet, isTabletLandscape } = useScreenSize();

  console.log(`📱 ResponsiveNavigation: Device ${deviceType}, shouldCollapse: ${shouldCollapseNavigation}, landscape: ${isTabletLandscape}`);

  // Hide navigation in tablet landscape mode (ribbon takes over)
  if (isTabletLandscape) {
    return null;
  }

  // Get follow-up count for heart animation
  const { data: followUpData } = useQuery<{ count: number }>({
    queryKey: ["/api/medical-appointments/follow-up-count", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 3 * 60 * 1000,
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
  
  const config = {
    followUpNormalThreshold: followUpConfig?.followUpNormalThreshold ?? 10,
    followUpUrgentThreshold: followUpConfig?.followUpUrgentThreshold ?? 20,
    followUpHeartBeatEnabled: followUpConfig?.followUpHeartBeatEnabled ?? true,
    followUpShowCount: followUpConfig?.followUpShowCount ?? true,
  };

  const getHeartBeatClass = () => {
    if (!config.followUpHeartBeatEnabled || followUpCount === 0) {
      return "";
    }

    if (followUpCount >= config.followUpUrgentThreshold) {
      return "animate-heartbeat-fast";
    } else if (followUpCount >= config.followUpNormalThreshold) {
      return "animate-heartbeat-slow";
    }

    return "";
  };

  const navigationItems = [
    { icon: BarChart3, label: "Tablero", href: "/" },
    { icon: Users, label: "Clientes", href: "/clients" },
    { icon: Stethoscope, label: "Medical", href: "/medical-appointments" },
    { icon: Scissors, label: "Estética", href: "/grooming-services" },
    { icon: Package, label: "Inventario", href: "/inventory" },
    { icon: Heart, label: "Seguimientos", href: "/follow-up-tasks" },
    { icon: Truck, label: "Plan de Entregas", href: "/delivery-plan" },
    { icon: CreditCard, label: "Caja", href: "/cashier" },
  ];

  const adminItems = [
    ...(canAccessAdmin ? [{ icon: Settings, label: "Admin Dashboard", href: "/admin" }] : []),
    ...(canAccessSuperAdmin ? [
      { icon: Crown, label: "Super-Admin Dashboard", href: "/superadmin" }
    ] : []),
  ];

  // Dynamic width based on device type
  const getNavigationWidth = () => {
    if (shouldCollapseNavigation) {
      return "w-16"; // Icon-only mode for small tablets
    }
    return "w-72"; // Full width for medium/large tablets and desktop
  };

  // Dynamic positioning for tablets
  const getNavigationPosition = () => {
    if (isSmallTablet) {
      return { top: '80px', bottom: '10px' }; // Adjusted for tablet header
    }
    return { top: '90px', bottom: 'calc(10px + 96px)' }; // Original desktop positioning
  };

  return (
    <nav 
      className={cn(
        "fixed left-0 bg-card shadow-lg z-30 transform -translate-x-full lg:translate-x-0 transition-all duration-300 border-r border-border",
        getNavigationWidth(),
        className
      )} 
      style={getNavigationPosition()}
    >
      <div className="pt-4 px-2 pb-4 h-full flex flex-col">
        {!shouldCollapseNavigation && (
          <h3 className="text-lg font-semibold text-foreground mb-4 px-2">Módulos</h3>
        )}
        
        <ul className={cn(
          "space-y-2 flex-1",
          shouldCollapseNavigation ? "space-y-3" : "space-y-2"
        )}>
          {navigationItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors rounded-lg",
                  shouldCollapseNavigation 
                    ? "justify-center p-3 tooltip-container" 
                    : "space-x-3 px-3 py-2"
                )}
                title={shouldCollapseNavigation ? item.label : undefined}
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
                      <span className={cn(
                        "absolute bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold",
                        shouldCollapseNavigation 
                          ? "-top-1 -right-1 w-4 h-4" 
                          : "-top-2 -right-2 w-5 h-5"
                      )}>
                        {followUpCount > 99 ? "99+" : followUpCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
                
                {!shouldCollapseNavigation && <span>{item.label}</span>}
              </a>
            </li>
          ))}
          
          {adminItems.length > 0 && (
            <li className={cn(
              "border-t border-border pt-2 mt-4",
              shouldCollapseNavigation && "mx-2"
            )}>
              {adminItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-muted-foreground hover:text-primary hover:bg-muted rounded-lg mb-2 transition-colors",
                    shouldCollapseNavigation 
                      ? "justify-center p-3 tooltip-container" 
                      : "space-x-3 px-3 py-2"
                  )}
                  title={shouldCollapseNavigation ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5" />
                  {!shouldCollapseNavigation && <span>{item.label}</span>}
                </a>
              ))}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}