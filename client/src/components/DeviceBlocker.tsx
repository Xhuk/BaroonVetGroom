import { useScreenSize } from "@/hooks/useScreenSize";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Shield, Tablet, Monitor } from "lucide-react";

interface DeviceBlockerProps {
  children: React.ReactNode;
}

export function DeviceBlocker({ children }: DeviceBlockerProps) {
  const { isMobilePhone, deviceType } = useScreenSize();
  const { canAccessSuperAdmin } = useAccessControl();

  // Block phones except for SuperAdmin users
  if (isMobilePhone && !canAccessSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="mb-6">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Acceso Restringido
            </h2>
            <p className="text-blue-100 leading-relaxed">
              Esta aplicación está optimizada para tabletas de 8+ pulgadas y computadoras de escritorio.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-green-300">
              <Tablet className="w-5 h-5" />
              <span>Tablets 8+ pulgadas</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-green-300">
              <Monitor className="w-5 h-5" />
              <span>Computadoras de escritorio</span>
            </div>
          </div>
          
          <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
            <p className="text-blue-100 text-sm">
              Por favor, accede desde un dispositivo compatible para la mejor experiencia de usuario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}