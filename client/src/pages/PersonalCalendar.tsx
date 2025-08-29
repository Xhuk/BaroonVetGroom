import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User, Filter, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PersonalCalendarData {
  tenant: { id: string; name: string };
  dateRange: { startDate: string; endDate: string };
  staff: Array<{
    id: string;
    name: string;
    role: string;
    shifts: Array<{
      date: string;
      dayName: string;
      shift: {
        time: string;
        hours: number;
        type: string;
      };
    }>;
  }>;
}

export default function PersonalCalendar() {
  const [location] = useLocation();
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('tenant') || '';
  const nameParam = urlParams.get('name') || '';

  // Initialize name filter from URL
  useEffect(() => {
    if (nameParam) {
      setNameFilter(nameParam);
    }
  }, [nameParam]);

  // Fetch personal calendar data
  const { data: calendarData, isLoading } = useQuery<PersonalCalendarData>({
    queryKey: ['/api/calendar/personal', tenantId, nameFilter],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/personal/${tenantId}?name=${encodeURIComponent(nameFilter)}`);
      if (!response.ok) throw new Error('Failed to fetch calendar');
      return response.json();
    },
    enabled: !!tenantId,
  });

  const filteredStaff = calendarData?.staff?.filter(staff => {
    if (selectedStaff === 'all') return true;
    return staff.id === selectedStaff;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Calendario no encontrado</h2>
            <p className="text-gray-600 dark:text-gray-400">
              No se pudo cargar el calendario. Verifica el enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Calendario Personal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {calendarData.tenant.name}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {new Date(calendarData.dateRange.startDate).toLocaleDateString()} - {' '}
              {new Date(calendarData.dateRange.endDate).toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar por nombre:</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Escribe tu nombre o rol..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado específico:</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {calendarData.staff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} - {staff.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horarios de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300 w-48">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Empleado
                      </div>
                    </th>
                    {calendarData.staff[0]?.shifts.map((shift, index) => (
                      <th key={index} className="text-center p-4 font-medium text-sm text-gray-700 dark:text-gray-300 min-w-[140px]">
                        <div className="text-lg font-bold">
                          {new Date(shift.date).getDate()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {shift.dayName}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff, staffIndex) => (
                    <tr key={staff.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'][staffIndex % 5]
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {staff.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {staff.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      {staff.shifts.map((shift, dayIndex) => (
                        <td key={dayIndex} className="p-3 text-center">
                          <div className={`text-xs px-3 py-2 rounded-lg ${
                            shift.shift.type === 'Permiso' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : shift.shift.type === 'Descanso'
                              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              : shift.shift.type === 'Flexible'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            <div className="font-medium">{shift.shift.time}</div>
                            {shift.shift.hours > 0 && (
                              <div className="text-xs opacity-75 mt-1">
                                {shift.shift.hours} hrs
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 dark:text-blue-300 text-sm">💡</span>
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Cómo usar este calendario:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Usa el filtro de nombre para encontrar tus horarios rápidamente</li>
                  <li>• Los colores indican diferentes tipos de turnos</li>
                  <li>• Verde: Turnos regulares | Azul: Horarios flexibles | Amarillo: Permisos</li>
                  <li>• Guarda este enlace para consultar tus horarios cuando quieras</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}