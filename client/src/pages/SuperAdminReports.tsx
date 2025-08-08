import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building, 
  BarChart3,
  Download,
  Calendar,
  Loader2,
  FileText,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function SuperAdminReports() {
  const [reportType, setReportType] = useState("revenue");
  const [timeRange, setTimeRange] = useState("30");

  // Fetch dashboard statistics for reports
  const { data: dashboardStats, isLoading } = useQuery<any>({
    queryKey: ['/api/superadmin/dashboard-stats'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch billing data for financial reports
  const { data: billingData } = useQuery<any>({
    queryKey: ['/api/superadmin/billing-usage'],
    refetchInterval: 300000,
  });

  const overview = dashboardStats?.overview || { totalCompanies: 0, totalUsers: 0, totalTenants: 0, totalRevenue: 0 };
  const companies = dashboardStats?.companies || { recent: [], topByRevenue: [] };

  const generateReport = (type: string) => {
    // Logic to generate and download report
    console.log(`Generating ${type} report for last ${timeRange} days`);
  };

  const openBrochure = () => {
    // Open the marketing brochure in a new tab
    window.open('/marketing/brochure.html', '_blank');
  };

  const generateBrochurePDF = () => {
    // Open brochure for PDF generation using current domain
    const brochureUrl = `${window.location.origin}/marketing/brochure.html`;
    window.open(brochureUrl, '_blank');
    
    // Show instructions for PDF generation
    alert('Para generar PDF:\n1. Presiona Ctrl+P (o Cmd+P en Mac)\n2. Selecciona "Guardar como PDF"\n3. Ajusta márgenes a "Mínimo" para mejor resultado');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <BackButton className="mb-4" />
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes del Sistema</h1>
            <p className="text-gray-600">Análisis detallado y reportes de la plataforma veterinaria</p>
          </div>

          {/* Report Controls */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Generador de Reportes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Reporte</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Ingresos y Facturación</SelectItem>
                      <SelectItem value="users">Usuarios y Actividad</SelectItem>
                      <SelectItem value="companies">Empresas y Tenants</SelectItem>
                      <SelectItem value="usage">Uso del Sistema</SelectItem>
                      <SelectItem value="performance">Rendimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 días</SelectItem>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="90">Últimos 3 meses</SelectItem>
                      <SelectItem value="365">Último año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={() => generateReport(reportType)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generar Reporte
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview.totalRevenue?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  +12% vs mes anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalCompanies}</div>
                <p className="text-xs text-muted-foreground">
                  +3 nuevas este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +8% crecimiento mensual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tenants Activos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  Distribución multi-tenant
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Marketing Documents */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Documentos de Marketing y Ventas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Brochure Veterinario</h3>
                      <p className="text-sm text-gray-500">Documento comercial</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Brochure profesional con características VRP, integraciones de pago y módulos del sistema.
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={openBrochure}
                      className="flex-1"
                    >
                      Ver HTML
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={generateBrochurePDF}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      Generar PDF
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg border-dashed border-gray-300 opacity-60">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-600">Propuesta Comercial</h3>
                      <p className="text-sm text-gray-400">Próximamente</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Plantilla de propuesta comercial personalizable para clientes potenciales.
                  </p>
                  <Button size="sm" variant="outline" disabled className="w-full">
                    Próximamente
                  </Button>
                </div>

                <div className="p-4 border rounded-lg border-dashed border-gray-300 opacity-60">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-600">Manual de Usuario</h3>
                      <p className="text-sm text-gray-400">Próximamente</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Documentación técnica y manual de usuario del sistema.
                  </p>
                  <Button size="sm" variant="outline" disabled className="w-full">
                    Próximamente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('financial')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span>Reportes Financieros</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Análisis de ingresos, gastos y facturación por empresa y período.</p>
                <ul className="text-sm space-y-1">
                  <li>• Ingresos por tenant</li>
                  <li>• Análisis de suscripciones</li>
                  <li>• Proyecciones financieras</li>
                  <li>• Gastos operativos</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('operational')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span>Reportes Operativos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Métricas de uso, rendimiento y actividad del sistema.</p>
                <ul className="text-sm space-y-1">
                  <li>• Uso por módulo</li>
                  <li>• Rendimiento del sistema</li>
                  <li>• Actividad de usuarios</li>
                  <li>• Estadísticas de API</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => generateReport('business')}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  <span>Inteligencia de Negocio</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Análisis estratégico y tendencias del mercado veterinario.</p>
                <ul className="text-sm space-y-1">
                  <li>• Crecimiento por región</li>
                  <li>• Retención de clientes</li>
                  <li>• Análisis de churn</li>
                  <li>• Oportunidades de mercado</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Top Empresas por Ingresos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.topByRevenue?.slice(0, 5).map((company: any, index: number) => (
                  <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{company.name}</h3>
                        <p className="text-sm text-gray-500">{company.tenantCount} tenants</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${company.revenue?.toLocaleString() || '0'}</div>
                      <div className="text-sm text-gray-500">este mes</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos de empresas disponibles</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}