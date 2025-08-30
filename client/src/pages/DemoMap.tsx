import { useEffect, useRef } from "react";
// No react-leaflet imports - using vanilla JS like your working example
import { Card, CardContent } from "@/components/ui/card";

declare global {
  interface Window {
    L: any;
  }
}

export default function DemoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    console.log('🗺️ Using vanilla Leaflet (like your working HTML example)');
    
    // Wait for Leaflet to be available (loaded from CDN)
    const initMap = () => {
      if (!window.L || !mapRef.current) {
        console.log('⏳ Waiting for Leaflet or map container...');
        setTimeout(initMap, 100);
        return;
      }

      if (mapInstanceRef.current) {
        console.log('🗺️ Map already exists, cleaning up...');
        mapInstanceRef.current.remove();
      }

      console.log('🗺️ Initializing vanilla Leaflet map');
      
      // Create map exactly like your working HTML example
      const map = window.L.map(mapRef.current).setView([24.8066, -107.3938], 13);
      mapInstanceRef.current = map;

      console.log('🗺️ Map created:', map);
      console.log('🗺️ Map center:', map.getCenter());
      console.log('🗺️ Map zoom:', map.getZoom());

      // Add OpenStreetMap tiles (same as your working example)
      const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      });
      
      tileLayer.addTo(map);
      console.log('🔗 Tile layer added');

      // Add test markers
      const markers = [
        { position: [24.8066, -107.3938], name: "Clínica Veterinaria" },
        { position: [24.8166, -107.4038], name: "Las Flores" },
        { position: [24.7966, -107.3838], name: "El Bosque" },
        { position: [24.8266, -107.3738], name: "Villa Real" },
      ];

      markers.forEach((markerData) => {
        const marker = window.L.marker(markerData.position).addTo(map);
        marker.bindPopup(`<b>${markerData.name}</b><br>${markerData.position[0].toFixed(4)}, ${markerData.position[1].toFixed(4)}`);
        console.log('📍 Marker added:', markerData.name);
      });

      // Listen for tile events to debug
      map.on('tileload', (e: any) => {
        console.log('✅ Tile loaded:', e.url);
      });

      map.on('tileerror', (e: any) => {
        console.error('❌ Tile error:', e);
      });

      map.on('tileloadstart', (e: any) => {
        console.log('🔄 Tile loading:', e.url);
      });

      // Force size recalculation
      setTimeout(() => {
        map.invalidateSize();
        console.log('🗺️ Map size invalidated');
      }, 100);

      console.log('🎉 Vanilla Leaflet map initialization complete');
    };

    initMap();

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        console.log('🧹 Cleaning up map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Culiacán Map - Vanilla Leaflet (Working Method)
          </h1>
        </div>

        <Card>
          <CardContent className="p-0">
            <div style={{ height: '700px', width: '100%' }}>
              <div 
                ref={mapRef}
                style={{ height: '100%', width: '100%' }}
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}