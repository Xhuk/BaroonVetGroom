import { memo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Users, 
  Package, 
  Truck, 
  CreditCard, 
  ClipboardList, 
  Stethoscope, 
  Scissors,
  Heart,
  Settings,
  Crown
} from "lucide-react";

const navItems = [
  { href: "/", icon: Calendar, label: "Tablero", color: "text-blue-600" },
  { href: "/appointments", icon: Calendar, label: "Citas", color: "text-green-600" },
  { href: "/clients", icon: Users, label: "Clientes", color: "text-purple-600" },
  { href: "/medical-appointments", icon: Stethoscope, label: "Médicas", color: "text-red-600" },
  { href: "/grooming-services", icon: Scissors, label: "Estética", color: "text-pink-600" },
  { href: "/follow-up-tasks", icon: Heart, label: "Seguimiento", color: "text-orange-600" },
  { href: "/inventory", icon: Package, label: "Inventario", color: "text-indigo-600" },
  { href: "/billing", icon: CreditCard, label: "Facturación", color: "text-yellow-600" },
  { href: "/admin", icon: Settings, label: "Admin", color: "text-gray-600" },
  { href: "/superadmin", icon: Crown, label: "Super Admin", color: "text-amber-600" },
];

export const FastNavigation = memo(function FastNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed left-0 top-0 z-40 h-screen w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-center border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h1 className="text-xl font-bold text-white">VetGroom</h1>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out",
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-blue-600" : item.color
                      )} 
                    />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
});