import { useState } from "react";

interface Destination {
  id: string;
  name: string;
  coordinates: [number, number];
  address: string;
  type: "main" | "branch";
  services: string[];
  neighborhood: string;
}

// Veterinary clinic destinations in Monterrey
const destinations: Destination[] = [
  {
    id: "main",
    name: "Clínica Veterinaria Principal",
    coordinates: [25.6866, -100.3161],
    address: "Centro de Monterrey, Nuevo León",
    neighborhood: "Centro",
    type: "main",
    services: ["Consultas", "Cirugías", "Emergencias 24h", "Hospitalización"]
  },
  {
    id: "sanpedro",
    name: "Sucursal San Pedro",
    coordinates: [25.6553, -100.4089],
    address: "San Pedro Garza García",
    neighborhood: "San Pedro",
    type: "branch",
    services: ["Consultas", "Vacunación", "Grooming"]
  },
  {
    id: "santa",
    name: "Sucursal Santa Catarina",
    coordinates: [25.6738, -100.4458],
    address: "Santa Catarina",
    neighborhood: "Santa Catarina",
    type: "branch",
    services: ["Consultas", "Vacunación", "Farmacia"]
  },
  {
    id: "apodaca",
    name: "Sucursal Apodaca",
    coordinates: [25.7839, -100.1878],
    address: "Apodaca, Nuevo León",
    neighborhood: "Apodaca",
    type: "branch",
    services: ["Consultas", "Grooming", "Guardería"]
  },
  {
    id: "garcia",
    name: "Centro Veterinario García",
    coordinates: [25.8144, -100.5467],
    address: "García, Nuevo León",
    neighborhood: "García",
    type: "branch",
    services: ["Consultas", "Vacunación", "Rayos X"]
  },
  {
    id: "guadalupe",
    name: "Clínica Guadalupe",
    coordinates: [25.6767, -100.2556],
    address: "Guadalupe, Nuevo León",
    neighborhood: "Guadalupe",
    type: "branch",
    services: ["Consultas", "Emergencias", "Laboratorio"]
  }
];

export default function DemoMap() {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "coordinates">("grid");

  // Calculate coordinate bounds for visual positioning
  const lats = destinations.map(d => d.coordinates[0]);
  const lngs = destinations.map(d => d.coordinates[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Convert coordinates to screen positions (0-100%)
  const getPosition = (coords: [number, number]) => {
    const [lat, lng] = coords;
    const x = ((lng - minLng) / (maxLng - minLng)) * 80 + 10; // 10-90% range
    const y = 90 - ((lat - minLat) / (maxLat - minLat)) * 80; // 10-90% range (inverted for screen)
    return { x, y };
  };

  return (
    <div style={{ 
      height: "100vh", 
      width: "100%", 
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        maxWidth: "350px"
      }}>
        <div style={{
          fontSize: "20px",
          fontWeight: "700",
          color: "#1e40af",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          🏥 Red Veterinaria Monterrey
        </div>
        <div style={{
          fontSize: "14px",
          color: "#64748b",
          lineHeight: "1.6"
        }}>
          Sistema de gestión para <strong>6 ubicaciones</strong> en el área metropolitana de Monterrey
        </div>
        <div style={{
          marginTop: "16px",
          display: "flex",
          gap: "8px"
        }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: viewMode === "grid" ? "#1e40af" : "white",
              color: viewMode === "grid" ? "white" : "#374151",
              cursor: "pointer"
            }}
          >
            📋 Lista
          </button>
          <button
            onClick={() => setViewMode("coordinates")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: viewMode === "coordinates" ? "#1e40af" : "white",
              color: viewMode === "coordinates" ? "white" : "#374151",
              cursor: "pointer"
            }}
          >
            🗺️ Mapa
          </button>
        </div>
      </div>

      {/* View Modes */}
      {viewMode === "grid" ? (
        /* Grid View */
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "1000px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          zIndex: 100
        }}>
          {destinations.map((dest) => (
            <div
              key={dest.id}
              style={{
                background: "rgba(255,255,255,0.95)",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: dest.type === "main" ? "3px solid #dc2626" : "3px solid #2563eb"
              }}
              onClick={() => setSelectedDestination(selectedDestination === dest.id ? null : dest.id)}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: dest.type === "main" ? "#dc2626" : "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px"
                }}>
                  {dest.type === "main" ? "🏥" : "🏢"}
                </div>
                <div>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: dest.type === "main" ? "#dc2626" : "#2563eb"
                  }}>
                    {dest.name}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#64748b"
                  }}>
                    📍 {dest.neighborhood}
                  </div>
                </div>
              </div>
              
              <div style={{
                fontSize: "12px",
                color: "#374151",
                marginBottom: "12px"
              }}>
                {dest.address}
              </div>
              
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                marginBottom: "12px"
              }}>
                {dest.services.map((service, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: "11px",
                      background: dest.type === "main" ? "#fef2f2" : "#eff6ff",
                      color: dest.type === "main" ? "#dc2626" : "#2563eb",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      border: `1px solid ${dest.type === "main" ? "#fecaca" : "#bfdbfe"}`
                    }}
                  >
                    {service}
                  </span>
                ))}
              </div>
              
              {selectedDestination === dest.id && (
                <div style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "8px",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  fontFamily: "monospace"
                }}>
                  📍 {dest.coordinates[0].toFixed(4)}°N, {Math.abs(dest.coordinates[1]).toFixed(4)}°W
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Coordinate Map View */
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          height: "70%",
          background: "rgba(255,255,255,0.95)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          overflow: "hidden",
          position: "relative"
        }}>
          {/* Coordinate Grid Background */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px"
          }} />
          
          {/* Coordinate Labels */}
          <div style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            fontSize: "12px",
            color: "#64748b",
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: "4px"
          }}>
            25.8144°N (García)
          </div>
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            fontSize: "12px",
            color: "#64748b",
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: "4px"
          }}>
            25.6553°N (San Pedro)
          </div>
          <div style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "12px",
            color: "#64748b",
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: "4px"
          }}>
            100.1878°W (Apodaca)
          </div>
          <div style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            fontSize: "12px",
            color: "#64748b",
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: "4px"
          }}>
            100.5467°W (García)
          </div>

          {/* Destination Markers */}
          {destinations.map((dest) => {
            const pos = getPosition(dest.coordinates);
            return (
              <div
                key={dest.id}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                  zIndex: selectedDestination === dest.id ? 1000 : 100
                }}
                onClick={() => setSelectedDestination(selectedDestination === dest.id ? null : dest.id)}
              >
                {/* Marker */}
                <div style={{
                  width: dest.type === "main" ? "40px" : "30px",
                  height: dest.type === "main" ? "40px" : "30px",
                  borderRadius: "50%",
                  background: dest.type === "main" ? "#dc2626" : "#2563eb",
                  border: "3px solid white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: dest.type === "main" ? "18px" : "14px",
                  animation: selectedDestination === dest.id ? "pulse 1s infinite" : "none"
                }}>
                  {dest.type === "main" ? "🏥" : "🏢"}
                </div>
                
                {/* Popup */}
                {selectedDestination === dest.id && (
                  <div style={{
                    position: "absolute",
                    top: dest.type === "main" ? "-200px" : "-180px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "white",
                    padding: "16px",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    minWidth: "250px",
                    border: `2px solid ${dest.type === "main" ? "#dc2626" : "#2563eb"}`,
                    animation: "fadeIn 0.3s ease-out"
                  }}>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: dest.type === "main" ? "#dc2626" : "#2563eb",
                      marginBottom: "8px"
                    }}>
                      {dest.name}
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "#64748b",
                      marginBottom: "12px"
                    }}>
                      📍 {dest.address}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      color: "#374151",
                      marginBottom: "8px",
                      fontWeight: "600"
                    }}>
                      Servicios disponibles:
                    </div>
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      marginBottom: "12px"
                    }}>
                      {dest.services.map((service, index) => (
                        <span
                          key={index}
                          style={{
                            fontSize: "11px",
                            background: dest.type === "main" ? "#fef2f2" : "#eff6ff",
                            color: dest.type === "main" ? "#dc2626" : "#2563eb",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            border: `1px solid ${dest.type === "main" ? "#fecaca" : "#bfdbfe"}`
                          }}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      textAlign: "center",
                      fontFamily: "monospace"
                    }}>
                      {dest.coordinates[0].toFixed(4)}°N, {Math.abs(dest.coordinates[1]).toFixed(4)}°W
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Statistics Panel */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
      }}>
        <div style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "12px"
        }}>
          📊 Red de Clínicas
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.8" }}>
          <div>📍 <strong>6</strong> ubicaciones activas</div>
          <div>🏥 <strong>1</strong> clínica principal</div>
          <div>🏢 <strong>5</strong> sucursales</div>
          <div>📋 <strong>24/7</strong> emergencias</div>
          <div>🌐 <strong>100%</strong> funcional</div>
        </div>
      </div>

      {/* Coverage Areas */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        maxWidth: "300px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "8px"
        }}>
          🌟 Áreas de Cobertura
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "12px"
        }}>
          {destinations.map((dest) => (
            <div
              key={dest.id}
              style={{
                padding: "6px 8px",
                background: dest.type === "main" ? "#fef2f2" : "#eff6ff",
                color: dest.type === "main" ? "#dc2626" : "#2563eb",
                borderRadius: "6px",
                border: `1px solid ${dest.type === "main" ? "#fecaca" : "#bfdbfe"}`,
                textAlign: "center",
                cursor: "pointer"
              }}
              onClick={() => setSelectedDestination(selectedDestination === dest.id ? null : dest.id)}
            >
              {dest.neighborhood}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}