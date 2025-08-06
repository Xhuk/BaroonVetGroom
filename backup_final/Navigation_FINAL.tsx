// FINAL VERSION - Navigation Component with Perfect Alignment
// Backup created: August 6, 2025
// Navigation starts at 90px from top, ends at calc(100vh - 10px - 96px)

import React from 'react';
import { BarChart3, Users, Stethoscope, Scissors, Heart, Truck, DollarSign, Settings, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { user } = useAuth();
  
  // Follow-up count query
  const { data: followUpCount = 0 } = useQuery({
    queryKey: ['/api/medical-appointments/follow-up-count', user?.tenantId],
    enabled: !!user?.tenantId,
  });

  // Follow-up config query
  const { data: config = { followUpShowCount: true } } = useQuery({
    queryKey: ['/api/company/follow-up-config', user?.companyId],
    enabled: !!user?.companyId,
  });

  // Access control
  const canAccessAdmin = user?.accessLevel === 'admin' || user?.accessLevel === 'system_admin';
  const canAccessSuperAdmin = user?.accessLevel === 'system_admin';

  const getHeartBeatClass = () => {
    if (!config.followUpShowCount || followUpCount === 0) {
      return "";
    }

    if (followUpCount >= 20) {
      return "animate-heartbeat-fast"; // Very fast beat
    } else if (followUpCount >= 10) {
      return "animate-heartbeat-medium"; // Medium beat  
    } else if (followUpCount >= 5) {
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
    )} style={{ top: '90px', bottom: 'calc(10px + 96px)' }}>
      <div className="pt-4 px-4 pb-4 h-full flex flex-col">
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