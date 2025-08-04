import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Building, 
  Globe, 
  Database, 
  Shield,
  TrendingUp,
  Server,
  Plus,
  Settings,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SuperAdmin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Debes iniciar sesión para acceder al super admin",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Super-Admin Dashboard</h1>
            <p className="text-gray-600">Gestión a nivel de plataforma: empresas, infraestructura y configuraciones globales</p>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45</div>
                <p className="text-xs text-muted-foreground">
                  +5 nuevas este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tenants Activos</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">234</div>
                <p className="text-xs text-muted-foreground">
                  Across all companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847</div>
                <p className="text-xs text-muted-foreground">
                  +18% growth this quarter
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime del Sistema</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.9%</div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Management Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gestión de Empresas</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Empresa
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">VetCorp Internacional</h4>
                      <p className="text-sm text-gray-600">12 tenants • 156 usuarios</p>
                      <p className="text-xs text-gray-500">Plan: Enterprise</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Activa</span>
                      <p className="text-xs text-gray-500 mt-1">Desde 2023</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Clínica Veterinaria Central</h4>
                      <p className="text-sm text-gray-600">3 tenants • 24 usuarios</p>
                      <p className="text-xs text-gray-500">Plan: Professional</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Activa</span>
                      <p className="text-xs text-gray-500 mt-1">Desde 2024</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">PetCare Solutions</h4>
                      <p className="text-sm text-gray-600">8 tenants • 89 usuarios</p>
                      <p className="text-xs text-gray-500">Plan: Enterprise</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Trial</span>
                      <p className="text-xs text-gray-500 mt-1">15 días restantes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>Salud del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Base de Datos</span>
                    </div>
                    <span className="text-sm text-green-600">Operacional</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">API Gateway</span>
                    </div>
                    <span className="text-sm text-green-600">Operacional</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">CDN</span>
                    </div>
                    <span className="text-sm text-yellow-600">Latencia alta</span>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Autenticación</span>
                    </div>
                    <span className="text-sm text-green-600">Operacional</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Crecimiento Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevas Empresas</span>
                    <span className="font-medium text-green-600">+5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevos Tenants</span>
                    <span className="font-medium text-green-600">+23</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevos Usuarios</span>
                    <span className="font-medium text-green-600">+187</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Citas Procesadas</span>
                    <span className="font-medium text-blue-600">12,456</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso de Recursos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU</span>
                      <span>34%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "34%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memoria</span>
                      <span>67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "67%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Almacenamiento</span>
                      <span>23%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "23%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="w-4 h-4 mr-2" />
                    Backup de BD
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Config Global
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Reportes Ejecutivos
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Auditoría de Seguridad
                  </Button>
                  
                  <Link href="/superadmin/monitoring">
                    <Button variant="outline" className="w-full justify-start bg-blue-50 hover:bg-blue-100 border-blue-200">
                      <Activity className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-blue-700">Webhook Monitoring</span>
                    </Button>
                  </Link>
                  
                  <Link href="/superadmin/rbac">
                    <Button variant="outline" className="w-full justify-start bg-purple-50 hover:bg-purple-100 border-purple-200">
                      <Shield className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="text-purple-700">Control de Acceso (RBAC)</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
