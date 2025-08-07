import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Save, Settings } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function AdminBusinessHours() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    openTime: "08:00",
    closeTime: "18:00", 
    timeSlotDuration: 30,
    reservationTimeout: 5
  });

  // Fetch current business hours
  const { data: businessHours, isLoading } = useQuery({
    queryKey: ["/api/admin/business-hours", currentTenant?.id],
    enabled: !!currentTenant?.id,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          openTime: data.openTime || "08:00",
          closeTime: data.closeTime || "18:00",
          timeSlotDuration: data.timeSlotDuration || 30,
          reservationTimeout: data.reservationTimeout || 5
        });
      }
    }
  });

  // Update business hours mutation
  const updateBusinessHours = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(`/api/admin/business-hours/${currentTenant?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      toast({
        title: "Horarios actualizados",
        description: "Los horarios de atención han sido actualizados correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-hours", currentTenant?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar los horarios",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.openTime >= formData.closeTime) {
      toast({
        title: "Error de validación",
        description: "La hora de apertura debe ser anterior a la hora de cierre",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.timeSlotDuration < 15 || formData.timeSlotDuration > 120) {
      toast({
        title: "Error de validación", 
        description: "La duración de citas debe estar entre 15 y 120 minutos",
        variant: "destructive",
      });
      return;
    }

    updateBusinessHours.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Settings className="mr-3 h-8 w-8 text-blue-600" />
              Configuración de Horarios
            </h1>
            <p className="text-gray-600 mt-1">
              Configura los horarios de atención y políticas de reservas
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-green-600" />
            Horarios de Atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="openTime">Hora de Apertura *</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={formData.openTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                  required
                  data-testid="input-open-time"
                />
              </div>
              <div>
                <Label htmlFor="closeTime">Hora de Cierre *</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                  required
                  data-testid="input-close-time"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeSlotDuration">Duración de Citas (minutos) *</Label>
                <Input
                  id="timeSlotDuration"
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={formData.timeSlotDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeSlotDuration: parseInt(e.target.value) }))}
                  required
                  data-testid="input-slot-duration"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tiempo asignado por cita (15-120 minutos)
                </p>
              </div>
              <div>
                <Label htmlFor="reservationTimeout">Tiempo de Reserva (minutos) *</Label>
                <Input
                  id="reservationTimeout"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.reservationTimeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, reservationTimeout: parseInt(e.target.value) }))}
                  required
                  data-testid="input-reservation-timeout"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tiempo que se mantiene reservado un horario durante el proceso de booking
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Vista Previa de Horarios</h4>
              <p className="text-blue-700 text-sm">
                <strong>Horario:</strong> {formData.openTime} - {formData.closeTime}
              </p>
              <p className="text-blue-700 text-sm">
                <strong>Citas cada:</strong> {formData.timeSlotDuration} minutos
              </p>
              <p className="text-blue-700 text-sm">
                <strong>Reserva temporal:</strong> {formData.reservationTimeout} minutos
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="submit"
                disabled={updateBusinessHours.isPending}
                data-testid="button-save-business-hours"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateBusinessHours.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}