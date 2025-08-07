import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Smartphone, Tablet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DeviceBlockerProps {
  children: React.ReactNode;
}

export function DeviceBlocker({ children }: DeviceBlockerProps) {
  const { isPhone, deviceName } = useDeviceDetection();
  
  // Check for SuperAdmin access
  const { data: accessInfo } = useQuery({
    queryKey: ['/api/auth/access-info'],
    enabled: isPhone // Only check when on phone
  });
  
  const isSuperAdmin = accessInfo && 'accessLevel' in accessInfo && accessInfo.accessLevel === 'system_admin';
  
  if (isPhone && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Dispositivo No Soportado
            </h1>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-gray-300">
              <Smartphone className="h-8 w-8 text-red-400" />
              <span className="text-xl">→</span>
              <Tablet className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-gray-300">
              Esta aplicación está diseñada para tabletas de 8 pulgadas o más y computadoras de escritorio.
            </p>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Dispositivos Soportados:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Tabletas 8+ pulgadas</li>
                <li>• iPad y tabletas Android grandes</li>
                <li>• Computadoras portátiles</li>
                <li>• Computadoras de escritorio</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">
              Para acceso desde teléfonos, contacte al administrador del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}