import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

export default function DemoMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (map.current) return; // stops map from initializing more than once

    const initializeMap = async () => {
      try {
        // Fetch API key from server
        const response = await fetch('/api/config/maptiler');
        const config = await response.json();
        
        if (!config.apiKey) {
          setError('MapTiler API key not configured');
          setIsLoading(false);
          return;
        }

        // Configure MapTiler
        maptilersdk.config.apiKey = config.apiKey;
        console.log("🗺️ MapTiler configured with API key:", config.apiKey.substring(0, 8) + "...");

        // Wait for container to be ready with timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!mapContainer.current && attempts < maxAttempts) {
          console.log(`⏳ Waiting for map container... attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!mapContainer.current) {
          console.error("❌ Map container not available in DOM after", maxAttempts * 100, "ms");
          setError('Map container not available');
          setIsLoading(false);
          return;
        }

        console.log("🗺️ Map container found, dimensions:", {
          width: mapContainer.current.offsetWidth,
          height: mapContainer.current.offsetHeight,
          clientWidth: mapContainer.current.clientWidth,
          clientHeight: mapContainer.current.clientHeight
        });

        console.log("🗺️ Initializing MapTiler map with style:", maptilersdk.MapStyle.STREETS);
        
        // Initialize MapTiler map
        const mapInstance = new maptilersdk.Map({
          container: mapContainer.current,
          style: maptilersdk.MapStyle.STREETS,
          center: [-107.3938, 24.8066], // Culiacán coordinates (lng, lat)
          zoom: 12,
        });

        // Add map event listeners for debugging
        mapInstance.on('load', () => {
          console.log("🎯 MapTiler map load event fired - map is ready");
        });

        mapInstance.on('error', (e) => {
          console.error("❌ MapTiler map error event:", e);
          setError(`Map load error: ${e.error?.message || 'Unknown error'}`);
        });

        mapInstance.on('styleload', () => {
          console.log("🎨 MapTiler style loaded successfully");
        });

        // Add delivery destination markers for Culiacán
        const destinations = [
          { name: "Clínica Veterinaria Principal", coords: [-107.3938, 24.8066] },
          { name: "Sucursal Las Flores", coords: [-107.4038, 24.8166] },
          { name: "Sucursal El Bosque", coords: [-107.3838, 24.7966] },
          { name: "Sucursal Villa Real", coords: [-107.3738, 24.8266] },
          { name: "Centro Veterinario Norte", coords: [-107.3638, 24.8366] },
          { name: "Clínica Sur", coords: [-107.4138, 24.7866] },
        ];

        console.log("📍 Adding", destinations.length, "destination markers to map...");

        destinations.forEach((destination, index) => {
          console.log(`📌 Adding marker ${index + 1}:`, destination.name, "at", destination.coords);
          
          // Create custom marker for each destination
          const marker = new maptilersdk.Marker({
            color: index === 0 ? "#FF0000" : "#0066CC", // Main clinic in red, others in blue
          })
            .setLngLat(destination.coords as [number, number])
            .setPopup(
              new maptilersdk.Popup().setHTML(`
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: bold;">${destination.name}</h3>
                  <p style="margin: 0; color: #666; font-size: 12px;">Destino de entregas veterinarias</p>
                  <p style="margin: 4px 0 0 0; color: #999; font-size: 11px;">
                    Coordenadas: ${destination.coords[1].toFixed(4)}, ${destination.coords[0].toFixed(4)}
                  </p>
                </div>
              `)
            )
            .addTo(mapInstance);
            
          console.log(`✅ Marker ${index + 1} added successfully`);
        });

        map.current = mapInstance;
        setIsLoading(false);
        console.log("✅ MapTiler demo map initialized successfully with", destinations.length, "markers");

      } catch (err) {
        console.error("❌ Error initializing MapTiler demo map:", err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar el mapa');
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
        color: "#e5e7eb",
        fontSize: "18px"
      }}>
        Cargando mapa de destinos...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
        color: "#ef4444",
        fontSize: "18px",
        flexDirection: "column",
        gap: "10px"
      }}>
        <div>❌ Error del mapa: {error}</div>
        <div style={{ fontSize: "14px", color: "#9ca3af" }}>
          Verifique la configuración de la clave API de MapTiler
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{
        height: "100vh",
        width: "100%",
      }}
    />
  );
}
