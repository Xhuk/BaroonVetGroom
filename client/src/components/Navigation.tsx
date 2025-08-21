import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useTranslations } from "@/hooks/useTranslations";
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
  CreditCard,
  Building2
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { canAccessAdmin, canAccessSuperAdmin } = useAccessControl();
  const { currentTenant } = useTenant();
  const { nav } = useTranslations();

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
    { icon: BarChart3, label: nav.dashboard(), href: "/" },
    { icon: Users, label: nav.clients(), href: "/clients" },
    { icon: Stethoscope, label: nav.medical_records(), href: "/medical-appointments" },
    { icon: Scissors, label: nav.grooming(), href: "/grooming-services" },
    { icon: Heart, label: nav.follow_up(), href: "/follow-up-tasks" },
    { icon: Truck, label: nav.delivery(), href: "/delivery-plan" },
    { icon: CreditCard, label: nav.billing(), href: "/cashier" },
  ];

  const adminItems = [
    ...(canAccessAdmin ? [
      { icon: Settings, label: nav.admin(), href: "/admin" },
      { icon: Building2, label: "Empresa y Clínica", href: "/admin/company-clinic" },
      { icon: Receipt, label: "Plantillas de Recibo", href: "/admin/receipt-templates" }
    ] : []),
    ...(canAccessSuperAdmin ? [
      { icon: Crown, label: nav.super_admin(), href: "/superadmin" }
    ] : []),
  ];

  return (
    <nav className={cn(
      "fixed left-0 w-72 bg-card shadow-lg z-30 transform -translate-x-full lg:translate-x-0 transition-transform border-r border-border",
      className
    )} style={{ top: '90px', bottom: 'calc(10px + 96px)' }}>
      <div className="pt-4 px-4 pb-4 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-foreground mb-4">{nav.navigation || "Módulos"}</h3>
        <ul className="space-y-2 flex-1">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                {item.label === nav.follow_up() ? (
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
