import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Calculator, DollarSign, Percent } from "lucide-react";

export function SalaryConfig() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  
  // Fetch staff data
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['/api', 'staff', currentTenant?.id].filter(Boolean),
    enabled: !!currentTenant?.id,
  });

  const [staff, setStaff] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [salaryConfigData, setSalaryConfigData] = useState({
    basicSalary: 0,
    isrEnabled: true,
    imssEnabled: true,
    imssEmployeePercentage: 2.375,
    imssEmployerPercentage: 10.525,
    infonavitEnabled: false,
    infonavitPercentage: 0,
    fonacotEnabled: false,
    fonacotAmount: 0,
  });

  useEffect(() => {
    if (staffData) {
      setStaff(staffData);
      if (staffData.length > 0 && !selectedEmployee) {
        setSelectedEmployee(staffData[0]);
        loadEmployeeConfig(staffData[0]);
      }
    }
  }, [staffData, selectedEmployee]);

  // ISR calculation function
  const calculateISR = (annualSalary: number) => {
    const brackets = [
      { min: 0, max: 125900, rate: 0.019, fixed: 0 },
      { min: 125900, max: 1000000, rate: 0.3, fixed: 2392 },
    ];

    let isr = 0;
    for (const bracket of brackets) {
      if (annualSalary > bracket.min) {
        const taxableInBracket = Math.min(annualSalary - bracket.min, bracket.max - bracket.min);
        isr += taxableInBracket * bracket.rate + bracket.fixed;
        break;
      }
    }
    return isr / 12; // Monthly ISR
  };

  const loadEmployeeConfig = (employee: any) => {
    setSalaryConfigData({
      basicSalary: parseFloat(employee.basicSalary) || 0,
      isrEnabled: employee.isrEnabled !== undefined ? employee.isrEnabled : true,
      imssEnabled: employee.imssEnabled !== undefined ? employee.imssEnabled : true,
      imssEmployeePercentage: parseFloat(employee.imssEmployeePercentage) || 2.375,
      imssEmployerPercentage: parseFloat(employee.imssEmployerPercentage) || 10.525,
      infonavitEnabled: employee.infonavitEnabled !== undefined ? employee.infonavitEnabled : false,
      infonavitPercentage: parseFloat(employee.infonavitPercentage) || 0,
      fonacotEnabled: employee.fonacotEnabled !== undefined ? employee.fonacotEnabled : false,
      fonacotAmount: parseFloat(employee.fonacotAmount) || 0,
    });
  };

  const handleSaveSalaryConfig = async () => {
    if (selectedEmployee && currentTenant) {
      try {
        const salaryConfigUpdate = {
          basicSalary: salaryConfigData.basicSalary.toString(),
          isrEnabled: salaryConfigData.isrEnabled,
          imssEnabled: salaryConfigData.imssEnabled,
          imssEmployeePercentage: salaryConfigData.imssEmployeePercentage.toString(),
          imssEmployerPercentage: salaryConfigData.imssEmployerPercentage.toString(),
          infonavitEnabled: salaryConfigData.infonavitEnabled,
          infonavitPercentage: salaryConfigData.infonavitPercentage.toString(),
          fonacotEnabled: salaryConfigData.fonacotEnabled,
          fonacotAmount: salaryConfigData.fonacotAmount.toString(),
        };

        await apiRequest(`/api/staff/${selectedEmployee.id}`, {
          method: 'PATCH',
          body: JSON.stringify(salaryConfigUpdate),
        });

        queryClient.invalidateQueries({ queryKey: ['/api', 'staff', currentTenant.id] });
        
        toast({
          title: "Configuración Guardada",
          description: `Configuración de retenciones para ${selectedEmployee.name} actualizada exitosamente`,
        });
      } catch (error) {
        console.error('Error saving salary configuration:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la configuración salarial. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading || tenantLoading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <div>No autorizado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <BackButton />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Configuración de Retenciones Salariales
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Configuración completa de ISR, IMSS, Infonavit y Fonacot según leyes fiscales de México
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employee Selector */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {staff.map((employee) => (
                      <div
                        key={employee.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedEmployee?.id === employee.id
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          setSelectedEmployee(employee);
                          loadEmployeeConfig(employee);
                        }}
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</div>
                        <div className="text-sm font-medium text-green-600">
                          ${(parseFloat(employee.basicSalary) || 15000).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Panel */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Configuración de {selectedEmployee?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedEmployee && (
                    <>
                      {/* Basic Salary */}
                      <div className="space-y-2">
                        <Label htmlFor="basicSalary" className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Salario Base Mensual
                        </Label>
                        <Input
                          id="basicSalary"
                          type="number"
                          value={salaryConfigData.basicSalary}
                          onChange={(e) => setSalaryConfigData(prev => ({
                            ...prev,
                            basicSalary: parseFloat(e.target.value) || 0
                          }))}
                          placeholder="$15,000.00"
                          className="text-lg font-medium"
                        />
                      </div>

                      {/* ISR Configuration */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            <span className="font-medium">ISR (Impuesto Sobre la Renta)</span>
                          </div>
                          <Switch
                            checked={salaryConfigData.isrEnabled}
                            onCheckedChange={(checked) => setSalaryConfigData(prev => ({
                              ...prev,
                              isrEnabled: checked
                            }))}
                          />
                        </div>
                        {salaryConfigData.isrEnabled && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p>Cálculo automático según brackets 2024</p>
                            <p className="font-medium text-red-600">
                              Retención mensual estimada: ${calculateISR(salaryConfigData.basicSalary * 12).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* IMSS Configuration */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            <span className="font-medium">IMSS (Instituto Mexicano del Seguro Social)</span>
                          </div>
                          <Switch
                            checked={salaryConfigData.imssEnabled}
                            onCheckedChange={(checked) => setSalaryConfigData(prev => ({
                              ...prev,
                              imssEnabled: checked
                            }))}
                          />
                        </div>
                        {salaryConfigData.imssEnabled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Porcentaje Empleado (%)</Label>
                              <Input
                                type="number"
                                step="0.001"
                                value={salaryConfigData.imssEmployeePercentage}
                                onChange={(e) => setSalaryConfigData(prev => ({
                                  ...prev,
                                  imssEmployeePercentage: parseFloat(e.target.value) || 0
                                }))}
                                placeholder="2.375"
                              />
                              <p className="text-xs text-gray-500 mt-1">Descuento del empleado</p>
                            </div>
                            <div>
                              <Label>Porcentaje Patrón (%)</Label>
                              <Input
                                type="number"
                                step="0.001"
                                value={salaryConfigData.imssEmployerPercentage}
                                onChange={(e) => setSalaryConfigData(prev => ({
                                  ...prev,
                                  imssEmployerPercentage: parseFloat(e.target.value) || 0
                                }))}
                                placeholder="10.525"
                              />
                              <p className="text-xs text-gray-500 mt-1">Aportación del patrón</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Infonavit Configuration */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            <span className="font-medium">Infonavit</span>
                          </div>
                          <Switch
                            checked={salaryConfigData.infonavitEnabled}
                            onCheckedChange={(checked) => setSalaryConfigData(prev => ({
                              ...prev,
                              infonavitEnabled: checked
                            }))}
                          />
                        </div>
                        {salaryConfigData.infonavitEnabled && (
                          <div>
                            <Label>Porcentaje (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              max="5"
                              value={salaryConfigData.infonavitPercentage}
                              onChange={(e) => setSalaryConfigData(prev => ({
                                ...prev,
                                infonavitPercentage: Math.min(parseFloat(e.target.value) || 0, 5)
                              }))}
                              placeholder="0.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Máximo 5% del salario base</p>
                          </div>
                        )}
                      </div>

                      {/* Fonacot Configuration */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">Fonacot</span>
                          </div>
                          <Switch
                            checked={salaryConfigData.fonacotEnabled}
                            onCheckedChange={(checked) => setSalaryConfigData(prev => ({
                              ...prev,
                              fonacotEnabled: checked
                            }))}
                          />
                        </div>
                        {salaryConfigData.fonacotEnabled && (
                          <div>
                            <Label>Monto Fijo ($)</Label>
                            <Input
                              type="number"
                              value={salaryConfigData.fonacotAmount}
                              onChange={(e) => setSalaryConfigData(prev => ({
                                ...prev,
                                fonacotAmount: parseFloat(e.target.value) || 0
                              }))}
                              placeholder="$0.00"
                            />
                            <p className="text-xs text-gray-500 mt-1">Monto fijo según crédito autorizado</p>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-medium mb-3">Resumen de Retenciones</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p>Salario Base: <span className="font-medium text-green-600">${salaryConfigData.basicSalary.toFixed(2)}</span></p>
                            {salaryConfigData.isrEnabled && (
                              <p>ISR: <span className="font-medium text-red-600">-${calculateISR(salaryConfigData.basicSalary * 12).toFixed(2)}</span></p>
                            )}
                            {salaryConfigData.imssEnabled && (
                              <p>IMSS (Empleado): <span className="font-medium text-red-600">-${(salaryConfigData.basicSalary * salaryConfigData.imssEmployeePercentage / 100).toFixed(2)}</span></p>
                            )}
                          </div>
                          <div>
                            {salaryConfigData.infonavitEnabled && (
                              <p>Infonavit: <span className="font-medium text-red-600">-${(salaryConfigData.basicSalary * salaryConfigData.infonavitPercentage / 100).toFixed(2)}</span></p>
                            )}
                            {salaryConfigData.fonacotEnabled && (
                              <p>Fonacot: <span className="font-medium text-red-600">-${salaryConfigData.fonacotAmount.toFixed(2)}</span></p>
                            )}
                            <div className="border-t pt-2 mt-2">
                              <p className="font-medium">Neto: <span className="text-green-600">${(
                                salaryConfigData.basicSalary 
                                - (salaryConfigData.isrEnabled ? calculateISR(salaryConfigData.basicSalary * 12) : 0)
                                - (salaryConfigData.imssEnabled ? salaryConfigData.basicSalary * salaryConfigData.imssEmployeePercentage / 100 : 0)
                                - (salaryConfigData.infonavitEnabled ? salaryConfigData.basicSalary * salaryConfigData.infonavitPercentage / 100 : 0)
                                - (salaryConfigData.fonacotEnabled ? salaryConfigData.fonacotAmount : 0)
                              ).toFixed(2)}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end">
                        <Button onClick={handleSaveSalaryConfig} className="bg-blue-600 hover:bg-blue-700">
                          Guardar Configuración
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}