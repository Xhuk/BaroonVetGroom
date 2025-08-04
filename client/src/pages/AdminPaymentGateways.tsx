import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Edit, Settings, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PaymentGatewayConfig } from "@shared/schema";

const gatewayConfigSchema = z.object({
  gatewayType: z.enum(["stripe", "mercadopago"]),
  isActive: z.boolean().default(true),
  config: z.object({
    publicKey: z.string().min(1, "Public key is required"),
    secretKey: z.string().min(1, "Secret key is required"),
    webhookSecret: z.string().optional(),
  }),
  companyLevel: z.boolean().default(false), // true for company-level, false for tenant-level
});

type GatewayConfigForm = z.infer<typeof gatewayConfigSchema>;

export default function AdminPaymentGateways() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState<PaymentGatewayConfig | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["/api/admin/payment-gateways", currentTenant?.companyId, currentTenant?.id],
    enabled: !!currentTenant,
  });

  const form = useForm<GatewayConfigForm>({
    resolver: zodResolver(gatewayConfigSchema),
    defaultValues: {
      gatewayType: "stripe",
      isActive: true,
      companyLevel: false,
      config: {
        publicKey: "",
        secretKey: "",
        webhookSecret: "",
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GatewayConfigForm) => {
      const payload = {
        ...data,
        companyId: data.companyLevel ? currentTenant?.companyId : undefined,
        tenantId: data.companyLevel ? undefined : currentTenant?.id,
      };
      return apiRequest("POST", "/api/admin/payment-gateways", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Configuración creada",
        description: "La pasarela de pago se configuró correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GatewayConfigForm) => {
      if (!editingConfig) throw new Error("No config selected");
      return apiRequest("PUT", `/api/admin/payment-gateways/${editingConfig.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setShowDialog(false);
      setEditingConfig(null);
      form.reset();
      toast({
        title: "Configuración actualizada",
        description: "La pasarela de pago se actualizó correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/payment-gateways/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      toast({
        title: "Configuración eliminada",
        description: "La pasarela de pago se eliminó correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (config: PaymentGatewayConfig) => {
    setEditingConfig(config);
    form.reset({
      gatewayType: config.gatewayType as "stripe" | "mercadopago",
      isActive: config.isActive,
      companyLevel: !!config.companyId,
      config: config.config as any,
    });
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    form.reset();
    setShowDialog(true);
  };

  const onSubmit = (data: GatewayConfigForm) => {
    if (editingConfig) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (!currentTenant) {
    return <div data-testid="loading-tenant">Cargando información del tenant...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6" data-testid="page-payment-gateways">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Pasarelas de Pago
          </h1>
          <p className="text-muted-foreground">
            Configurar pasarelas de pago para cobros con tarjeta y enlaces de pago
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-gateway">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Pasarela
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-6">
          {(configs as PaymentGatewayConfig[]).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pasarelas configuradas</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Configura Stripe o MercadoPago para recibir pagos con tarjeta y generar enlaces de pago.
                </p>
                <Button onClick={handleCreate} data-testid="button-create-first-gateway">
                  <Plus className="w-4 h-4 mr-2" />
                  Configurar Primera Pasarela
                </Button>
              </CardContent>
            </Card>
          ) : (
            (configs as PaymentGatewayConfig[]).map((config: PaymentGatewayConfig) => (
              <Card key={config.id} className={`${config.isActive ? '' : 'opacity-60'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <CardTitle className="capitalize">
                        {config.gatewayType === 'stripe' ? 'Stripe' : 'MercadoPago'}
                      </CardTitle>
                      <span className="text-sm bg-muted px-2 py-1 rounded">
                        {config.companyId ? 'Empresa' : 'Tenant'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(config)}
                        data-testid={`button-edit-${config.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(config.id)}
                        data-testid={`button-delete-${config.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Configuración de {config.gatewayType} para {config.companyId ? 'toda la empresa' : 'este tenant'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Estado:</Label>
                      <p className={config.isActive ? 'text-green-600' : 'text-gray-500'}>
                        {config.isActive ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Clave Pública:</Label>
                      <p className="font-mono text-xs truncate">
                        {(config.config as any)?.publicKey ? `${(config.config as any).publicKey.substring(0, 20)}...` : 'No configurada'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Pasarela de Pago' : 'Nueva Pasarela de Pago'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="gatewayType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pasarela</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gateway-type">
                          <SelectValue placeholder="Selecciona una pasarela" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyLevel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Configuración a Nivel Empresa</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Si está activado, esta configuración se aplicará a todos los tenants de la empresa
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-company-level"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.publicKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave Pública</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={form.watch("gatewayType") === "stripe" ? "pk_..." : "APP_USR..."}
                        {...field}
                        data-testid="input-public-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave Secreta</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={form.watch("gatewayType") === "stripe" ? "sk_..." : "APP_USR..."}
                        {...field}
                        data-testid="input-secret-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.webhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook Secret (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="whsec_..."
                        {...field}
                        data-testid="input-webhook-secret"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activa</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Si está desactivada, no se podrá usar para procesar pagos
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Guardando...
                    </>
                  ) : (
                    editingConfig ? 'Actualizar' : 'Crear'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}