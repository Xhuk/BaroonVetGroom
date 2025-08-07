import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  Clock,
  User,
  CreditCard,
  Truck,
  Edit3
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { apiRequest } from "@/lib/queryClient";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string | number; // Handle both string and number from DB
  total: string | number; // Handle both string and number from DB
  delivered: boolean;
  category: string;
}

interface Sale {
  id: string;
  receiptId: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  totalAmount: string | number; // Handle both string and number from DB
  paymentStatus: 'paid' | 'pending' | 'partial';
  deliveryStatus: 'pending' | 'partial' | 'delivered';
  createdAt: string;
  deliveredAt?: string;
  deliveredBy?: string;
  notes?: string;
}

export default function Cashier() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showAddItems, setShowAddItems] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  // Fetch sales/orders for the tenant
  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", currentTenant?.id],
    queryFn: () => fetch(`/api/sales/${currentTenant?.id}`).then(res => res.json()),
    enabled: !!currentTenant?.id,
  });

  // Search for specific sale by receipt ID or customer
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const foundSale = sales?.find(sale => 
      sale.receiptId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerPhone.includes(searchQuery)
    );
    
    if (foundSale) {
      setSelectedSale(foundSale);
      toast({
        title: "Venta Encontrada",
        description: `Pedido de ${foundSale.customerName} cargado`,
      });
    } else {
      toast({
        title: "No Encontrado",
        description: "No se encontró ninguna venta con esos datos",
        variant: "destructive",
      });
    }
  };

  // Mark item as delivered
  const deliverItemMutation = useMutation({
    mutationFn: async ({ saleId, itemId }: { saleId: string; itemId: string }) => {
      return apiRequest(`/api/sales/${saleId}/items/${itemId}/deliver`, "PATCH", { 
        deliveredAt: new Date().toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Producto Entregado",
        description: "El producto ha sido marcado como entregado",
      });
    },
  });

  // Complete delivery for entire order
  const completeDeliveryMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest(`/api/sales/${saleId}/complete-delivery`, "PATCH", { 
        deliveredAt: new Date().toISOString(),
        notes: deliveryNotes 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSelectedSale(null);
      setDeliveryNotes("");
      toast({
        title: "Entrega Completada",
        description: "Todos los productos han sido entregados",
      });
    },
  });

  // Add additional item to order
  const addItemMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest(`/api/sales/${saleId}/add-item`, "POST", {
        name: newItemName,
        quantity: parseInt(newItemQuantity),
        unitPrice: parseFloat(newItemPrice),
        total: parseInt(newItemQuantity) * parseFloat(newItemPrice),
        category: "additional"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setNewItemName("");
      setNewItemPrice("");
      setNewItemQuantity("1");
      setShowAddItems(false);
      toast({
        title: "Producto Agregado",
        description: "Se agregó el producto adicional al pedido",
      });
    },
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const pendingSales = sales?.filter(sale => sale.deliveryStatus !== 'delivered') || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Caja y Entrega</h1>
        <div className="text-sm text-gray-600">
          {pendingSales.length} entregas pendientes
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Venta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Ingresa ID de recibo, nombre del cliente o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-search-sale"
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              data-testid="button-search"
              disabled={!searchQuery.trim()}
            >
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Entregas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div>Cargando ventas...</div>
              ) : pendingSales.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No hay entregas pendientes
                </div>
              ) : (
                pendingSales.map((sale) => (
                  <div 
                    key={sale.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedSale(sale)}
                    data-testid={`card-sale-${sale.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{sale.receiptId}</div>
                      <div className="flex gap-2">
                        <Badge className={getPaymentStatusColor(sale.paymentStatus)}>
                          {sale.paymentStatus === 'paid' ? 'Pagado' : 
                           sale.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                        </Badge>
                        <Badge className={getDeliveryStatusColor(sale.deliveryStatus)}>
                          {sale.deliveryStatus === 'delivered' ? 'Entregado' : 
                           sale.deliveryStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        {sale.customerName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {sale.items.length} productos - ${typeof sale.totalAmount === 'string' ? parseFloat(sale.totalAmount).toFixed(2) : sale.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sale Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedSale ? `Pedido ${selectedSale.receiptId}` : "Selecciona una Venta"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSale ? (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedSale.customerName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Teléfono: {selectedSale.customerPhone}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <Badge className={getPaymentStatusColor(selectedSale.paymentStatus)}>
                      <CreditCard className="h-3 w-3 mr-1" />
                      {selectedSale.paymentStatus === 'paid' ? 'Pagado' : 
                       selectedSale.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                    </Badge>
                    <Badge className={getDeliveryStatusColor(selectedSale.deliveryStatus)}>
                      <Truck className="h-3 w-3 mr-1" />
                      {selectedSale.deliveryStatus === 'delivered' ? 'Entregado' : 
                       selectedSale.deliveryStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>

                {/* Payment Warning */}
                {selectedSale.paymentStatus !== 'paid' && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">
                      Advertencia: Esta venta tiene pago pendiente
                    </span>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                  <h3 className="font-medium">Productos a Entregar:</h3>
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Cantidad: {item.quantity} | Precio: ${typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice).toFixed(2) : item.unitPrice.toFixed(2)} | Total: ${typeof item.total === 'string' ? parseFloat(item.total).toFixed(2) : item.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.delivered ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Entregado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => deliverItemMutation.mutate({ 
                              saleId: selectedSale.id, 
                              itemId: item.id 
                            })}
                            data-testid={`button-deliver-item-${index}`}
                            disabled={deliverItemMutation.isPending}
                          >
                            Entregar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Items Section */}
                <Separator />
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddItems(!showAddItems)}
                    data-testid="button-add-items"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Productos Adicionales
                  </Button>

                  {showAddItems && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Input
                        placeholder="Nombre del producto"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        data-testid="input-new-item-name"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(e.target.value)}
                          data-testid="input-new-item-quantity"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Precio unitario"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          data-testid="input-new-item-price"
                        />
                      </div>
                      <Button
                        onClick={() => addItemMutation.mutate(selectedSale.id)}
                        disabled={!newItemName || !newItemPrice || addItemMutation.isPending}
                        data-testid="button-confirm-add-item"
                        className="w-full"
                      >
                        Agregar Producto
                      </Button>
                    </div>
                  )}
                </div>

                {/* Delivery Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notas de Entrega (Opcional):</label>
                  <Textarea
                    placeholder="Agregar notas sobre la entrega..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    data-testid="textarea-delivery-notes"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => completeDeliveryMutation.mutate(selectedSale.id)}
                    disabled={completeDeliveryMutation.isPending || selectedSale.paymentStatus === 'pending'}
                    data-testid="button-complete-delivery"
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar Entrega
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSale(null)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Delivery Info */}
                {selectedSale.deliveredAt && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <div className="font-medium text-green-800">Entregado el:</div>
                    <div className="text-green-600">
                      {new Date(selectedSale.deliveredAt).toLocaleString()}
                      {selectedSale.deliveredBy && ` por ${selectedSale.deliveredBy}`}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una venta de la lista o busca por ID de recibo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}