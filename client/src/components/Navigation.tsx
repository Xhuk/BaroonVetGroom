import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Scissors, 
  Stethoscope, 
  Package, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  Settings, 
  Crown 
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const navigationItems = [
    { icon: BarChart3, label: "Tablero", href: "/", active: true },
    { icon: Scissors, label: "Estética", href: "/grooming" },
    { icon: Stethoscope, label: "Visitas Médicas", href: "/medical" },
    { icon: Package, label: "Inventario", href: "/inventory" },
    { icon: Truck, label: "Plan de Entregas", href: "/delivery" },
    { icon: TrendingUp, label: "Reportes", href: "/reports" },
    { icon: DollarSign, label: "Financiero", href: "/billing" },
  ];

  const adminItems = [
    { icon: Settings, label: "Admin Dashboard", href: "/admin" },
    { icon: Crown, label: "Super-Admin Dashboard", href: "/superadmin" },
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
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium",
                  item.active
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
          
          <li className="border-t pt-2 mt-4">
            {adminItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-lg mb-2"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            ))}
          </li>
        </ul>
      </div>
    </nav>
  );
}
