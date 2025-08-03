import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Phone, Mail, LogOut } from "lucide-react";
import type { User } from "@shared/schema";

export function Header() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const currentDate = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  };
  const formattedDate = currentDate.toLocaleDateString('es-ES', dateOptions);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tablero</h1>
          <div className="text-sm text-gray-600">
            <Calendar className="inline w-4 h-4 mr-2" />
            {formattedDate}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-sm">
            <div className="text-gray-600">
              Usuario: <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="text-gray-600">
              Tenant: <span className="font-medium text-blue-600">{currentTenant?.subdomain}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              English
            </button>
            <div className="flex space-x-2">
              <Button
                size="sm"
                className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white p-0"
              >
                <Phone className="w-3 h-3" />
              </Button>
              <Button
                size="sm" 
                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white p-0"
              >
                <Mail className="w-3 h-3" />
              </Button>
            </div>
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
