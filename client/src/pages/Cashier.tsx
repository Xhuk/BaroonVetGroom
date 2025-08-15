import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Edit3,
  Pill,
  Syringe,
  Shield,
  Heart,
  ShoppingCart,
  X,
  DollarSign
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

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  barcode?: string;
  unitPrice: string | number;
  currentStock: number;
  unit: string;
  isActive: boolean;
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
  const [newItemCategory, setNewItemCategory] = useState("medicine");
  const [newSaleCustomer, setNewSaleCustomer] = useState("");
  const [newSalePhone, setNewSalePhone] = useState("");
  const [showNewSale, setShowNewSale] = useState(false);
  const [currentSaleItems, setCurrentSaleItems] = useState<SaleItem[]>([]);
  
  // Receipt generation states
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState<string>("");
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [pendingCompletionSaleId, setPendingCompletionSaleId] = useState<string | null>(null);
  
  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductSearch(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowProductSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Fetch sales/orders for the tenant
  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", currentTenant?.id],
    queryFn: () => fetch(`/api/sales/${currentTenant?.id}`).then(res => res.json()),
    enabled: !!currentTenant?.id,
  });

  // Fetch inventory items for product search (cached for session)
  const { data: inventoryItems, isLoading: isLoadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory", currentTenant?.id],
    queryFn: () => fetch(`/api/inventory/${currentTenant?.id}`).then(res => res.json()),
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes in cache (TanStack Query v5)
  });

  // Smart product search with fuzzy matching
  const filteredProducts = useMemo(() => {
    if (!inventoryItems || !productSearchQuery.trim()) return [];
    
    const query = productSearchQuery.toLowerCase().trim();
    return (inventoryItems as InventoryItem[])
      .filter((item: InventoryItem) => item.isActive && item.currentStock > 0)
      .filter((item: InventoryItem) => 
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query))
      )
      .slice(0, 8); // Limit to 8 results for performance
  }, [inventoryItems, productSearchQuery]);

  // Add product from search to current sale
  const addProductFromSearch = useCallback((product: InventoryItem, quantity: number = 1) => {
    const unitPrice = typeof product.unitPrice === 'string' ? parseFloat(product.unitPrice) : product.unitPrice;
    const newItem: SaleItem = {
      id: `product-${Date.now()}`,
      name: product.name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      delivered: false,
      category: product.category
    };

    setCurrentSaleItems(prev => [...prev, newItem]);
    setProductSearchQuery("");
    setShowProductSearch(false);
    setSelectedProduct(null);
    
    toast({
      title: "Producto Agregado",
      description: `${product.name} (${quantity} ${product.unit}) agregado a la venta`,
    });
  }, [toast]);

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

  // Generate receipt mutation
  const generateReceiptMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest(`/api/sales/${saleId}/generate-receipt`, "POST", {});
    },
    onSuccess: (data) => {
      setReceiptHtml(data.receiptHtml);
      setShowReceiptPreview(true);
      setIsGeneratingReceipt(false);
    },
    onError: (error) => {
      setIsGeneratingReceipt(false);
      toast({
        title: "Error",
        description: "No se pudo generar la factura",
        variant: "destructive",
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
      setPendingCompletionSaleId(null);
      setShowReceiptPreview(false);
      setReceiptHtml("");
      toast({
        title: "Entrega Completada",
        description: "Todos los productos han sido entregados y la factura ha sido generada",
      });
    },
  });

  // Check for pending follow-ups before invoice generation
  const checkFollowUpsValidation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await apiRequest(`/api/follow-up-validation/vetgroom1/${appointmentId}`, "GET");
      return response.json();
    },
    onSuccess: (data, appointmentId) => {
      if (data.canGenerateInvoice) {
        // No pending follow-ups, proceed with receipt generation
        const saleId = appointmentId; // Assuming appointmentId maps to saleId for this demo
        setPendingCompletionSaleId(saleId);
        setIsGeneratingReceipt(true);
        generateReceiptMutation.mutate(saleId);
      } else {
        // Block invoice generation due to pending follow-ups
        toast({
          title: "Factura Bloqueada",
          description: data.blockingMessage,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error de Validación",
        description: "No se pudo validar los seguimientos pendientes",
        variant: "destructive",
      });
    }
  });

  // Handle completion with receipt generation
  const handleCompleteWithReceipt = (saleId: string) => {
    // First check for pending follow-ups
    checkFollowUpsValidation.mutate(saleId);
  };

  // Confirm completion after receipt preview
  const confirmCompletion = () => {
    if (pendingCompletionSaleId) {
      completeDeliveryMutation.mutate(pendingCompletionSaleId);
    }
  };

  // Download receipt as PDF (basic implementation)
  const downloadReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

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

  // Create new sale
  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = currentSaleItems.reduce((sum, item) => 
        sum + (parseFloat(item.unitPrice.toString()) * item.quantity), 0
      );

      return apiRequest(`/api/sales/${currentTenant?.id}`, "POST", {
        customerName: newSaleCustomer,
        customerPhone: newSalePhone,
        items: currentSaleItems,
        totalAmount,
        paymentStatus: 'pending',
        deliveryStatus: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setNewSaleCustomer("");
      setNewSalePhone("");
      setCurrentSaleItems([]);
      setShowNewSale(false);
      toast({
        title: "Venta Creada",
        description: "La nueva venta ha sido registrada exitosamente",
      });
    },
  });

  // Add item to current sale
  const addItemToCurrentSale = () => {
    if (!newItemName || !newItemPrice || !newItemQuantity) return;

    const newItem: SaleItem = {
      id: `temp-${Date.now()}`,
      name: newItemName,
      quantity: parseInt(newItemQuantity),
      unitPrice: parseFloat(newItemPrice),
      total: parseInt(newItemQuantity) * parseFloat(newItemPrice),
      delivered: false,
      category: newItemCategory
    };

    setCurrentSaleItems([...currentSaleItems, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQuantity("1");
    setNewItemCategory("medicine");
  };

  const removeItemFromCurrentSale = (index: number) => {
    setCurrentSaleItems(currentSaleItems.filter((_, i) => i !== index));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medicine': return <Pill className="h-4 w-4" />;
      case 'vaccine': return <Syringe className="h-4 w-4" />;
      case 'deworming': return <Shield className="h-4 w-4" />;
      case 'accessory': return <Package className="h-4 w-4" />;
      case 'service': return <Heart className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medicine': return 'bg-blue-100 text-blue-800';
      case 'vaccine': return 'bg-green-100 text-green-800';
      case 'deworming': return 'bg-purple-100 text-purple-800';
      case 'accessory': return 'bg-orange-100 text-orange-800';
      case 'service': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Caja y Entrega</h1>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setShowNewSale(true)}
            className="flex items-center gap-2"
            data-testid="button-new-sale"
          >
            <ShoppingCart className="h-4 w-4" />
            Nueva Venta
          </Button>
          <div className="text-sm text-gray-600">
            {pendingSales.length} entregas pendientes
          </div>
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
                      <div>
                        <label className="text-sm font-medium">Categoría</label>
                        <select
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value)}
                          className="w-full p-2 border rounded-md"
                          data-testid="select-add-item-category"
                        >
                          <option value="medicine">Medicina</option>
                          <option value="vaccine">Vacuna</option>
                          <option value="deworming">Desparasitante</option>
                          <option value="accessory">Accesorio</option>
                          <option value="service">Servicio</option>
                          <option value="supply">Insumo</option>
                          <option value="equipment">Equipo</option>
                          <option value="food">Alimento</option>
                        </select>
                      </div>
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
                        <Plus className="h-4 w-4 mr-2" />
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
                    onClick={() => handleCompleteWithReceipt(selectedSale.id)}
                    disabled={isGeneratingReceipt || completeDeliveryMutation.isPending || selectedSale.paymentStatus === 'pending'}
                    data-testid="button-complete-delivery"
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isGeneratingReceipt ? "Generando Factura..." : 
                     completeDeliveryMutation.isPending ? "Completando..." : 
                     "Generar Factura y Completar"}
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

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vista Previa de Factura</h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={downloadReceipt}
                    data-testid="button-download-receipt"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Descargar/Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReceiptPreview(false);
                      setPendingCompletionSaleId(null);
                      setReceiptHtml("");
                    }}
                    data-testid="button-cancel-receipt"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmCompletion}
                    disabled={completeDeliveryMutation.isPending}
                    data-testid="button-confirm-completion"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {completeDeliveryMutation.isPending ? "Finalizando..." : "Confirmar y Finalizar"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div 
                  className="bg-white rounded-lg shadow-lg"
                  dangerouslySetInnerHTML={{ __html: receiptHtml }}
                  style={{ 
                    transform: 'scale(0.8)',
                    transformOrigin: 'top center',
                    marginBottom: '-20%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {showNewSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-new-sale">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Nueva Venta</h2>
              <Button variant="ghost" onClick={() => setShowNewSale(false)} data-testid="button-close-modal">×</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nombre del Cliente *</label>
                    <Input
                      value={newSaleCustomer}
                      onChange={(e) => setNewSaleCustomer(e.target.value)}
                      placeholder="Ej: María González"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      value={newSalePhone}
                      onChange={(e) => setNewSalePhone(e.target.value)}
                      placeholder="Ej: +525512345678"
                      data-testid="input-customer-phone"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Add Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      data-testid="select-item-category"
                    >
                      <option value="medicine">Medicina</option>
                      <option value="vaccine">Vacuna</option>
                      <option value="deworming">Desparasitante</option>
                      <option value="accessory">Accesorio</option>
                      <option value="service">Servicio</option>
                      <option value="supply">Insumo</option>
                      <option value="equipment">Equipo</option>
                      <option value="food">Alimento</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Buscar Producto *</label>
                    <div className="relative" ref={searchRef}>
                      <Input
                        value={productSearchQuery}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value);
                          setShowProductSearch(true);
                        }}
                        onFocus={() => setShowProductSearch(true)}
                        placeholder="Buscar por nombre, categoría, SKU..."
                        data-testid="input-product-search"
                      />
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      
                      {/* Product Search Results */}
                      {showProductSearch && productSearchQuery.trim() && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                          {filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setNewItemName(product.name);
                                setNewItemPrice(product.unitPrice.toString());
                                setNewItemCategory(product.category);
                                setProductSearchQuery(product.name);
                                setShowProductSearch(false);
                              }}
                              data-testid={`product-option-${product.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{product.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {product.category} • Stock: {product.currentStock} {product.unit}
                                    {product.sku && ` • SKU: ${product.sku}`}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                  ${typeof product.unitPrice === 'string' ? parseFloat(product.unitPrice).toFixed(2) : product.unitPrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Loading indicator */}
                      {isLoadingInventory && productSearchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3 text-center text-sm text-gray-500">
                          Cargando productos...
                        </div>
                      )}
                      
                      {/* No results */}
                      {showProductSearch && productSearchQuery.trim() && filteredProducts.length === 0 && !isLoadingInventory && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3 text-center text-sm text-gray-500">
                          No se encontraron productos
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Manual product name input (fallback) */}
                  <div>
                    <label className="text-sm font-medium">O escribir nombre manualmente</label>
                    <Input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ej: Producto personalizado"
                      data-testid="input-item-name-manual"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Cantidad</label>
                      <Input
                        type="number"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        placeholder="1"
                        min="1"
                        data-testid="input-item-quantity"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Precio Unitario</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="150.00"
                        data-testid="input-item-price"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={addItemToCurrentSale}
                    disabled={!newItemName || !newItemPrice || !newItemQuantity}
                    className="w-full"
                    data-testid="button-add-item-to-sale"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Current Sale Items */}
            {currentSaleItems.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Productos en la Venta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {currentSaleItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${getCategoryColor(item.category)}`}>
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              {item.quantity} × ${parseFloat(item.unitPrice.toString()).toFixed(2)} = ${parseFloat(item.total.toString()).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemFromCurrentSale(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total de la Venta:</span>
                    <span>${currentSaleItems.reduce((sum, item) => sum + parseFloat(item.total.toString()), 0).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewSale(false)} data-testid="button-cancel-sale">
                Cancelar
              </Button>
              <Button
                onClick={() => createSaleMutation.mutate()}
                disabled={!newSaleCustomer || currentSaleItems.length === 0 || createSaleMutation.isPending}
                data-testid="button-create-sale"
              >
                {createSaleMutation.isPending ? "Creando..." : "Crear Venta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}