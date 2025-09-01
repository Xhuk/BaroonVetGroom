import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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

  // Veterinary clinic destinations in Culiacán
  const destinations: Destination[] = [
    {
      id: "main",
      name: "Clínica Veterinaria Principal",
      coordinates: [24.8066, -107.3938],
      address: "Centro de Culiacán, Sinaloa",
      type: "main",
      services: ["Consultas", "Cirugías", "Emergencias 24h", "Hospitalización"]
    },
    {
      id: "flores",
      name: "Sucursal Las Flores",
      coordinates: [24.8166, -107.4038],
      address: "Fraccionamiento Las Flores",
      type: "branch",
      services: ["Consultas", "Vacunación", "Grooming"]
    },
    {
      id: "bosque",
      name: "Sucursal El Bosque",
      coordinates: [24.7966, -107.3838],
      address: "Colonia El Bosque",
      type: "branch",
      services: ["Consultas", "Vacunación", "Farmacia"]
    },
    {
      id: "villa",
      name: "Sucursal Villa Real",
      coordinates: [24.8266, -107.3738],
      address: "Villa Real, Culiacán",
      type: "branch",
      services: ["Consultas", "Grooming", "Guardería"]
    },
    {
      id: "norte",
      name: "Centro Veterinario Norte",
      coordinates: [24.8366, -107.3638],
      address: "Zona Norte de Culiacán",
      type: "branch",
      services: ["Consultas", "Vacunación", "Rayos X"]
    },
    {
      id: "sur",
      name: "Clínica Sur",
      coordinates: [24.7866, -107.4138],
      address: "Zona Sur de Culiacán",
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
          Sistema de Gestión Veterinaria - Culiacán
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

  const mapTilerUrl = `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`;

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
          Clínicas veterinarias en <strong>Culiacán, Sinaloa</strong>
          <br />
          <span style={{ color: "#dc2626" }}>●</span> Clínica Principal
          <br />
          <span style={{ color: "#2563eb" }}>●</span> Sucursales (5 ubicaciones)
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
        center={[24.8066, -107.3938]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={mapTilerUrl}
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