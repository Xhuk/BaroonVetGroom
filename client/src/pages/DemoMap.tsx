import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function DemoMap() {
  const [currentTileServer, setCurrentTileServer] = useState(0);
  const [mapKey, setMapKey] = useState(0);

  const tileServers = [
    {
      name: "OSM Standard (Same as openstreetmap.org)",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    {
      name: "OSM with subdomains",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", 
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    },
    {
      name: "OpenTopoMap",
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
      subdomains: ['a', 'b', 'c']
    },
    {
      name: "Simple Fallback (HTTP)",
      url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  ];

  const switchTileServer = () => {
    setCurrentTileServer((prev) => (prev + 1) % tileServers.length);
    setMapKey(prev => prev + 1); // Force map re-render
  };

  const currentServer = tileServers[currentTileServer];

  // Test markers
  const testMarkers = [
    { id: 1, position: [24.8066, -107.3938], name: "Clínica Veterinaria", color: "blue" },
    { id: 2, position: [24.8166, -107.4038], name: "Las Flores", color: "red" },
    { id: 3, position: [24.7966, -107.3838], name: "El Bosque", color: "orange" },
    { id: 4, position: [24.8266, -107.3738], name: "Villa Real", color: "green" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Demo Map Testing
          </h1>
          <Button onClick={switchTileServer} variant="outline">
            Switch Tile Server ({currentServer.name})
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Tile Server Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Tile Server</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline">{currentServer.name}</Badge>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  URL: {currentServer.url}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Max Zoom: {currentServer.maxZoom}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Test Markers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {testMarkers.map((marker) => (
                  <div key={marker.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full bg-${marker.color}-500`}></div>
                    <span>{marker.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Map Test - {currentServer.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ height: '600px', width: '100%' }}>
                  <MapContainer
                    key={mapKey}
                    center={[24.8066, -107.3938]} // Culiacán center
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    className="rounded-b-lg"
                    whenCreated={(mapInstance) => {
                      console.log('Map created with', currentServer.name);
                      setTimeout(() => {
                        mapInstance.invalidateSize();
                        console.log('Map size invalidated');
                      }, 100);
                    }}
                  >
                    <TileLayer
                      attribution={currentServer.attribution}
                      url={currentServer.url}
                      maxZoom={currentServer.maxZoom}
                      subdomains={currentServer.subdomains}
                      onLoad={() => {
                        console.log(`✅ ${currentServer.name} tile loaded successfully`);
                        console.log(`URL: ${currentServer.url}`);
                      }}
                      onError={(e) => {
                        console.error(`❌ ${currentServer.name} tile loading error:`, e);
                        console.log(`Failed URL: ${currentServer.url}`);
                      }}
                      onLoading={() => console.log(`🔄 ${currentServer.name} tiles loading...`)}
                      errorTileUrl=""
                    />
                    
                    {/* Test Markers */}
                    {testMarkers.map((marker) => (
                      <Marker 
                        key={marker.id}
                        position={marker.position as [number, number]}
                      >
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Console Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Check the browser console for map loading messages. Click "Switch Tile Server" to test different providers.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}