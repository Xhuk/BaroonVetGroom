import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, DollarSign, CreditCard, Smartphone, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BillingQueue } from "@shared/schema";

const paymentSchema = z.object({
  paymentMethod: z.enum(["cash", "payment_link"]),
  paymentGateway: z.enum(["stripe", "mercadopago"]).optional(),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export default function Facturacion() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<BillingQueue | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: billingQueue = [], isLoading } = useQuery({
    queryKey: ["/api/billing-queue", currentTenant?.id],
    enabled: !!currentTenant,
  });

  const { data: paymentGateways = [] } = useQuery({
    queryKey: ["/api/admin/payment-gateways", currentTenant?.companyId, currentTenant?.id],
    enabled: !!currentTenant,
  });

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "cash",
    },
  });

  const processMutation = useMutation({
    mutationFn: async (data: PaymentForm) => {
      if (!selectedItem) throw new Error("No item selected");
      
      const payload = {
        ...data,
        status: data.paymentMethod === "cash" ? "paid_cash" : "processing",
      };
      
      return apiRequest("PUT", `/api/billing-queue/${selectedItem.id}/process`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-queue"] });
      setShowPaymentDialog(false);
      setSelectedItem(null);
      form.reset();
      
      if (data.paymentMethod === "payment_link" && data.paymentLinkUrl) {
        toast({
          title: "Enlace de pago generado",
          description: "El enlace se ha copiado al portapapeles.",
        });
        // Copy payment link to clipboard
        navigator.clipboard.writeText(data.paymentLinkUrl);
      } else {
        toast({
          title: "Pago procesado",
          description: "El pago en efectivo se registró correctamente.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcessPayment = (item: BillingQueue) => {
    setSelectedItem(item);
    form.reset();
    setShowPaymentDialog(true);
  };

  const onSubmit = (data: PaymentForm) => {
    processMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "processing":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "paid_cash":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "paid_link":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "processing":
        return "Procesando";
      case "paid_cash":
        return "Pagado (Efectivo)";
      case "paid_link":
        return "Pagado (Enlace)";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "outline" as const;
      case "processing":
        return "default" as const;
      case "paid_cash":
      case "paid_link":
        return "secondary" as const;
      case "cancelled":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (!currentTenant) {
    return <div data-testid="loading-tenant">Cargando información del tenant...</div>;
  }

  const pendingItems = billingQueue.filter((item: BillingQueue) => item.status === "pending");
  const processingItems = billingQueue.filter((item: BillingQueue) => ["processing", "paid_cash", "paid_link"].includes(item.status || ""));

  return (
    <div className="container mx-auto py-8 space-y-6" data-testid="page-facturacion">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="w-8 h-8" />
            Facturación
          </h1>
          <p className="text-muted-foreground">
            Cola de facturación para procesar pagos en efectivo o generar enlaces de pago
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span>{pendingItems.length} pendientes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>{processingItems.length} procesados</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Pagos Pendientes
              </h2>
              <div className="grid gap-4">
                {pendingItems.map((item: BillingQueue) => (
                  <Card key={item.id} className="border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{item.description}</CardTitle>
                          <CardDescription>
                            Cliente: {(item as any).client?.name || 'Cliente no encontrado'} • 
                            Fecha: {new Date(item.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${parseFloat(item.amount).toFixed(2)}</div>
                          <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {item.groomingRecordId && "Servicio de grooming"}
                          {item.medicalRecordId && "Consulta médica"}
                          {item.invoiceId && "Factura"}
                        </div>
                        <Button
                          onClick={() => handleProcessPayment(item)}
                          data-testid={`button-process-${item.id}`}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Procesar Pago
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {processingItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Pagos Procesados
              </h2>
              <div className="grid gap-4">
                {processingItems.map((item: BillingQueue) => (
                  <Card key={item.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{item.description}</CardTitle>
                          <CardDescription>
                            Cliente: {(item as any).client?.name || 'Cliente no encontrado'} • 
                            Procesado: {item.processedAt ? new Date(item.processedAt).toLocaleDateString() : 'N/A'}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${parseFloat(item.amount).toFixed(2)}</div>
                          <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {item.paymentLinkUrl && (
                      <CardContent>
                        <div className="text-sm">
                          <Label>Enlace de pago:</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={item.paymentLinkUrl}
                              readOnly
                              className="text-xs"
                              data-testid={`payment-link-${item.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(item.paymentLinkUrl!);
                                toast({ title: "Enlace copiado", description: "El enlace se copió al portapapeles." });
                              }}
                              data-testid={`button-copy-link-${item.id}`}
                            >
                              Copiar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {billingQueue.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pagos pendientes</h3>
                <p className="text-muted-foreground text-center">
                  Los pagos pendientes aparecerán aquí cuando se confirmen los servicios.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedItem.description}</h3>
                <p className="text-sm text-muted-foreground">
                  Cliente: {(selectedItem as any).client?.name || 'Cliente no encontrado'}
                </p>
                <p className="text-xl font-bold mt-2">${parseFloat(selectedItem.amount).toFixed(2)}</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="payment_link">Enlace de Pago</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("paymentMethod") === "payment_link" && (
                    <FormField
                      control={form.control}
                      name="paymentGateway"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pasarela de Pago</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-gateway">
                                <SelectValue placeholder="Selecciona una pasarela" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentGateways
                                .filter((gw: any) => gw.isActive)
                                .map((gateway: any) => (
                                  <SelectItem key={gateway.id} value={gateway.gatewayType}>
                                    {gateway.gatewayType === 'stripe' ? 'Stripe' : 'MercadoPago'}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas adicionales sobre el pago..."
                            {...field}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPaymentDialog(false)}
                      data-testid="button-cancel-payment"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={processMutation.isPending}
                      data-testid="button-process-payment"
                    >
                      {processMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Procesando...
                        </>
                      ) : (
                        form.watch("paymentMethod") === "cash" ? (
                          <>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Confirmar Efectivo
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" />
                            Generar Enlace
                          </>
                        )
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}