import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
// Using CDN CSS instead of npm imports (matching working example)
import { Card, CardContent } from "@/components/ui/card";

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function DemoMap() {
  // Direct method - use only the working MapTiler Streets v2 URL
  const mapTilerApiKey = 'VnIIfVkMlKSgr3pNklzl';
  
  useEffect(() => {
    console.log('🗺️ Using direct MapTiler Streets v2 method');
    console.log('📊 Leaflet version:', L.version);
  }, []);

  // Test markers
  const testMarkers = [
    { id: 1, position: [24.8066, -107.3938], name: "Clínica Veterinaria" },
    { id: 2, position: [24.8166, -107.4038], name: "Las Flores" },
    { id: 3, position: [24.7966, -107.3838], name: "El Bosque" },
    { id: 4, position: [24.8266, -107.3738], name: "Villa Real" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Culiacán Map - MapTiler Streets
          </h1>
        </div>

        <Card>
          <CardContent className="p-0">
            <div style={{ height: '700px', width: '100%' }}>
              <MapContainer
                center={[24.8066, -107.3938]} // Culiacán center
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="rounded-lg"
              >
                <TileLayer
                  attribution='<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
                  url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerApiKey}`}
                  maxZoom={19}
                />
                
                {/* Test Markers */}
                {testMarkers.map((marker) => (
                  <Marker key={marker.id} position={marker.position as [number, number]}>
                    <Popup>
                      <div className="text-center">
                        <div className="font-semibold">{marker.name}</div>
                        <div className="text-xs text-gray-500">
                          {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}