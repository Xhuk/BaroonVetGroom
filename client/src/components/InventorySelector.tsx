import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Package, Search } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

interface InventoryUsageItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

interface InventorySelectorProps {
  selectedItems: InventoryUsageItem[];
  onItemsChange: (items: InventoryUsageItem[]) => void;
  title?: string;
  description?: string;
}

export function InventorySelector({ 
  selectedItems, 
  onItemsChange, 
  title = "Inventario Utilizado",
  description = "Selecciona los productos, medicamentos y suministros utilizados"
}: InventorySelectorProps) {
  const { currentTenant } = useTenant();
  const [showSelector, setShowSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory", currentTenant?.id],
    enabled: !!currentTenant?.id,
  });

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const notAlreadySelected = !selectedItems.find(selected => selected.itemId === item.id);
    return matchesSearch && matchesCategory && notAlreadySelected && (item.currentStock || 0) > 0;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medication": return "💊";
      case "supplies": return "🏥";
      case "food": return "🥘";
      case "accessories": return "🎀";
      default: return "📦";
    }
  };

  const addItem = (item: InventoryItem, quantity: number = 1) => {
    const newItem: InventoryUsageItem = {
      itemId: item.id,
      itemName: item.name,
      quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: quantity * parseFloat(item.unitPrice.toString()),
      category: item.category
    };
    
    onItemsChange([...selectedItems, newItem]);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const updatedItems = selectedItems.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    );
    onItemsChange(updatedItems);
  };

  const removeItem = (itemId: string) => {
    onItemsChange(selectedItems.filter(item => item.itemId !== itemId));
  };

  const totalCost = selectedItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getCategoryIcon(item.category)}</span>
                  <div>
                    <p className="font-medium">{item.itemName}</p>
                    <p className="text-sm text-gray-500">
                      ${item.unitPrice.toFixed(2)} c/u
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(item.itemId, parseInt(e.target.value) || 1)}
                    className="w-16 text-center"
                    data-testid={`input-quantity-${item.itemId}`}
                  />
                  <span className="font-medium text-green-600 min-w-[80px] text-right">
                    ${item.total.toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.itemId)}
                    data-testid={`button-remove-${item.itemId}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total Suministros:</span>
              <span className="font-bold text-green-600">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Add Item Button */}
        <Dialog open={showSelector} onOpenChange={setShowSelector}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-add-inventory">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto/Suministro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Seleccionar Inventario</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="medication">Medicamentos</SelectItem>
                    <SelectItem value="supplies">Suministros</SelectItem>
                    <SelectItem value="food">Alimentos</SelectItem>
                    <SelectItem value="accessories">Accesorios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Available Items */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <Card key={item.id} className="cursor-pointer hover:bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{getCategoryIcon(item.category)}</span>
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-500">
                                Stock: {item.currentStock} • ${parseFloat(item.unitPrice.toString()).toFixed(2)} c/u
                              </p>
                              {item.sku && (
                                <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="1"
                              max={item.currentStock ?? 0}
                              placeholder="Qty"
                              className="w-16 text-center"
                              data-testid={`input-add-quantity-${item.id}`}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const quantity = parseInt((e.target as HTMLInputElement).value) || 1;
                                  addItem(item, Math.min(quantity, item.currentStock ?? 0));
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const quantityInput = document.querySelector(`[data-testid="input-add-quantity-${item.id}"]`) as HTMLInputElement;
                                const quantity = parseInt(quantityInput?.value) || 1;
                                addItem(item, Math.min(quantity, item.currentStock ?? 0));
                                if (quantityInput) quantityInput.value = '';
                              }}
                              data-testid={`button-add-item-${item.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm || categoryFilter !== "all" 
                        ? "No se encontraron productos"
                        : "No hay inventario disponible"
                      }
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}