import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Users,
  PawPrint,
  FileText,
  BarChart3,
  Settings,
  Truck,
  Package,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortLabel?: string;
}

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: BarChart3, shortLabel: "Dash" },
  { path: "/calendar", label: "Calendario", icon: Calendar, shortLabel: "Cal" },
  { path: "/clients", label: "Clientes", icon: Users, shortLabel: "Cli" },
  { path: "/pets", label: "Mascotas", icon: PawPrint, shortLabel: "Pet" },
  { path: "/medical", label: "Médico", icon: FileText, shortLabel: "Med" },
  { path: "/delivery", label: "Entregas", icon: Truck, shortLabel: "Ent" },
  { path: "/cashier", label: "Caja", icon: Package, shortLabel: "Caj" },
  { path: "/settings", label: "Configuración", icon: Settings, shortLabel: "Cfg" },
];

export function ResponsiveNavigation() {
  const [location] = useLocation();
  const { isSmallTablet, isTablet, isDesktop, deviceName, userAgent, deviceType } = useDeviceDetection();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Debug: Log device detection for Xiaomi Tab 8
  useEffect(() => {
    console.log(`Device Detection: ${deviceName} (${deviceType}), UserAgent: ${userAgent.substring(0, 50)}...`);
    console.log(`isSmallTablet: ${isSmallTablet}, Auto-collapse: ${isSmallTablet}`);
  }, [deviceType, userAgent, deviceName, isSmallTablet]);

  // Auto-collapse on actual small tablets (8-10 inches) like Xiaomi Tab 8
  const shouldCollapse = isSmallTablet || isCollapsed;
  
  // Force debug log current state
  console.log(`Navigation: shouldCollapse=${shouldCollapse}, isSmallTablet=${isSmallTablet}, deviceType=${deviceType}`);
  
  // Mobile overlay menu for very small screens
  const showMobileMenu = !isTablet && !isDesktop;

  if (showMobileMenu) {
    return (
      <>
        {/* Mobile menu button */}
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-50 bg-background/90 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
            <div className="pt-16 px-4">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <Link key={item.path} href={item.path}>
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-foreground"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 h-full bg-background border-r border-border transition-all duration-300 z-30",
        shouldCollapse ? "w-16" : "w-72"
      )}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!shouldCollapse && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VG</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">VetGroom</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {shouldCollapse ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation items */}
      <div className="p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground",
                  shouldCollapse && "justify-center"
                )}
                title={shouldCollapse ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!shouldCollapse && (
                  <span className="font-medium">{item.label}</span>
                )}
                {!shouldCollapse && isActive && (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Collapse hint for tablets */}
      {isSmallTablet && !isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Toca el botón X para colapsar el menú y ganar más espacio
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}