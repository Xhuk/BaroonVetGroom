import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet CSS loads properly in Replit
const leafletCssLink = document.createElement('link');
leafletCssLink.rel = 'stylesheet';
leafletCssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
if (!document.querySelector('link[href*="leaflet.css"]')) {
  document.head.appendChild(leafletCssLink);
}

// Fix Leaflet default markers with reliable CDN
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons for different clinic types
const mainClinicIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const branchIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Destination {
  id: string;
  name: string;
  coordinates: [number, number];
  address: string;
  type: "main" | "branch";
  services: string[];
}

export default function DemoMap() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Veterinary clinic destinations in Monterrey
  const destinations: Destination[] = [
    {
      id: "main",
      name: "Clínica Veterinaria Principal",
      coordinates: [25.6866, -100.3161],
      address: "Centro de Monterrey, Nuevo León",
      type: "main",
      services: ["Consultas", "Cirugías", "Emergencias 24h", "Hospitalización"]
    },
    {
      id: "sanpedro",
      name: "Sucursal San Pedro",
      coordinates: [25.6553, -100.4089],
      address: "San Pedro Garza García",
      type: "branch",
      services: ["Consultas", "Vacunación", "Grooming"]
    },
    {
      id: "santa",
      name: "Sucursal Santa Catarina",
      coordinates: [25.6738, -100.4458],
      address: "Santa Catarina",
      type: "branch",
      services: ["Consultas", "Vacunación", "Farmacia"]
    },
    {
      id: "apodaca",
      name: "Sucursal Apodaca",
      coordinates: [25.7839, -100.1878],
      address: "Apodaca, Nuevo León",
      type: "branch",
      services: ["Consultas", "Grooming", "Guardería"]
    },
    {
      id: "garcia",
      name: "Centro Veterinario García",
      coordinates: [25.8144, -100.5467],
      address: "García, Nuevo León",
      type: "branch",
      services: ["Consultas", "Vacunación", "Rayos X"]
    },
    {
      id: "guadalupe",
      name: "Clínica Guadalupe",
      coordinates: [25.6767, -100.2556],
      address: "Guadalupe, Nuevo León",
      type: "branch",
      services: ["Consultas", "Emergencias", "Laboratorio"]
    }
  ];

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        console.log("🔑 Fetching MapTiler API key...");
        const response = await fetch('/api/config/maptiler');
        const config = await response.json();
        
        if (!config.apiKey) {
          throw new Error('MapTiler API key not configured');
        }

        setApiKey(config.apiKey);
        console.log("✅ MapTiler API key loaded for Leaflet");
        setIsLoading(false);
      } catch (err) {
        console.error("❌ Error loading MapTiler API key:", err);
        setError(err instanceof Error ? err.message : 'Error loading API key');
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          fontSize: "24px",
          fontWeight: "600",
          marginBottom: "16px"
        }}>
          🗺️ Cargando Mapa Demo
        </div>
        <div style={{
          fontSize: "16px",
          opacity: 0.9
        }}>
          Sistema de Gestión Veterinaria - Monterrey
        </div>
        <div style={{
          marginTop: "20px",
          padding: "8px 16px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "20px",
          fontSize: "14px"
        }}>
          Inicializando MapTiler con Leaflet...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)",
        color: "white",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "8px" }}>
          Error del Mapa
        </div>
        <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "20px" }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "500"
          }}
        >
          🔄 Recargar Página
        </button>
      </div>
    );
  }

  // Multiple tile server options for Replit environment
  const tileServers = [
    {
      name: "CartoDB Positron",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    {
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    {
      name: "OpenStreetMap HOT",
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
      maxZoom: 19
    }
  ];
  
  const [currentTileServer, setCurrentTileServer] = useState(0);
  const currentTiles = tileServers[currentTileServer];
  
  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* Header Info */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        padding: "16px 20px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        maxWidth: "320px",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#2563eb",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🏥 Sistema Veterinario Demo
        </div>
        <div style={{
          fontSize: "14px",
          color: "#64748b",
          lineHeight: "1.5"
        }}>
          Clínicas veterinarias en <strong>Monterrey, Nuevo León</strong>
          <br />
          <span style={{ color: "#dc2626" }}>●</span> Clínica Principal
          <br />
          <span style={{ color: "#2563eb" }}>●</span> Sucursales (5 ubicaciones)
        </div>
      </div>

      {/* Map Provider Info with Switcher */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 1000,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        <div>🗺️ {currentTiles.name}</div>
        <div style={{ display: "flex", gap: "4px" }}>
          {tileServers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTileServer(index)}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid white",
                background: index === currentTileServer ? "white" : "transparent",
                cursor: "pointer",
                fontSize: "8px"
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Panel */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "12px"
        }}>
          📊 Estadísticas de Red
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6" }}>
          <div>📍 <strong>6</strong> ubicaciones activas</div>
          <div>🏥 <strong>1</strong> clínica principal</div>
          <div>🏢 <strong>5</strong> sucursales</div>
          <div>📋 <strong>24/7</strong> servicio principal</div>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={[25.6866, -100.3161]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Dynamic Tile Layer with Multiple Options */}
        <TileLayer
          key={currentTileServer} // Force re-render on change
          attribution={currentTiles.attribution}
          url={currentTiles.url}
          maxZoom={currentTiles.maxZoom}
          crossOrigin={true}
        />
        
        {destinations.map((destination) => (
          <Marker
            key={destination.id}
            position={destination.coordinates}
            icon={destination.type === "main" ? mainClinicIcon : branchIcon}
          >
            <Popup>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                minWidth: "200px"
              }}>
                <div style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: destination.type === "main" ? "#dc2626" : "#2563eb",
                  marginBottom: "8px"
                }}>
                  {destination.name}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "10px"
                }}>
                  📍 {destination.address}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "#374151",
                  marginBottom: "8px",
                  fontWeight: "600"
                }}>
                  Servicios disponibles:
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px"
                }}>
                  {destination.services.map((service, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: "11px",
                        background: destination.type === "main" ? "#fef2f2" : "#eff6ff",
                        color: destination.type === "main" ? "#dc2626" : "#2563eb",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: `1px solid ${destination.type === "main" ? "#fecaca" : "#bfdbfe"}`
                      }}
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  marginTop: "10px",
                  textAlign: "center"
                }}>
                  {destination.coordinates[0].toFixed(4)}°N, {Math.abs(destination.coordinates[1]).toFixed(4)}°W
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}