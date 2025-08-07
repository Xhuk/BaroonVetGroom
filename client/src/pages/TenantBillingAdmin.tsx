import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { useTenant } from "@/contexts/TenantContext";
import { Download, DollarSign, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BillingSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  outstandingInvoices: number;
  totalTransactions: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    clientName: string;
    petName: string;
    service: string;
    amount: number;
    status: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function TenantBillingAdmin() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  const { data: billingSummary, isLoading } = useQuery({
    queryKey: [`/api/billing/summary/${tenant?.id}`, selectedPeriod],
    enabled: !!tenant?.id,
  });

  const exportToExcel = useMutation({
    mutationFn: async (params: { tenantId: string; period: string; format: string }) => {
      const response = await fetch(`/api/billing/export/${params.tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: params.period, format: params.format }),
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-report-${params.period}-${Date.now()}.${params.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!tenant?.id) return;
    exportToExcel.mutate({
      tenantId: tenant.id,
      period: selectedPeriod,
      format
    });
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Panel de Facturación
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona los reportes financieros de tu clínica
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleExport('xlsx')}
              disabled={exportToExcel.isPending}
              className="flex items-center gap-2"
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={exportToExcel.isPending}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Subscription Status */}
        {tenant?.companyId && (
          <SubscriptionStatus companyId={tenant.companyId} />
        )}

        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: 'current_month', label: 'Mes Actual' },
            { value: 'last_month', label: 'Mes Anterior' },
            { value: 'quarter', label: 'Trimestre' },
            { value: 'year', label: 'Año' },
          ].map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period.value)}
              data-testid={`button-period-${period.value}`}
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                ${billingSummary?.totalRevenue?.toLocaleString('es-MX') || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% respecto al mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-monthly-revenue">
                ${billingSummary?.monthlyRevenue?.toLocaleString('es-MX') || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'MMMM yyyy', { locale: es })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-outstanding-invoices">
                {billingSummary?.outstandingInvoices || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren seguimiento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-transactions">
                {billingSummary?.totalTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                En el período seleccionado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>
              Últimas ventas y servicios facturados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingSummary?.recentTransactions?.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {transaction.clientName} - {transaction.petName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.service}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      ${transaction.amount.toLocaleString('es-MX')}
                    </div>
                    <Badge 
                      variant={transaction.status === 'paid' ? 'default' : 'secondary'}
                      data-testid={`status-${transaction.status}`}
                    >
                      {transaction.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No hay transacciones en el período seleccionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Mes</CardTitle>
            <CardDescription>
              Tendencia de ingresos en los últimos 12 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded">
              <p className="text-gray-500">Gráfico de ingresos (próximamente)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}