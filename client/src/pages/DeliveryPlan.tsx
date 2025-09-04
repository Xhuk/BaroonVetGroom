import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Navigation, BarChart3, Truck, Users, MapPin, Route } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// MapTiler Layer Component using WORKING tile layer approach (imported from test page)
const MapTilerLayer = ({ apiKey, style, onReady }: { apiKey: string; style: string; onReady?: () => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!apiKey) {
      console.log('⏳ Waiting for API key...');
      return;
    }
    
    console.log('🗺️ Creating MapTiler layer with style:', style);
    
    try {
      // Remove existing tile layers
      map.eachLayer((layer: any) => {
        if (layer._url?.includes('maptiler') || layer._url?.includes('openstreetmap')) {
          map.removeLayer(layer);
        }
      });
      
      // Create MapTiler layer using simple tile layer approach (WORKS!)
      const tileUrl = `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${apiKey}`;
      console.log('🔗 Tile URL:', tileUrl);
      
      const mtLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      });
      
      mtLayer.addTo(map);
      console.log('✅ MapTiler layer added successfully');
      onReady?.();
      
    } catch (error) {
      console.error('❌ Error creating MapTiler layer:', error);
      // Fallback to OpenStreetMap if MapTiler fails
      console.log('🔄 Falling back to OpenStreetMap...');
      const fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      fallbackLayer.addTo(map);
      onReady?.();
    }
  }, [map, apiKey, style]);
  
  return null;
};

// Helper that invalidates size reliably for Tabs/Card layout
function UseInvalidateOnVisible({ deps = [] }: { deps?: any[] }) {
  const map = useMap();
  useEffect(() => {
    // Small delay lets layout settle (Tabs/Card animations)
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, deps);
  return null;
}

// Stronger resizer using ResizeObserver
function MapResizeObserver({ targetId }: { targetId: string }) {
  const map = useMap();
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, targetId]);
  return null;
}

// Create blue clinic marker
const clinicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DeliveryPlan() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("inbound");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [mapApiKey, setMapApiKey] = useState<string>("");
  const mapBoxId = "delivery-map-box"; // unique id for observer

  // Load MapTiler API key
  useEffect(() => {
    fetch('/api/config/maptiler')
      .then(res => res.json())
      .then(data => {
        console.log('✅ MapTiler API key loaded for delivery plan');
        setMapApiKey(data.apiKey);
      })
      .catch(err => {
        console.error('❌ Failed to load MapTiler API key:', err);
      });
  }, []);

  // Sample statistics data
  const stats = {
    pickupsScheduled: 0,
    clientsRegistered: 0,
    inboundRoutes: 0,
    availableVans: 4
  };

  // Sample routes data
  const deliveryRoutes = [
    { id: "route-1", name: "Ruta Centro - Mañana", time: "08:00", stops: 5 },
    { id: "route-2", name: "Ruta Norte - Tarde", time: "14:00", stops: 3 },
    { id: "route-3", name: "Ruta Sur - Noche", time: "18:00", stops: 7 }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbound" className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Inbound (Pickup)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Outbound (Delivery)
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Driver Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Inbound Tab Content */}
        <TabsContent value="inbound" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Pickups Programados</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.pickupsScheduled}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                    <Navigation className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Clientes Registrados</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.clientsRegistered}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Rutas Inbound</p>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.inboundRoutes}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                    <Route className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Vans Disponibles</p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.availableVans}</p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full">
                    <Truck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Planning Section */}
          <div className="space-y-4">
            {/* Header with Route Selection */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Planificación de Rutas</h2>
              <div className="flex items-center gap-4">
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Selecciona una ruta para ver en el mapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryRoutes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} - {route.time} ({route.stops} paradas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/test-map', '_blank')}
                >
                  Test MapTiler
                </Button>
              </div>
            </div>

            {/* Full Width Map */}
            <Card className="w-full">
              <CardContent className="p-0">
                {/* IMPORTANT: give the container a stable id and a firm height */}
                <div id={mapBoxId} className="h-[500px] w-full relative">
                  {mapApiKey ? (
                    <MapContainer
                      center={[25.6866, -100.3161]}
                      zoom={11}
                      className="rounded-lg"
                      style={{ height: "100%", width: "100%" }}
                      zoomControl
                      scrollWheelZoom
                      whenReady={() => {
                        // First paint fix
                        setTimeout(() => {
                          const evt = new Event("resize");
                          window.dispatchEvent(evt);
                        }, 50);
                      }}
                    >
                      {/* Invalidate size when: 1) tab changes to inbound, 2) apiKey ready */}
                      <UseInvalidateOnVisible deps={[activeTab === "inbound", mapApiKey]} />
                      {/* Observe container resizes (Tabs/Card/layout changes) */}
                      <MapResizeObserver targetId={mapBoxId} />

                      {/* Use a stable key (avoid Date.now()) */}
                      <MapTilerLayer
                        key={`maptiler-delivery-streets`}
                        apiKey={mapApiKey}
                        style="streets"
                        onReady={() => console.log("✅ Route planning MapTiler layer ready")}
                      />

                      {/* Clinic marker */}
                      <Marker position={[25.6866, -100.3161]} icon={clinicIcon}>
                        <Popup>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">Clínica Veterinaria</div>
                            <div className="text-sm">{currentTenant?.name || "Vetgroom1"}</div>
                            <div className="text-xs text-gray-500">Monterrey, México</div>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Cargando mapa...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other Tab Contents */}
        <TabsContent value="outbound" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Outbound Delivery</h3>
                <p className="text-gray-500">Gestión de entregas y rutas de salida</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Driver Tracking</h3>
                <p className="text-gray-500">Seguimiento en tiempo real de conductores</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Analytics</h3>
                <p className="text-gray-500">Análisis y métricas de rendimiento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}