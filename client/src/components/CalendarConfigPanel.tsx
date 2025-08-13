import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, Building } from "lucide-react";

interface Company {
  id: string;
  name: string;
  calendarAutoReturnEnabled: boolean;
  calendarAutoReturnTimeout: number;
}

interface CalendarConfigPanelProps {
  className?: string;
}

export function CalendarConfigPanel({ className }: CalendarConfigPanelProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalendarConfig();
  }, []);

  const fetchCalendarConfig = async () => {
    try {
      const response = await fetch('/api/superadmin/calendar-config');
      if (!response.ok) throw new Error('Failed to fetch calendar configuration');
      
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching calendar config:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración del calendario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyConfig = async (companyId: string, config: Partial<Company>) => {
    setSaving(companyId);
    try {
      const response = await fetch(`/api/superadmin/calendar-config/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to update calendar configuration');

      const updatedCompany = await response.json();
      
      setCompanies(prev => 
        prev.map(company => 
          company.id === companyId 
            ? { ...company, ...updatedCompany }
            : company
        )
      );

      toast({
        title: "Configuración actualizada",
        description: `Configuración del calendario actualizada para ${companies.find(c => c.id === companyId)?.name}`,
      });
    } catch (error) {
      console.error('Error updating calendar config:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleEnabled = (companyId: string, enabled: boolean) => {
    updateCompanyConfig(companyId, { calendarAutoReturnEnabled: enabled });
  };

  const handleTimeoutChange = (companyId: string, timeout: number) => {
    if (timeout < 5 || timeout > 3600) return; // 5 seconds to 1 hour limits
    updateCompanyConfig(companyId, { calendarAutoReturnTimeout: timeout });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Configuración de Calendario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Cargando configuración...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Configuración de Calendario - Auto-Retorno
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configurar el tiempo de auto-retorno del calendario a la fecha de hoy
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {companies.length === 0 ? (
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay empresas configuradas</p>
          </div>
        ) : (
          companies.map((company) => (
            <Card key={company.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {company.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`enabled-${company.id}`}>Habilitado</Label>
                    <Switch
                      id={`enabled-${company.id}`}
                      checked={company.calendarAutoReturnEnabled}
                      onCheckedChange={(enabled) => handleToggleEnabled(company.id, enabled)}
                      disabled={saving === company.id}
                      data-testid={`switch-calendar-enabled-${company.id}`}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`timeout-${company.id}`} className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Tiempo de retorno (segundos)
                    </Label>
                    <Input
                      id={`timeout-${company.id}`}
                      type="number"
                      min="5"
                      max="3600"
                      value={company.calendarAutoReturnTimeout}
                      onChange={(e) => {
                        const timeout = parseInt(e.target.value) || 60;
                        handleTimeoutChange(company.id, timeout);
                      }}
                      disabled={!company.calendarAutoReturnEnabled || saving === company.id}
                      className="max-w-32"
                      data-testid={`input-timeout-${company.id}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Entre 5 segundos y 3600 segundos (1 hora)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Estado actual</Label>
                    <div className="text-sm">
                      {company.calendarAutoReturnEnabled ? (
                        <span className="text-green-600 font-medium">
                          ✅ Activo - Retorna después de {company.calendarAutoReturnTimeout}s
                        </span>
                      ) : (
                        <span className="text-gray-500 font-medium">
                          ❌ Desactivado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {saving === company.id && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Guardando configuración...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}