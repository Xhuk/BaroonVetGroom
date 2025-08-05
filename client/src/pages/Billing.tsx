import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useFastLoad, useFastFetch } from "@/hooks/useFastLoad";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  CreditCard, 
  DollarSign, 
  Receipt, 
  Download, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calculator,
  Phone,
  Calendar
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BillingInvoice, Appointment, Client, Pet } from "@shared/schema";

export default function Billing() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { isInstant } = useFastLoad();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { data: billingInvoices, isLoading } = useFastFetch<BillingInvoice[]>(
    `/api/billing/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const { data: appointments } = useFastFetch<Appointment[]>(
    `/api/appointments/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const { data: clients } = useFastFetch<Client[]>(
    `/api/clients/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const { data: pets } = useFastFetch<Pet[]>(
    `/api/pets/${currentTenant?.id}`,
    !!currentTenant?.id && !isInstant
  );

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/billing`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowPaymentForm(false);
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive",
      });
    },
  });

  const sendPaymentLinkMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest(`/api/billing/send-link`, "POST", { appointmentId });
    },
    onSuccess: () => {
      toast({
        title: "Enlace enviado",
        description: "El enlace de pago se ha enviado al cliente por SMS.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el enlace de pago",
        variant: "destructive",
      });
    },
  });

  // ALWAYS RENDER UI INSTANTLY - No conditional returns!

  const handleCreatePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      appointmentId: selectedAppointment?.id,
      amount: parseFloat(formData.get("amount") as string),
      method: formData.get("method"),
      status: formData.get("status"),
      notes: formData.get("notes"),
      paymentDate: new Date().toISOString(),
    };

    createPaymentMutation.mutate(data);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      case "refunded": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "failed": return <XCircle className="w-4 h-4" />;
      case "refunded": return <Receipt className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "card": return <CreditCard className="w-4 h-4" />;
      case "cash": return <DollarSign className="w-4 h-4" />;
      case "transfer": return <Receipt className="w-4 h-4" />;
      case "stripe": return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const unpaidAppointments = appointments?.filter(apt => 
    apt.status === "completed" && apt.paymentStatus === "pending"
  ) || [];

  const totalRevenue = billingInvoices?.filter(p => p.status === "paid")
    .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0) || 0;

  const pendingPayments = billingInvoices?.filter(p => p.status === "pending") || [];
  const todayPayments = billingInvoices?.filter(p => 
    p.createdAt && new Date(p.createdAt).toDateString() === new Date().toDateString()
  ) || [];

  const filteredPayments = billingInvoices?.filter(invoice => {
    if (paymentFilter === "all") return true;
    return invoice.status === paymentFilter;
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Facturación y Pagos</h1>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Reporte Contable
          </Button>
          <Button 
            onClick={() => setShowPaymentForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pagos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pagos Hoy</p>
                <p className="text-2xl font-bold text-blue-600">{todayPayments.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Citas Sin Pagar</p>
                <p className="text-2xl font-bold text-red-600">{unpaidAppointments.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Nuevo Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="appointmentId">Cita</Label>
                <Select 
                  onValueChange={(value) => {
                    const appointment = appointments?.find(a => a.id === value);
                    setSelectedAppointment(appointment || null);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cita para facturar" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments?.filter(apt => apt.status === "completed").map((appointment) => {
                      const client = clients?.find(c => c.id === appointment.clientId);
                      const pet = pets?.find(p => p.id === appointment.petId);
                      return (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {client?.name} - {pet?.name} ({appointment.scheduledDate})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Monto</Label>
                <Input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  placeholder="0.00"
                  defaultValue={selectedAppointment?.totalCost?.toString() || ""}
                />
              </div>

              <div>
                <Label htmlFor="method">Método de Pago</Label>
                <Select name="method" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado del Pago</Label>
                <Select name="status" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea name="notes" placeholder="Notas adicionales sobre el pago..." />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createPaymentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pago"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedAppointment(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="payments" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="unpaid">Sin Pagar</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>
          
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
              <SelectItem value="refunded">Reembolsados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="payments">
          <div className="space-y-4">
            {filteredPayments.map((invoice) => {
              const appointment = appointments?.find(a => a.id === invoice.appointmentId);
              const client = clients?.find(c => c.id === invoice.clientId);
              const pet = pets?.find(p => p.id === appointment?.petId);

              return (
                <Card key={invoice.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            ${parseFloat(invoice.totalAmount.toString()).toLocaleString()}
                          </h3>
                          <Badge className={getPaymentStatusColor(invoice.status)}>
                            <div className="flex items-center gap-1">
                              {getPaymentStatusIcon(invoice.status)}
                              <span>
                                {invoice.status === "paid" && "Pagado"}
                                {invoice.status === "pending" && "Pendiente"}
                                {invoice.status === "overdue" && "Vencido"}
                                {invoice.status === "cancelled" && "Cancelado"}
                              </span>
                            </div>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Cliente:</span> {client?.name}
                            <br />
                            <span className="font-medium">Mascota:</span> {pet?.name}
                          </div>
                          <div>
                            <span className="font-medium">Fecha:</span> {new Date(invoice.invoiceDate).toLocaleDateString()}
                            <br />
                            <span className="font-medium">Factura:</span> {invoice.invoiceNumber}
                          </div>
                          <div>
                            <span className="font-medium">Cita:</span> {appointment?.scheduledDate}
                            <br />
                            <span className="font-medium">Servicio:</span> {appointment?.type}
                          </div>
                        </div>

                        {invoice.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{invoice.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Receipt className="w-4 h-4 mr-2" />
                          Factura
                        </Button>
                        {invoice.status === "pending" && (
                          <Button variant="outline" size="sm">
                            <Phone className="w-4 h-4 mr-2" />
                            Recordar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredPayments.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
                  <p className="text-gray-500 mb-4">
                    {paymentFilter === "all" 
                      ? "No hay pagos registrados aún"
                      : `No hay pagos con estado: ${paymentFilter}`
                    }
                  </p>
                  {paymentFilter === "all" && (
                    <Button onClick={() => setShowPaymentForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Primer Pago
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="unpaid">
          <div className="space-y-4">
            {unpaidAppointments.map((appointment) => {
              const client = clients?.find(c => c.id === appointment.clientId);
              const pet = pets?.find(p => p.id === appointment.petId);

              return (
                <Card key={appointment.id} className="border-l-4 border-l-red-400">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{client?.name}</h3>
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Pendiente de Pago
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{appointment.scheduledDate}</span>
                          </div>
                          <div>
                            <span className="font-medium">Mascota:</span> {pet?.name} ({pet?.species})
                          </div>
                          <div>
                            <span className="font-medium">Servicio:</span> {appointment.type}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{client?.phone}</span>
                          </div>
                          <div>
                            <span className="font-medium">Monto:</span> ${appointment.totalCost?.toLocaleString() || 0}
                          </div>
                          <div>
                            <span className="font-medium">Días:</span> {
                              Math.floor((new Date().getTime() - new Date(appointment.scheduledDate).getTime()) / (1000 * 60 * 60 * 24))
                            } días
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => sendPaymentLinkMutation.mutate(appointment.id)}
                          disabled={sendPaymentLinkMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Enlace
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowPaymentForm(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {unpaidAppointments.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">¡Excelente!</h3>
                  <p className="text-gray-500">No hay citas pendientes de pago.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Reporte Contable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Ingresos del Mes</h4>
                    <p className="text-2xl font-bold text-green-700">${totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-green-600">
                      {billingInvoices?.filter(p => 
                        p.status === "paid" && 
                        p.createdAt && new Date(p.createdAt).getMonth() === new Date().getMonth()
                      ).length || 0} transacciones
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Pendientes</h4>
                    <p className="text-2xl font-bold text-yellow-700">
                      ${unpaidAppointments.reduce((sum, apt) => sum + parseFloat(apt.totalCost?.toString() || "0"), 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-yellow-600">{unpaidAppointments.length} citas</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Promedio por Cita</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      ${billingInvoices?.length ? Math.round(totalRevenue / billingInvoices.length) : 0}
                    </p>
                    <p className="text-sm text-blue-600">Basado en {billingInvoices?.length || 0} facturas</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Excel
                  </Button>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Reporte PDF
                  </Button>
                  <Button variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar por Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}