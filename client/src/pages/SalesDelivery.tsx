import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Receipt, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ExternalLink,
  Truck,
  Phone,
  MapPin
} from "lucide-react";

interface SaleOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    type: 'product' | 'medicine';
  }>;
  totalAmount: number;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  paymentMethod?: 'credit' | 'cash' | 'gateway';
  paymentLink?: string;
  receiptLink?: string;
  deliveryStatus: 'pending' | 'in_transit' | 'delivered' | 'confirmed';
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentGateway {
  enabled: boolean;
  provider: string;
  publicKey?: string;
  webhookUrl?: string;
}

export default function SalesDelivery() {
  const { isAuthenticated } = useAuth();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Fetch sales orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<SaleOrder[]>({
    queryKey: ["/api/sales-orders", currentTenant?.id],
    enabled: !!currentTenant?.id && isAuthenticated,
    staleTime: 30 * 1000,
  });

  // Fetch payment gateway configuration
  const { data: paymentGateway } = useQuery<PaymentGateway>({
    queryKey: ["/api/payment-gateway/config", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  // Create payment link mutation
  const createPaymentLinkMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/sales-orders/${orderId}/payment-link`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Enlace de pago creado",
        description: "El enlace de pago ha sido generado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el enlace de pago.",
        variant: "destructive",
      });
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ orderId, method }: { orderId: string; method: string }) => {
      const response = await apiRequest("POST", `/api/sales-orders/${orderId}/confirm-payment`, {
        paymentMethod: method,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pago confirmado",
        description: "El pago ha sido confirmado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago.",
        variant: "destructive",
      });
    },
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/sales-orders/${orderId}/confirm-delivery`, {
        deliveryNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entrega confirmada",
        description: "La entrega ha sido confirmada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setDeliveryNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo confirmar la entrega.",
        variant: "destructive",
      });
    },
  });

  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-blue-600 text-white"><Truck className="w-3 h-3 mr-1" />Entregado</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case 'in_transit':
        return <Badge className="bg-yellow-600 text-white"><Clock className="w-3 h-3 mr-1" />En tránsito</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const handleCreatePaymentLink = () => {
    if (selectedOrderId) {
      createPaymentLinkMutation.mutate(selectedOrderId);
    }
  };

  const handleConfirmPayment = () => {
    if (selectedOrderId && paymentMethod) {
      confirmPaymentMutation.mutate({ orderId: selectedOrderId, method: paymentMethod });
    }
  };

  const handleConfirmDelivery = () => {
    if (selectedOrderId) {
      confirmDeliveryMutation.mutate({ orderId: selectedOrderId, notes: deliveryNotes });
    }
  };

  const generateWhatsAppMessage = (order: SaleOrder) => {
    if (order.paymentStatus === 'confirmed' && order.receiptLink) {
      return `Gracias por tu compra. Aquí está tu recibo: ${order.receiptLink}\n¿Puedes confirmar que recibiste tu producto/medicina?`;
    } else if (order.paymentLink) {
      return `Para poder entregar tu producto/medicina, realiza el pago aquí: ${order.paymentLink}\nUna vez realizado, por favor confirma tu pago.`;
    }
    return `Hola ${order.customerName}, tu pedido está en proceso. Te contactaremos pronto con los detalles de pago y entrega.`;
  };

  const sendWhatsAppMessage = (order: SaleOrder) => {
    if (order.customerPhone) {
      const message = generateWhatsAppMessage(order);
      const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast({
        title: "Número no disponible",
        description: "El cliente no tiene un número de teléfono registrado.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <ResponsiveLayout>
        <Card>
          <CardContent className="pt-6">
            <p>Debes iniciar sesión para acceder a esta página.</p>
          </CardContent>
        </Card>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Entrega de Venta</h1>
          <Badge variant="outline" className="text-sm">
            {orders.length} pedidos activos
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Seleccionar Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ordersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay pedidos disponibles.
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrderId === order.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{order.customerName}</h3>
                        <div className="flex gap-2">
                          {getPaymentStatusBadge(order.paymentStatus)}
                          {getDeliveryStatusBadge(order.deliveryStatus)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>${order.totalAmount.toFixed(2)}</span>
                        <span>{order.items.length} artículos</span>
                      </div>
                      
                      {order.customerPhone && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {order.customerPhone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details and Actions */}
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Gestión de Pago y Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Details */}
                <div className="space-y-3">
                  <h3 className="font-medium">Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">${selectedOrder.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado de Pago:</span>
                      {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado de Entrega:</span>
                      {getDeliveryStatusBadge(selectedOrder.deliveryStatus)}
                    </div>
                  </div>
                  
                  {selectedOrder.customerAddress && (
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Dirección de entrega</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.customerAddress}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Management */}
                <div className="space-y-4">
                  <h3 className="font-medium">Gestión de Pago</h3>
                  
                  {selectedOrder.paymentStatus === 'confirmed' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">Pago confirmado</span>
                      </div>
                      
                      {selectedOrder.receiptLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedOrder.receiptLink, '_blank')}
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Recibo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentGateway?.enabled ? (
                        <div className="space-y-3">
                          {selectedOrder.paymentLink ? (
                            <Button
                              variant="outline"
                              onClick={() => window.open(selectedOrder.paymentLink, '_blank')}
                              className="w-full"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir Enlace de Pago
                            </Button>
                          ) : (
                            <Button
                              onClick={handleCreatePaymentLink}
                              disabled={createPaymentLinkMutation.isPending}
                              className="w-full"
                            >
                              {createPaymentLinkMutation.isPending ? "Generando..." : "Generar Enlace de Pago"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Label htmlFor="payment-method">Método de Pago Manual</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar método" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit">Tarjeta de Crédito</SelectItem>
                              <SelectItem value="cash">Efectivo</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            onClick={handleConfirmPayment}
                            disabled={!paymentMethod || confirmPaymentMutation.isPending}
                            className="w-full"
                          >
                            {confirmPaymentMutation.isPending ? "Confirmando..." : "Confirmar Pago"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Management */}
                {selectedOrder.paymentStatus === 'confirmed' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="font-medium">Gestión de Entrega</h3>
                      
                      {selectedOrder.deliveryStatus === 'confirmed' ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">Entrega confirmada por el cliente</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Label htmlFor="delivery-notes">Notas de entrega (opcional)</Label>
                          <Textarea
                            id="delivery-notes"
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Ej: Entregado en persona, paquete en buen estado..."
                            rows={3}
                          />
                          
                          <Button
                            onClick={handleConfirmDelivery}
                            disabled={confirmDeliveryMutation.isPending}
                            className="w-full"
                          >
                            {confirmDeliveryMutation.isPending ? "Confirmando..." : "Confirmar Entrega"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* WhatsApp Communication */}
                {selectedOrder.customerPhone && (
                  <>
                    <Separator />
                    
                    <div className="space-y-3">
                      <h3 className="font-medium">Comunicación con Cliente</h3>
                      
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Mensaje sugerido:</p>
                        <p className="text-sm text-muted-foreground italic">
                          {generateWhatsAppMessage(selectedOrder)}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => sendWhatsAppMessage(selectedOrder)}
                        className="w-full"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Enviar por WhatsApp
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un pedido para gestionar el pago y entrega</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}