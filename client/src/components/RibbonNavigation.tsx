import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  BarChart3, 
  Users,
  Stethoscope,
  Scissors,
  Heart,
  Truck, 
  CreditCard,
  Package,
  Settings, 
  Crown,
  CalendarDays
} from "lucide-react";

interface RibbonNavigationProps {
  className?: string;
}

interface NavigationItem {
  icon: React.ComponentType<any>;
  label: string;
  href?: string;
  onClick?: () => void;
  isButton?: boolean;
}

export function RibbonNavigation({ className }: RibbonNavigationProps) {
  const { canAccessAdmin, canAccessSuperAdmin } = useAccessControl();
  const { currentTenant } = useTenant();
  const [, setLocation] = useLocation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  const handleCalendarClick = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateStr = date.toISOString().split('T')[0];
      setLocation(`/?date=${dateStr}`);
      setShowCalendar(false);
    }
  };

  const navigationItems: NavigationItem[] = [
    { icon: CalendarDays, label: "Calendario", onClick: handleCalendarClick, isButton: true },
    { icon: BarChart3, label: "Tablero", href: "/" },
    { icon: Users, label: "Clientes", href: "/clients" },
    { icon: Stethoscope, label: "Medical", href: "/medical-appointments" },
    { icon: Scissors, label: "Estética", href: "/grooming-services" },
    { icon: Package, label: "Inventario", href: "/inventory" },
    { icon: Heart, label: "Seguimientos", href: "/follow-up-tasks" },
    { icon: Truck, label: "Entregas", href: "/delivery-plan" },
    { icon: CreditCard, label: "Caja", href: "/cashier" },
  ];

  const adminItems: NavigationItem[] = [
    ...(canAccessAdmin ? [{ icon: Settings, label: "Admin", href: "/admin" }] : []),
    ...(canAccessSuperAdmin ? [
      { icon: Crown, label: "Super-Admin", href: "/superadmin" }
    ] : []),
  ];

  const allItems = [...navigationItems, ...adminItems];

  console.log(`🎗️ RibbonNavigation: Rendering with ${allItems.length} items`);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800/95 via-slate-700/95 to-slate-800/95 backdrop-blur-md border-t border-slate-600/50 z-30 shadow-2xl",
      className
    )}>
      <div className="px-2 py-2">
        <div className="flex items-center justify-between max-w-full overflow-x-auto">
          {allItems.map((item) => {
            const ItemComponent = item.isButton ? 'button' : 'a';
            const itemProps = item.isButton ? 
              { onClick: item.onClick, type: 'button' as const } : 
              { href: item.href };
              
            return (
              <ItemComponent
                key={item.href || item.label}
                {...itemProps}
                className="flex flex-col items-center justify-center p-2 flex-1 max-w-[90px] text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors rounded-lg group tablet-touch"
                title={item.label}
              >
                {item.label === "Seguimientos" ? (
                  <div className="relative flex items-center justify-center">
                    <Heart 
                      className={cn(
                        "w-5 h-5 text-red-500 mb-1", 
                        getHeartBeatClass()
                      )} 
                    />
                    {config.followUpShowCount && followUpCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {followUpCount > 99 ? "99+" : followUpCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <item.icon className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {item.label}
                </span>
              </ItemComponent>
            );
          })}
        </div>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Seleccionar Fecha</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
              data-testid="calendar-picker"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCalendar(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleDateSelect(new Date())}
                data-testid="button-today"
              >
                Hoy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}