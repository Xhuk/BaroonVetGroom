import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewCompanyDialog } from "@/components/NewCompanyDialog";
import { SuperAdminPetAgePanel } from "@/components/SuperAdminPetAgePanel";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building, 
  Globe, 
  Database, 
  Shield,
  TrendingUp,
  Server,
  Plus,
  Settings,
  Activity,
  Heart,
  Webhook,
  Clock,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SuperAdmin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [demoDays, setDemoDays] = useState(45);
  const [groomingDays, setGroomingDays] = useState(1);

  // Demo data seeding mutation
  const seedDemoDataMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await fetch('/api/seed-demo-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Data Created Successfully",
        description: data.message || "Demo data has been seeded successfully for deployment demonstrations.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Demo Data Seeding Failed",
        description: error?.message || "Failed to seed demo data. Please check logs and try again.",
        variant: "destructive",
      });
    },
  });

  // Grooming appointments seeding mutation
  const seedGroomingTodayMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await fetch('/api/seed-grooming-today/demo-grooming-1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Grooming Appointments Created Successfully",
        description: data.message || `Grooming appointments have been created for ${groomingDays} day(s) with completed payment status.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Grooming Seeding Failed",
        description: error?.message || "Failed to create grooming appointments. Please check logs and try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch dashboard statistics from the database cube
  const { data: dashboardStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['/api/superadmin/dashboard-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: isAuthenticated,
  });

  const overview = dashboardStats?.overview || {};
  const companies = dashboardStats?.companies || [];
  const growth = dashboardStats?.growth || {};
  const health = dashboardStats?.health || {};
  const resources = dashboardStats?.resources || {};

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

          {/* Quick Access Ribbon */}
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                <Button variant="outline" className="h-auto py-3 px-4 flex flex-col items-center space-y-2 hover:bg-white">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Backup BD</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-3 px-4 flex flex-col items-center space-y-2 hover:bg-white">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">Config Global</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-3 px-4 flex flex-col items-center space-y-2 hover:bg-white">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Reportes</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-3 px-4 flex flex-col items-center space-y-2 hover:bg-white">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium">Auditoría</span>
                </Button>
                
                <Link href="/admin/follow-up-config" className="block">
                  <Button variant="outline" className="w-full h-auto py-3 px-4 flex flex-col items-center space-y-2 bg-red-50 hover:bg-red-100 border-red-300">
                    <Heart className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Seguimientos</span>
                  </Button>
                </Link>
                
                <Link href="/superadmin/monitoring" className="block">
                  <Button variant="outline" className="w-full h-auto py-3 px-4 flex flex-col items-center space-y-2 bg-blue-50 hover:bg-blue-100 border-blue-300">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Monitoring</span>
                  </Button>
                </Link>
                
                <Link href="/superadmin/rbac" className="block">
                  <Button variant="outline" className="w-full h-auto py-3 px-4 flex flex-col items-center space-y-2 bg-purple-50 hover:bg-purple-100 border-purple-300">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">RBAC</span>
                  </Button>
                </Link>

                <Link href="/superadmin/webhook-integrations" className="block">
                  <Button variant="outline" className="w-full h-auto py-3 px-4 flex flex-col items-center space-y-2 bg-green-50 hover:bg-green-100 border-green-300">
                    <Webhook className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">LateNode</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Platform Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    overview.totalCompanies || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {growth.newCompanies || 0} nuevas este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tenants Activos</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    overview.totalTenants || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {growth.newTenants || 0} nuevos este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                  ) : (
                    overview.totalUsers || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {growth.newUsers || 0} nuevos este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sistema Saludable</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    health.uptime || "99.9%"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {health.totalRecords || 0} registros totales
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
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowNewCompanyDialog(true)}
                    data-testid="button-new-company"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Empresa
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingStats ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="animate-pulse bg-gray-200 h-5 w-40 rounded mb-2"></div>
                          <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-1"></div>
                          <div className="animate-pulse bg-gray-200 h-3 w-24 rounded"></div>
                        </div>
                        <div className="text-right">
                          <div className="animate-pulse bg-gray-200 h-6 w-16 rounded mb-1"></div>
                          <div className="animate-pulse bg-gray-200 h-3 w-20 rounded"></div>
                        </div>
                      </div>
                    ))
                  ) : companies.length > 0 ? (
                    companies.map((company: any) => (
                      <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{company.name}</h4>
                          <p className="text-sm text-gray-600">
                            {company.tenantCount} tenants • {company.totalUsers} usuarios
                          </p>
                          <p className="text-xs text-gray-500">
                            Plan: {company.subscriptionTier || 'Básico'} • 
                            Ingresos: ${(company.monthlyRevenue || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            company.subscriptionStatus === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {company.subscriptionStatus === 'active' ? 'Activa' : 'Trial'}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {company.appointmentsToday || 0} citas hoy
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-gray-500">
                      <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay empresas registradas</p>
                    </div>
                  )}
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
                    <div className="text-right">
                      <span className="text-sm text-green-600">{health.databaseStatus || 'Operacional'}</span>
                      <p className="text-xs text-gray-500">{resources.databaseSizeMB || 0} MB</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Conexiones Activas</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-green-600">{health.activeConnections || 0}</span>
                      <p className="text-xs text-gray-500">/{resources.maxConnections || 450} max</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        (resources.cpuUsagePercent || 0) > 70 ? 'bg-red-500' :
                        (resources.cpuUsagePercent || 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <span className="font-medium">CPU / Memoria</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-green-600">
                        {Math.round(resources.cpuUsagePercent || 0)}% / {Math.round(resources.memoryUsagePercent || 0)}%
                      </span>
                      <p className="text-xs text-gray-500">Uso actual</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Rendimiento</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-green-600">{health.avgResponseTime || 0}ms</span>
                      <p className="text-xs text-gray-500">Resp. promedio</p>
                    </div>
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
                    <span className="font-medium text-green-600">
                      {isLoadingStats ? '...' : `+${growth.newCompanies || 0}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevos Tenants</span>
                    <span className="font-medium text-green-600">
                      {isLoadingStats ? '...' : `+${growth.newTenants || 0}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevos Usuarios</span>
                    <span className="font-medium text-green-600">
                      {isLoadingStats ? '...' : `+${growth.newUsers || 0}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Citas Procesadas</span>
                    <span className="font-medium text-blue-600">
                      {isLoadingStats ? '...' : (growth.appointmentsProcessed || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ingresos del Mes</span>
                    <span className="font-medium text-purple-600">
                      {isLoadingStats ? '...' : `$${(growth.monthlyRevenue || 0).toLocaleString()}`}
                    </span>
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
                      <span>{isLoadingStats ? '...' : `${Math.round(resources.cpuUsagePercent || 0)}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (resources.cpuUsagePercent || 0) > 70 ? 'bg-red-500' :
                          (resources.cpuUsagePercent || 0) > 50 ? 'bg-yellow-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.round(resources.cpuUsagePercent || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memoria</span>
                      <span>{isLoadingStats ? '...' : `${Math.round(resources.memoryUsagePercent || 0)}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (resources.memoryUsagePercent || 0) > 70 ? 'bg-red-500' :
                          (resources.memoryUsagePercent || 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.round(resources.memoryUsagePercent || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Almacenamiento</span>
                      <span>{isLoadingStats ? '...' : `${Math.round(resources.storageUsagePercent || 0)}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.round(resources.storageUsagePercent || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>BD: {resources.databaseSizeMB || 0} MB</span>
                      <span>Conexiones: {health.activeConnections || 0}/{resources.maxConnections || 450}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Estado del Sistema</span>
                  {isLoadingStats && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsError ? (
                    <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Error al cargar estadísticas</p>
                        <p className="text-xs text-red-600">Verifica la conexión de base de datos</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* CPU Alert */}
                      {(resources.cpuUsagePercent || 0) > 70 && (
                        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Alto uso de CPU: {Math.round(resources.cpuUsagePercent || 0)}%</p>
                            <p className="text-xs text-red-600">Acción requerida</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Memory Alert */}
                      {(resources.memoryUsagePercent || 0) > 70 && (
                        <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">Alto uso de memoria: {Math.round(resources.memoryUsagePercent || 0)}%</p>
                            <p className="text-xs text-yellow-600">Monitoreo requerido</p>
                          </div>
                        </div>
                      )}
                      
                      {/* System Health */}
                      {health.totalRecords > 0 && (
                        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">Sistema operacional</p>
                            <p className="text-xs text-green-600">{health.totalRecords.toLocaleString()} registros activos</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Default state when no specific alerts and no data */}
                      {!isLoadingStats && 
                       (resources.cpuUsagePercent || 0) <= 70 && 
                       (resources.memoryUsagePercent || 0) <= 70 && (
                        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">Sistema funcionando normalmente</p>
                            <p className="text-xs text-green-600">Todos los servicios operacionales</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo Data Seeding Panel */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-green-600" />
                    <span>Demo Data Seeder</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Comprehensive Demo Data Creation</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Creates "Compañía Demo" with full organizational structure including tenants, 
                      staff, clients, pets, services, rooms, and generates configurable days of realistic appointment data 
                      for deployment demonstrations.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-blue-600 mb-4">
                      <div>• 3 Demo Tenants</div>
                      <div>• 7+ Staff Members</div>
                      <div>• 8+ Clients & Pets</div>
                      <div>• Configurable Days</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                      <h5 className="font-medium text-purple-900 text-sm mb-1">Grooming Data Seeder</h5>
                      <p className="text-xs text-purple-700">
                        Adds 30 completed grooming appointments per day in demo-grooming-1 tenant. 
                        Distributed across 8 fraccionamientos with realistic services, pricing, and payment status. 
                        Ready for VRP delivery route optimization testing.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="demo-days" className="text-sm font-medium text-blue-900">
                          Demo Data Days
                        </Label>
                        <Input
                          id="demo-days"
                          type="number"
                          min="1"
                          max="365"
                          value={demoDays}
                          onChange={(e) => setDemoDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                          className="w-full"
                          data-testid="input-demo-days"
                        />
                        <p className="text-xs text-blue-600">Generate {demoDays} days of appointment data</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="grooming-days" className="text-sm font-medium text-purple-900">
                          Grooming Data Days
                        </Label>
                        <Input
                          id="grooming-days"
                          type="number"
                          min="1"
                          max="30"
                          value={groomingDays}
                          onChange={(e) => setGroomingDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                          className="w-full"
                          data-testid="input-grooming-days"
                        />
                        <p className="text-xs text-purple-600">Generate grooming data for {groomingDays} day(s)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Use this to populate the system with comprehensive demo data for presentations and testing.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ⚠️ This will create or update demo company data. Safe to run multiple times.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => seedDemoDataMutation.mutate(demoDays)}
                        disabled={seedDemoDataMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-seed-demo-data"
                      >
                        {seedDemoDataMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Seeding {demoDays} days...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Seed {demoDays} Days Demo Data
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => seedGroomingTodayMutation.mutate(groomingDays)}
                        disabled={seedGroomingTodayMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-seed-grooming-data"
                      >
                        {seedGroomingTodayMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating {groomingDays} day(s)...
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Seed {groomingDays} Day(s) Grooming
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pet Age Management Panel */}
          <div className="mt-8">
            <SuperAdminPetAgePanel />
          </div>
        </div>
      </main>

      {/* New Company Dialog */}
      <NewCompanyDialog 
        open={showNewCompanyDialog} 
        onOpenChange={setShowNewCompanyDialog} 
      />
    </div>
  );
}
