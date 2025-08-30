import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
// Using CDN CSS instead of npm imports (matching working example)
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

  // Ensure Leaflet CSS is properly loaded (matching working example approach)
  useEffect(() => {
    console.log('🔗 Leaflet CSS should be loaded from HTML head');
    console.log('📊 Leaflet status:', {
      version: L.version,
      mapLoaded: typeof L.map,
      tileLayerLoaded: typeof L.tileLayer
    });
  }, []);

  const tileServers = [
    {
      name: "Stadia Maps (Alidade Smooth)",
      url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 20
    },
    {
      name: "Esri World Street Map",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
      maxZoom: 19
    },
    {
      name: "Esri World Imagery",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    },
    {
      name: "CartoDB Positron",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c', 'd']
    },
    {
      name: "MapTiler Basic (using API key)",
      url: `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY || 'VnIIfVkMlKSgr3pNklzl'}`,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      maxZoom: 19,
      type: "tile"
    },
    {
      name: "MapTiler Streets v2 (Direct)",
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY || 'VnIIfVkMlKSgr3pNklzl'}`,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      maxZoom: 19,
      type: "tile"
    },
    {
      name: "MapTiler SDK Layer (Official)",
      apiKey: import.meta.env.VITE_MAPTILER_API_KEY || 'VnIIfVkMlKSgr3pNklzl',
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      maxZoom: 19,
      type: "maptiler"
    }
  ];

  const switchTileServer = () => {
    const newIndex = (currentTileServer + 1) % tileServers.length;
    const newServer = tileServers[newIndex];
    
    console.log(`🔄 SWITCHING FROM: ${tileServers[currentTileServer].name}`);
    console.log(`🔄 SWITCHING TO: ${newServer.name}`);
    console.log(`🔄 NEW URL: ${newServer.url}`);
    
    setCurrentTileServer(newIndex);
    setMapKey(prev => prev + 1); // Force map re-render
    
    console.log(`🔄 Map key updated to: ${mapKey + 1}`);
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
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Map Key: {mapKey}
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
                      console.log(`🗺️ Map created with: ${currentServer.name}`);
                      console.log(`🗺️ Map key: ${mapKey}`);
                      console.log(`🗺️ Server type: ${currentServer.type || 'tile'}`);
                      console.log(`🗺️ Map center: [24.8066, -107.3938]`);
                      console.log(`🗺️ Map zoom: 12`);
                      
                      // Add event listeners for tile requests
                      mapInstance.on('tileerror', (e) => {
                        console.error(`🚨 Tile error event:`, e);
                      });
                      
                      mapInstance.on('tileload', (e) => {
                        console.log(`📥 Tile loaded:`, e.url);
                      });
                      
                      // If this is a MapTiler SDK layer, add it directly to the map
                      if (currentServer.type === 'maptiler') {
                        console.log(`🎯 Creating MapTiler SDK layer with API key: ${currentServer.apiKey}`);
                        console.log(`🎯 MapTiler SDK available:`, typeof (L as any).maptiler);
                        console.log(`🎯 maptilerLayer function:`, typeof (L as any).maptiler?.maptilerLayer);
                        
                        try {
                          // Check if MapTiler SDK is properly loaded
                          if (!(L as any).maptiler || !(L as any).maptiler.maptilerLayer) {
                            console.error(`❌ MapTiler SDK not properly loaded!`);
                            console.log(`L.maptiler:`, (L as any).maptiler);
                            return;
                          }
                          
                          const mtLayer = new (L as any).maptiler.maptilerLayer({
                            apiKey: currentServer.apiKey,
                          });
                          
                          console.log(`🎯 MapTiler layer created:`, mtLayer);
                          mtLayer.addTo(mapInstance);
                          console.log(`✅ MapTiler SDK layer added successfully`);
                        } catch (error) {
                          console.error(`❌ Error creating MapTiler SDK layer:`, error);
                          console.error(`❌ Error stack:`, error.stack);
                        }
                      } else {
                        console.log(`🎯 Using regular tile layer for: ${currentServer.name}`);
                      }
                      
                      setTimeout(() => {
                        mapInstance.invalidateSize();
                        console.log('🗺️ Map size invalidated');
                        console.log(`🗺️ Current bounds:`, mapInstance.getBounds());
                        console.log(`🗺️ Current zoom:`, mapInstance.getZoom());
                      }, 100);
                    }}
                  >
                    {currentServer.type !== 'maptiler' && (
                      <TileLayer
                        attribution={currentServer.attribution}
                        url={currentServer.url}
                        maxZoom={currentServer.maxZoom}
                        subdomains={currentServer.subdomains}
                        onLoad={(e) => {
                          console.log(`✅ ${currentServer.name} tile loaded successfully`);
                          console.log(`✅ Event:`, e);
                          console.log(`✅ Template URL: ${currentServer.url}`);
                        }}
                        onError={(e) => {
                          console.error(`❌ ${currentServer.name} tile loading error:`, e);
                          console.error(`❌ Error details:`, e.error);
                          console.error(`❌ Coordinates:`, e.coords);
                          console.error(`❌ Template URL: ${currentServer.url}`);
                          // Try to construct the actual URL being requested
                          if (e.coords) {
                            const actualUrl = currentServer.url
                              .replace('{z}', e.coords.z)
                              .replace('{x}', e.coords.x)
                              .replace('{y}', e.coords.y)
                              .replace('{r}', '')
                              .replace('{s}', currentServer.subdomains ? currentServer.subdomains[0] : '');
                            console.error(`❌ Actual URL that failed: ${actualUrl}`);
                          }
                        }}
                        onLoading={(e) => {
                          console.log(`🔄 ${currentServer.name} tiles loading...`);
                          console.log(`🔄 Loading coords:`, e.coords);
                          if (e.coords) {
                            const actualUrl = currentServer.url
                              .replace('{z}', e.coords.z)
                              .replace('{x}', e.coords.x)
                              .replace('{y}', e.coords.y)
                              .replace('{r}', '')
                              .replace('{s}', currentServer.subdomains ? currentServer.subdomains[0] : '');
                            console.log(`🔄 Requesting: ${actualUrl}`);
                          }
                        }}
                        errorTileUrl=""
                      />
                    )}
                    
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