import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, DollarSign, Calendar, Trash2, Edit, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { WhatsAppCopyModal } from '@/components/WhatsAppCopyModal';
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';

interface PendingInvoice {
  id: string;
  tenantId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  paymentLinkUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

interface TaxConfiguration {
  id: string;
  tenantId: string;
  countryCode: string;
  vatRate: number;
  currency: string;
  invoiceNumberPrefix: string;
  invoiceNumberCounter: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function Facturacion() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<InvoiceLineItem | null>(null);
  
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    dueDate: '',
    notes: ''
  });
  
  const [newLineItem, setNewLineItem] = useState({
    serviceName: '',
    description: '',
    quantity: 1,
    unitPrice: 0
  });

  // Check permissions - use basic access control for now
  const canView = true; // All authenticated users can view invoices 
  const canEdit = true; // All authenticated users can edit invoices
  const canDelete = true; // All authenticated users can delete invoices

  if (!canView) {
    return <ErrorDisplay error={{ message: "No tienes permisos para ver las facturas pendientes" }} />;
  }

  // Fetch data
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<PendingInvoice[]>({
    queryKey: ['/api/pending-invoices', currentTenant?.id],
    enabled: !!currentTenant?.id
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients', currentTenant?.id],
    enabled: !!currentTenant?.id
  });

  const { data: taxConfig } = useQuery<TaxConfiguration>({
    queryKey: ['/api/tax-config', currentTenant?.id],
    enabled: !!currentTenant?.id
  });

  const { data: lineItems = [] } = useQuery<InvoiceLineItem[]>({
    queryKey: ['/api/invoice-line-items', selectedInvoice?.id],
    enabled: !!selectedInvoice?.id
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/pending-invoices/${currentTenant?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-invoices'] });
      setShowCreateDialog(false);
      setNewInvoice({ clientId: '', dueDate: '', notes: '' });
      toast({ title: 'Factura creada exitosamente' });
    }
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/pending-invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-invoices'] });
      toast({ title: 'Factura actualizada exitosamente' });
    }
  });

  const createLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/invoice-line-items/${selectedInvoice?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create line item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-line-items'] });
      setShowLineItemDialog(false);
      setNewLineItem({ serviceName: '', description: '', quantity: 1, unitPrice: 0 });
      // Recalculate invoice totals
      recalculateInvoiceTotals();
      toast({ title: 'Elemento agregado exitosamente' });
    }
  });

  const updateLineItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/invoice-line-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update line item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-line-items'] });
      setEditingLineItem(null);
      recalculateInvoiceTotals();
      toast({ title: 'Elemento actualizado exitosamente' });
    }
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoice-line-items/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete line item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-line-items'] });
      recalculateInvoiceTotals();
      toast({ title: 'Elemento eliminado exitosamente' });
    }
  });

  const recalculateInvoiceTotals = () => {
    if (!selectedInvoice || !lineItems.length) return;
    
    const subtotal = lineItems.reduce((sum: number, item: InvoiceLineItem) => sum + item.lineTotal, 0);
    const taxRate = (taxConfig?.vatRate || 16) / 100;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    updateInvoiceMutation.mutate({
      id: selectedInvoice.id,
      data: { subtotal, taxAmount, totalAmount }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'sent': return 'Enviada';
      case 'paid': return 'Pagada';
      case 'overdue': return 'Vencida';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client?.name || 'Cliente desconocido';
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.clientId) {
      toast({ title: 'Error', description: 'Selecciona un cliente', variant: 'destructive' });
      return;
    }

    createInvoiceMutation.mutate({
      ...newInvoice,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: taxConfig?.currency || 'MXN'
    });
  };

  const handleAddLineItem = () => {
    if (!newLineItem.serviceName || newLineItem.unitPrice <= 0) {
      toast({ title: 'Error', description: 'Completa todos los campos requeridos', variant: 'destructive' });
      return;
    }

    const lineTotal = newLineItem.quantity * newLineItem.unitPrice;
    createLineItemMutation.mutate({
      ...newLineItem,
      lineTotal,
      sortOrder: lineItems.length
    });
  };

  const handleUpdateLineItem = () => {
    if (!editingLineItem || !editingLineItem.serviceName || editingLineItem.unitPrice <= 0) {
      toast({ title: 'Error', description: 'Completa todos los campos requeridos', variant: 'destructive' });
      return;
    }

    const lineTotal = editingLineItem.quantity * editingLineItem.unitPrice;
    updateLineItemMutation.mutate({
      id: editingLineItem.id,
      data: { ...editingLineItem, lineTotal }
    });
  };

  const generatePaymentLink = (invoice: PendingInvoice) => {
    // This would integrate with actual payment processors like Stripe, MercadoPago, etc.
    const paymentLink = `https://pay.vetgroom.app/invoice/${invoice.id}`;
    
    updateInvoiceMutation.mutate({
      id: invoice.id,
      data: { 
        paymentLinkUrl: paymentLink,
        status: 'sent'
      }
    });

    return paymentLink;
  };

  const handleGeneratePaymentLink = (invoice: PendingInvoice) => {
    const paymentLink = generatePaymentLink(invoice);
    
    // Copy to clipboard
    navigator.clipboard.writeText(paymentLink);
    toast({ title: 'Enlace de pago generado y copiado al portapapeles' });
  };

  const formatWhatsAppMessage = (invoice: PendingInvoice) => {
    const clientName = getClientName(invoice.clientId);
    const total = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: invoice.currency
    }).format(invoice.totalAmount);

    const paymentLink = invoice.paymentLinkUrl || generatePaymentLink(invoice);

    return `Hola ${clientName},

Te enviamos tu factura pendiente:

📄 *Factura:* ${invoice.invoiceNumber}
💰 *Total:* ${total}
📅 *Fecha de vencimiento:* ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: es }) : 'No especificada'}

Para realizar el pago, haz clic en el siguiente enlace:
${paymentLink}

¡Gracias por confiar en nosotros!

_Mensaje generado automáticamente por VetGroom_`;
  };

  if (invoicesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando facturas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <BackButton />
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturas Pendientes</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona las facturas pendientes de pago</p>
          </div>
          
          {canEdit && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-invoice">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Factura
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Factura</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client">Cliente</Label>
                    <Select value={newInvoice.clientId} onValueChange={(value) => setNewInvoice(prev => ({ ...prev, clientId: value }))}>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                      data-testid="input-due-date"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={newInvoice.notes}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notas adicionales..."
                      data-testid="textarea-notes"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateInvoice} disabled={createInvoiceMutation.isPending}>
                      {createInvoiceMutation.isPending ? 'Creando...' : 'Crear Factura'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Facturas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monto Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN'
                    }).format(invoices.reduce((sum: number, inv: PendingInvoice) => sum + inv.totalAmount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {invoices.filter((inv: PendingInvoice) => inv.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vencidas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {invoices.filter((inv: PendingInvoice) => inv.status === 'overdue').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: PendingInvoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getClientName(invoice.clientId)}</TableCell>
                    <TableCell>{format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: es }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(invoice.status)} text-white`}>
                        {getStatusText(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: invoice.currency
                      }).format(invoice.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                          data-testid={`button-view-${invoice.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePaymentLink(invoice)}
                          data-testid={`button-payment-link-${invoice.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowWhatsAppModal(true);
                          }}
                          data-testid={`button-whatsapp-${invoice.id}`}
                        >
                          📱
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {invoices.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay facturas pendientes
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Crea tu primera factura usando el botón "Nueva Factura"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details Dialog */}
        {selectedInvoice && (
          <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Factura {selectedInvoice.invoiceNumber}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Cliente</Label>
                  <p className="font-medium">{getClientName(selectedInvoice.clientId)}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Badge className={`${getStatusColor(selectedInvoice.status)} text-white ml-2`}>
                    {getStatusText(selectedInvoice.status)}
                  </Badge>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Elementos de la Factura</h3>
                  {canEdit && (
                    <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Elemento
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingLineItem ? 'Editar Elemento' : 'Agregar Elemento'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="serviceName">Servicio</Label>
                            <Input
                              id="serviceName"
                              value={editingLineItem?.serviceName || newLineItem.serviceName}
                              onChange={(e) => {
                                if (editingLineItem) {
                                  setEditingLineItem(prev => prev ? { ...prev, serviceName: e.target.value } : null);
                                } else {
                                  setNewLineItem(prev => ({ ...prev, serviceName: e.target.value }));
                                }
                              }}
                              placeholder="Nombre del servicio"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                              id="description"
                              value={editingLineItem?.description || newLineItem.description}
                              onChange={(e) => {
                                if (editingLineItem) {
                                  setEditingLineItem(prev => prev ? { ...prev, description: e.target.value } : null);
                                } else {
                                  setNewLineItem(prev => ({ ...prev, description: e.target.value }));
                                }
                              }}
                              placeholder="Descripción opcional"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="quantity">Cantidad</Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingLineItem?.quantity || newLineItem.quantity}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  if (editingLineItem) {
                                    setEditingLineItem(prev => prev ? { ...prev, quantity: value } : null);
                                  } else {
                                    setNewLineItem(prev => ({ ...prev, quantity: value }));
                                  }
                                }}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="unitPrice">Precio Unitario</Label>
                              <Input
                                id="unitPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingLineItem?.unitPrice || newLineItem.unitPrice}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  if (editingLineItem) {
                                    setEditingLineItem(prev => prev ? { ...prev, unitPrice: value } : null);
                                  } else {
                                    setNewLineItem(prev => ({ ...prev, unitPrice: value }));
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowLineItemDialog(false);
                                setEditingLineItem(null);
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              onClick={editingLineItem ? handleUpdateLineItem : handleAddLineItem}
                              disabled={createLineItemMutation.isPending || updateLineItemMutation.isPending}
                            >
                              {editingLineItem ? 'Actualizar' : 'Agregar'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item: InvoiceLineItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.serviceName}</TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: selectedInvoice.currency
                          }).format(item.unitPrice)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: selectedInvoice.currency
                          }).format(item.lineTotal)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingLineItem(item);
                                  setShowLineItemDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteLineItemMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Invoice Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: selectedInvoice.currency
                        }).format(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA ({taxConfig?.vatRate || 16}%):</span>
                        <span>{new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: selectedInvoice.currency
                        }).format(selectedInvoice.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: selectedInvoice.currency
                        }).format(selectedInvoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* WhatsApp Modal */}
        {selectedInvoice && showWhatsAppModal && (
          <WhatsAppCopyModal
            open={showWhatsAppModal}
            onOpenChange={(open) => {
              setShowWhatsAppModal(open);
              if (!open) setSelectedInvoice(null);
            }}
            phoneNumber=""
            message={formatWhatsAppMessage(selectedInvoice)}
            title="Enviar Factura por WhatsApp"
          />
        )}
      </div>
    </div>
  );
}