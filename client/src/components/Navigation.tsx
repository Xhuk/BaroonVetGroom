import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
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
  Scissors
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { canAccessAdmin, canAccessSuperAdmin } = useAccessControl();

  const navigationItems = [
    { icon: BarChart3, label: "Tablero", href: "/" },
    { icon: Calendar, label: "Citas", href: "/appointments" },
    { icon: Users, label: "Clientes", href: "/clients" },
    { icon: Stethoscope, label: "Medical", href: "/medical-appointments" },
    { icon: Scissors, label: "Estética", href: "/grooming-services" },
    { icon: Package, label: "Inventario", href: "/inventory" },
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
                className="flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                <item.icon className="w-5 h-5" />
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
