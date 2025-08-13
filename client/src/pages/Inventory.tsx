import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { BackButton } from "@/components/BackButton";
import { DebugControls } from "@/components/DebugControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart,
  Search,
  Filter,
  Calendar,
  FileText,
  ChevronDown,
  FileSpreadsheet,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, InventoryTransaction } from "@shared/schema";

export default function Inventory() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [showItemForm, setShowItemForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showMassImport, setShowMassImport] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [importText, setImportText] = useState("");
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Fast loading with 95% payload reduction and 5-minute caching
  const { data: inventoryData, isLoading } = useQuery<{items: InventoryItem[], transactions: InventoryTransaction[], totalItems: number}>({
    queryKey: ["/api/inventory-fast", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const inventoryItems = inventoryData?.items || [];
  const transactions = inventoryData?.transactions || [];

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/inventory`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Producto agregado",
        description: "El producto se ha agregado al inventario exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-fast"] });
      setShowItemForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el producto",
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/inventory/transactions`, "POST", { ...data, tenantId: currentTenant?.id });
    },
    onSuccess: () => {
      toast({
        title: "Transacción registrada",
        description: "La transacción de inventario se ha registrado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-fast"] });
      setShowTransactionForm(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la transacción",
        variant: "destructive",
      });
    },
  });

  const massImportMutation = useMutation({
    mutationFn: async (data: { text: string; tenantId: string }) => {
      return apiRequest('/api/inventory/mass-import', "POST", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-fast"] });
      toast({
        title: "Importación completada",
        description: `Se han importado ${(data as any)?.imported || 0} productos correctamente.`,
      });
      setShowMassImport(false);
      setImportText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error en importación",
        description: error.message || "No se pudo procesar la importación masiva.",
        variant: "destructive",
      });
    },
  });

  // Dark theme skeleton loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900">
          <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => (
              <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      {[1,2,3].map(j => (
                        <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleCreateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      category: formData.get("category"),
      sku: formData.get("sku"),
      description: formData.get("description"),
      unitPrice: parseFloat(formData.get("unitPrice") as string) || 0,
      currentStock: parseInt(formData.get("currentStock") as string) || 0,
      minStockLevel: parseInt(formData.get("minStockLevel") as string) || 5,
      maxStockLevel: parseInt(formData.get("maxStockLevel") as string) || 100,
      unit: formData.get("unit"),
      supplier: formData.get("supplier"),
      expirationDate: formData.get("expirationDate") || null,
    };

    createItemMutation.mutate(data);
  };

  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const quantity = parseInt(formData.get("quantity") as string) || 0;
    const unitPrice = parseFloat(formData.get("unitPrice") as string) || (selectedItem?.unitPrice || 0);
    
    const data = {
      itemId: selectedItem?.id,
      type: formData.get("type"),
      quantity: formData.get("type") === "sale" || formData.get("type") === "expired" ? -Math.abs(quantity) : Math.abs(quantity),
      unitPrice: unitPrice,
      totalAmount: Math.abs(Number(quantity)) * Number(unitPrice || 0),
      reference: formData.get("reference"),
      notes: formData.get("notes"),
    };

    createTransactionMutation.mutate(data);
  };

  const getStockStatus = (item: InventoryItem) => {
    const currentStock = item.currentStock || 0;
    const minStock = item.minStockLevel || 0;
    const maxStock = item.maxStockLevel || 0;
    
    if (currentStock <= 0) return { status: "out", color: "bg-red-100 text-red-800 border-red-200", text: "Agotado" };
    if (currentStock <= minStock) return { status: "low", color: "bg-yellow-100 text-yellow-800 border-yellow-200", text: "Stock Bajo" };
    if (maxStock > 0 && currentStock >= maxStock) return { status: "high", color: "bg-blue-100 text-blue-800 border-blue-200", text: "Stock Alto" };
    return { status: "normal", color: "bg-green-100 text-green-800 border-green-200", text: "Stock Normal" };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medication": return "💊";
      case "supplies": return "🏥";
      case "food": return "🥘";
      case "accessories": return "🎀";
      default: return "📦";
    }
  };

  const filteredItems = inventoryItems?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const lowStockItems = inventoryItems?.filter(item => {
    const currentStock = item.currentStock ?? 0;
    const minStock = item.minStockLevel ?? 0;
    return currentStock <= minStock;
  }) || [];
  
  const totalInventoryValue = inventoryItems?.reduce((sum, item) => {
    const currentStock = Number(item.currentStock ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    return sum + (currentStock * unitPrice);
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      <div className="p-6 max-w-7xl mx-auto">
        <BackButton className="mb-4" />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Inventario</h1>
          <div className="flex items-center space-x-3">
          <DebugControls />
          <Button 
            variant="outline"
            onClick={() => {
              const csvContent = `Categoria,Nombre,Descripcion,Precio Proveedor (MXN),Precio Venta (MXN),SKU,Stock,Unidad,Proveedor
Vacuna,Vacuna antirrábica,Protección anual contra la rabia,120,250,VAC-001,50,Frasco,Vetpharma
Vacuna,"Vacuna múltiple (moquillo, parvovirus)",Protege contra múltiples enfermedades,180,350,VAC-002,30,Frasco,PetLabs
Accesorio,Collar de piel ajustable,Para perros medianos,90,180,ACC-001,75,Pieza,Mascota Feliz
Grooming,Shampoo para perros hipoalergénico,Ideal para piel sensible,80,150,GRM-001,40,Botella,Dermapet
Grooming,Cortaúñas profesional,"Acero inoxidable, mango antideslizante",40,90,GRM-002,60,Pieza,PetTools
Grooming,Cepillo de cerdas suaves,Para perros de pelo largo,35,70,GRM-003,100,Pieza,PetTools
Médico,Jabón medicado,Para tratamiento de hongos y bacterias,60,110,MED-001,35,Barra,Vetpharma
Médico,Collar isabelino,Talla ajustable para perros y gatos,30,65,MED-002,45,Pieza,VetComfort
Grooming,Toalla absorbente grande,"Secado rápido, reutilizable",25,55,GRM-004,80,Pieza,CleanPet
Accesorio,Perfume para mascotas,"Aroma duradero, sin alcohol",50,95,ACC-002,90,Frasco,AromaPet
Alimento,Croquetas premium para perros (10kg),Con proteínas y omegas,450,850,ALM-001,25,Saco,NutriPet
Alimento,Alimento húmedo para gatos (lata),"Sabor atún, sin conservadores",18,35,ALM-002,150,Lata,CatDelight
Medicamento,Antibiótico para perros (Amoxicilina),"250mg, tratamiento de infecciones",60,120,MED-003,40,Caja,Vetpharma
Medicamento,Desparasitante oral,"Uso mensual, amplio espectro",35,75,MED-004,100,Tableta,PetLabs
Juguete,Pelota con sonido para perro,"Material resistente, color azul",20,50,JUG-001,80,Pieza,DogFun
Juguete,Ratón de tela para gato,Con catnip natural,12,30,JUG-002,120,Pieza,CatJoy`;
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', 'inventario_veterinario_ejemplo.csv');
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              toast({
                title: "CSV descargado",
                description: "Archivo de ejemplo descargado exitosamente. Puedes usar este formato para importar tus productos.",
              });
            }}
            data-testid="button-download-csv"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Descargar CSV Ejemplo
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setShowItemForm(true)}
                data-testid="menu-item-single-product"
              >
                <Package className="w-4 h-4 mr-2" />
                Producto Individual
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowMassImport(true)}
                data-testid="menu-item-mass-import"
              >
                <Zap className="w-4 h-4 mr-2" />
                Importación Bulk CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Productos</p>
                <p className="text-2xl font-bold text-blue-600">{inventoryItems?.length || 0}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">${totalInventoryValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transacciones Hoy</p>
                <p className="text-2xl font-bold text-purple-600">
                  {transactions?.filter(t => 
                    t.createdAt && new Date(t.createdAt).toDateString() === new Date().toDateString()
                  ).length || 0}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar productos por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
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
          </div>
        </CardContent>
      </Card>

      {/* New Item Form */}
      {showItemForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Agregar Nuevo Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input name="name" required placeholder="Nombre del producto" />
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medicamentos</SelectItem>
                    <SelectItem value="supplies">Suministros</SelectItem>
                    <SelectItem value="food">Alimentos</SelectItem>
                    <SelectItem value="accessories">Accesorios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input name="sku" placeholder="Código del producto" />
              </div>

              <div>
                <Label htmlFor="unitPrice">Precio Unitario</Label>
                <Input name="unitPrice" type="number" step="0.01" min="0" placeholder="0.00" />
              </div>

              <div>
                <Label htmlFor="currentStock">Stock Inicial</Label>
                <Input name="currentStock" type="number" min="0" placeholder="0" />
              </div>

              <div>
                <Label htmlFor="unit">Unidad</Label>
                <Select name="unit">
                  <SelectTrigger>
                    <SelectValue placeholder="Unidad de medida" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">Piezas</SelectItem>
                    <SelectItem value="kg">Kilogramos</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                    <SelectItem value="boxes">Cajas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="minStockLevel">Stock Mínimo</Label>
                <Input name="minStockLevel" type="number" min="0" defaultValue="5" />
              </div>

              <div>
                <Label htmlFor="maxStockLevel">Stock Máximo</Label>
                <Input name="maxStockLevel" type="number" min="0" defaultValue="100" />
              </div>

              <div>
                <Label htmlFor="supplier">Proveedor</Label>
                <Input name="supplier" placeholder="Nombre del proveedor" />
              </div>

              <div>
                <Label htmlFor="expirationDate">Fecha de Expiración</Label>
                <Input name="expirationDate" type="date" />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="description">Descripción</Label>
                <Textarea name="description" placeholder="Descripción del producto..." />
              </div>

              <div className="md:col-span-3 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createItemMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createItemMutation.isPending ? "Guardando..." : "Agregar Producto"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowItemForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {showTransactionForm && selectedItem && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Transacción - {selectedItem.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo de Transacción</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Compra</SelectItem>
                    <SelectItem value="sale">Venta</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input name="quantity" type="number" required placeholder="Cantidad" />
              </div>

              <div>
                <Label htmlFor="unitPrice">Precio Unitario</Label>
                <Input 
                  name="unitPrice" 
                  type="number" 
                  step="0.01" 
                  defaultValue={selectedItem.unitPrice?.toString() || "0"} 
                />
              </div>

              <div>
                <Label htmlFor="reference">Referencia</Label>
                <Input name="reference" placeholder="Factura, cita, etc." />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea name="notes" placeholder="Notas adicionales..." />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button 
                  type="submit" 
                  disabled={createTransactionMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createTransactionMutation.isPending ? "Registrando..." : "Registrar Transacción"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowTransactionForm(false);
                    setSelectedItem(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Inventory Items */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="low-stock">Stock Bajo</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="grid gap-4">
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {item.sku && <p className="text-sm text-gray-500">SKU: {item.sku}</p>}
                          </div>
                          <Badge className={stockStatus.color}>
                            {stockStatus.text}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Stock Actual:</span>
                            <p className="font-medium">{item.currentStock} {item.unit}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Precio:</span>
                            <p className="font-medium">${item.unitPrice?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor Total:</span>
                            <p className="font-medium">${((Number(item.currentStock ?? 0) * Number(item.unitPrice ?? 0))).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Stock Min/Max:</span>
                            <p className="font-medium">{item.minStockLevel}/{item.maxStockLevel}</p>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowTransactionForm(true);
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Transacción
                        </Button>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredItems.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || categoryFilter !== "all" 
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "Comienza agregando productos a tu inventario"
                    }
                  </p>
                  {!searchTerm && categoryFilter === "all" && (
                    <Button onClick={() => setShowItemForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Primer Producto
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="low-stock">
          <div className="grid gap-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">¡Excelente!</h3>
                  <p className="text-gray-500">No hay productos con stock bajo en este momento.</p>
                </CardContent>
              </Card>
            ) : (
              lowStockItems.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <Card key={item.id} className="border-l-4 border-l-yellow-400">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              Stock actual: {item.currentStock} {item.unit} | Mínimo: {item.minStockLevel}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowTransactionForm(true);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Reabastecer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="space-y-4">
            {transactions?.slice(0, 20).map((transaction) => (
              <Card key={transaction.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.transactionType === 'purchase' ? 'bg-green-500' :
                        transaction.transactionType === 'sale' ? 'bg-blue-500' :
                        transaction.transactionType === 'expired' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium">
                          {inventoryItems?.find(item => item.id === transaction.itemId)?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.transactionType === 'purchase' && 'Compra'}
                          {transaction.transactionType === 'sale' && 'Venta'}
                          {transaction.transactionType === 'expired' && 'Expirado'}
                          {transaction.transactionType === 'adjustment' && 'Ajuste'}
                          {' '} - {Math.abs(transaction.quantity)} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${transaction.totalCost?.toLocaleString() || '0'}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones</h3>
                  <p className="text-gray-500">Las transacciones de inventario aparecerán aquí.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mass Import Dialog */}
      <Dialog open={showMassImport} onOpenChange={setShowMassImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Importación Bulk CSV
            </DialogTitle>
            <DialogDescription>
              Describe tus productos de forma natural o descarga el CSV de ejemplo para formato estructurado.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Atención:</strong> Esta acción eliminará todo el inventario actual antes de importar los nuevos productos. 
              Esta operación no se puede deshacer.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="import-text">Describe tus productos de inventario</Label>
              <Textarea
                id="import-text"
                placeholder="Ejemplo: Necesito medicamentos como amoxicilina 500mg, meloxicam, dexametasona. También vacunas antirrábicas, séxtuple canina. Suministros como jeringas, gasas, alcohol. Precios en pesos mexicanos..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
                className="resize-none"
                data-testid="textarea-import-text"
              />
              <p className="text-sm text-gray-500 mt-2">
                Describe medicamentos, vacunas, suministros, accesorios o cualquier producto veterinario. 
                El sistema procesará la información y creará el inventario automáticamente.
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => {
                const csvContent = `Categoria,Nombre,Descripcion,Precio Proveedor (MXN),Precio Venta (MXN),SKU,Stock,Unidad,Proveedor
Vacuna,Vacuna antirrábica,Protección anual contra la rabia,120,250,VAC-001,50,Frasco,Vetpharma
Vacuna,"Vacuna múltiple (moquillo, parvovirus)",Protege contra múltiples enfermedades,180,350,VAC-002,30,Frasco,PetLabs
Accesorio,Collar de piel ajustable,Para perros medianos,90,180,ACC-001,75,Pieza,Mascota Feliz
Grooming,Shampoo para perros hipoalergénico,Ideal para piel sensible,80,150,GRM-001,40,Botella,Dermapet
Grooming,Cortaúñas profesional,"Acero inoxidable, mango antideslizante",40,90,GRM-002,60,Pieza,PetTools
Grooming,Cepillo de cerdas suaves,Para perros de pelo largo,35,70,GRM-003,100,Pieza,PetTools
Médico,Jabón medicado,Para tratamiento de hongos y bacterias,60,110,MED-001,35,Barra,Vetpharma
Médico,Collar isabelino,Talla ajustable para perros y gatos,30,65,MED-002,45,Pieza,VetComfort
Grooming,Toalla absorbente grande,"Secado rápido, reutilizable",25,55,GRM-004,80,Pieza,CleanPet
Accesorio,Perfume para mascotas,"Aroma duradero, sin alcohol",50,95,ACC-002,90,Frasco,AromaPet
Alimento,Croquetas premium para perros (10kg),Con proteínas y omegas,450,850,ALM-001,25,Saco,NutriPet
Alimento,Alimento húmedo para gatos (lata),"Sabor atún, sin conservadores",18,35,ALM-002,150,Lata,CatDelight
Medicamento,Antibiótico para perros (Amoxicilina),"250mg, tratamiento de infecciones",60,120,MED-003,40,Caja,Vetpharma
Medicamento,Desparasitante oral,"Uso mensual, amplio espectro",35,75,MED-004,100,Tableta,PetLabs
Juguete,Pelota con sonido para perro,"Material resistente, color azul",20,50,JUG-001,80,Pieza,DogFun
Juguete,Ratón de tela para gato,Con catnip natural,12,30,JUG-002,120,Pieza,CatJoy`;
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'inventario_veterinario_ejemplo.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast({
                  title: "CSV descargado",
                  description: "Usa este formato para importar productos por CSV.",
                });
              }}
              disabled={massImportMutation.isPending}
              data-testid="button-download-sample-csv"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Descargar CSV
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowMassImport(false)}
                disabled={massImportMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (!importText.trim()) {
                    toast({
                      title: "Error",
                      description: "Por favor describe los productos a importar.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  massImportMutation.mutate({ 
                    text: importText, 
                    tenantId: currentTenant?.id || '' 
                  });
                }}
                disabled={massImportMutation.isPending || !importText.trim()}
                data-testid="button-process-import"
              >
                {massImportMutation.isPending ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Procesando con IA...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Procesar con IA
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}