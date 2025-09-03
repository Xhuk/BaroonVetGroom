import React, { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import '@maptiler/leaflet-maptilersdk'

// TypeScript declarations for MapTiler SDK
declare global {
  interface Window {
    L: typeof L & {
      maptiler?: {
        maptilerLayer: any
        MapStyle?: any
      }
    }
  }
}

// Custom Leaflet icons
const customRedIcon = L.divIcon({
  html: '<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: 'custom-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const customBlueIcon = L.divIcon({
  html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: 'custom-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// MapTiler Layer Component using proper SDK
const MapTilerLayer = ({ 
  apiKey, 
  style, 
  onReady 
}: { 
  apiKey: string
  style: string
  onReady?: () => void 
}) => {
  const map = useMap()
  
  useEffect(() => {
    if (!apiKey) {
      console.log('⏳ Waiting for API key...')
      return
    }
    
    console.log('🗺️ Creating MapTiler layer with style:', style)
    
    try {
      // Remove existing MapTiler layers
      map.eachLayer((layer: any) => {
        if (layer._url?.includes('maptiler') || layer.options?.apiKey) {
          map.removeLayer(layer)
        }
      })
      
      // Create standard tile layer for MapTiler
      const tileUrl = `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${apiKey}`
      console.log('🔗 Tile URL:', tileUrl)
      
      const mtLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      })
      
      mtLayer.addTo(map)
      console.log('✅ MapTiler layer added successfully')
      onReady?.()
      
    } catch (error) {
      console.error('❌ Error creating MapTiler layer:', error)
      // Fallback to OpenStreetMap if MapTiler fails
      console.log('🔄 Falling back to OpenStreetMap...')
      const fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
      fallbackLayer.addTo(map)
      onReady?.()
    }
  }, [map, apiKey, style])
  
  return null
}

// Component to manage map state changes
const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

interface Destination {
  id: number
  name: string
  address: string
  coordinates: [number, number]
  type: 'main' | 'branch'
  services: string[]
}

const MapTilerDemo = () => {
  // MapTiler SDK styles
  const mapStyles = [
    {
      name: "Streets",
      style: "streets", 
      attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    {
      name: "Basic",
      style: "basic",
      attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    {
      name: "Topo",
      style: "topo",
      attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  ]

  // State management
  const [currentStyle, setCurrentStyle] = useState(0)
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.6866, -100.3161])
  const [mapZoom, setMapZoom] = useState(11)
  const [apiKey] = useState('8QiHL60QHEh6e3pjSlhR') // Your MapTiler API key
  const [mapReady, setMapReady] = useState(false)
  
  // Log style changes
  useEffect(() => {
    console.log('🎯 Switched to style:', mapStyles[currentStyle]?.name)
  }, [currentStyle])

  // Get current style with bounds checking
  const getCurrentStyle = () => {
    const index = Math.max(0, Math.min(currentStyle, mapStyles.length - 1))
    return mapStyles[index]
  }

  const currentMapStyle = getCurrentStyle()

  // Data for the veterinary clinics
  const destinations: Destination[] = [
    {
      id: 1,
      name: "Clínica Veterinaria Principal",
      address: "Av. Vasconcelos 1500, Del Valle, 66220 San Pedro Garza García, N.L.",
      coordinates: [25.6866, -100.3161],
      type: "main",
      services: [
        "Consultas",
        "Emergencias",
        "Cirugías",
        "Laboratorio",
        "Hospitalización",
      ],
    },
    {
      id: 2,
      name: "Sucursal San Jerónimo",
      address: "Av. Puerta del Sol 400, Col. San Jerónimo, 64640 Monterrey, N.L.",
      coordinates: [25.6791, -100.3541],
      type: "branch",
      services: ["Consultas", "Vacunación", "Estética"],
    },
    {
      id: 3,
      name: "Sucursal Cumbres",
      address: "Av. Leones 300, Col. Cumbres 3er Sector, 64610 Monterrey, N.L.",
      coordinates: [25.7505, -100.3475],
      type: "branch",
      services: ["Consultas", "Vacunación", "Estética", "Rayos X"],
    },
    {
      id: 4,
      name: "Sucursal Contry",
      address: "Av. Eugenio Garza Sada 200, Col. Contry, 64860 Monterrey, N.L.",
      coordinates: [25.6321, -100.2709],
      type: "branch",
      services: ["Consultas", "Vacunación", "Laboratorio"],
    },
    {
      id: 5,
      name: "Sucursal Centro",
      address: "Calle Dr. Mier 500, Centro, 64000 Monterrey, N.L.",
      coordinates: [25.6691, -100.3094],
      type: "branch",
      services: ["Consultas", "Vacunación"],
    },
  ]

  // Function to handle clicks on the clinic list items
  const handleClinicClick = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
    setMapZoom(15)
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Sidebar Section */}
      <div style={{
        width: '320px',
        background: '#111827',
        color: 'white',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#14b8a6'
        }}>
          🏥 Clínicas Veterinarias
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Red de atención en Monterrey, Nuevo León
        </p>
        
        {/* MapTiler Status */}
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#1f2937',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
            🗺️ MapTiler SDK (Vite + React)
          </div>
          <div style={{ color: '#e5e7eb' }}>Style: {currentMapStyle?.name || 'None'}</div>
          <div style={{ color: '#9ca3af', marginTop: '4px' }}>
            {apiKey ? 'API key loaded' : 'Loading API key...'}
          </div>
          <div style={{ 
            color: mapReady ? '#10b981' : '#fbbf24', 
            marginTop: '4px' 
          }}>
            {mapReady ? 'Map ready' : 'Initializing...'}
          </div>
        </div>
        
        <div>
          {destinations.map((clinic) => (
            <div
              key={clinic.id}
              style={{
                background: '#374151',
                padding: '16px',
                marginBottom: '16px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => handleClinicClick(clinic.coordinates)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4b5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#374151'
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center'
              }}>
                {clinic.type === "main" ? "🏥" : "🏢"} {clinic.name}
              </h3>
              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {clinic.address}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {clinic.services.map((service, index) => (
                  <span
                    key={index}
                    style={{
                      background: '#4b5563',
                      color: '#e5e7eb',
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Section */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          whenReady={() => {
            console.log('🗺️ Map is ready, forcing tile refresh')
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'))
            }, 500)
          }}
        >
          {/* Component to update map's view when state changes */}
          <ChangeView center={mapCenter} zoom={mapZoom} />
          
          {/* MapTiler SDK Layer - render when API key is available */}
          {apiKey && (
            <MapTilerLayer 
              key={`maptiler-${currentStyle}-${Date.now()}`}
              apiKey={apiKey} 
              style={currentMapStyle?.style || 'basic'}
              onReady={() => setMapReady(true)}
            />
          )}
          
          {/* Markers for each clinic location */}
          {destinations.map((destination) => (
            <Marker
              key={destination.id}
              position={destination.coordinates}
              icon={destination.type === "main" ? customRedIcon : customBlueIcon}
            >
              {/* Popup that appears when a marker is clicked */}
              <Popup>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: '8px',
                    color: '#111827'
                  }}>
                    {destination.name}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {destination.address}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {destination.services.map((service, index) => (
                      <span
                        key={index}
                        style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Map style switcher */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '12px',
          borderRadius: '8px',
          background: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#374151',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            Map Style:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {mapStyles.map((styleObj, index) => (
              <button
                key={index}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  background: index === currentStyle ? '#3b82f6' : '#e5e7eb',
                  color: index === currentStyle ? 'white' : '#374151'
                }}
                onClick={() => {
                  console.log('🔄 Switching to style:', styleObj.name)
                  setCurrentStyle(index)
                  setMapReady(false) // Reset ready state for new style
                }}
                disabled={!apiKey}
              >
                {styleObj.name}
              </button>
            ))}
          </div>
          {!apiKey && (
            <div style={{
              fontSize: '12px',
              color: '#dc2626',
              marginTop: '8px'
            }}>
              Loading API key...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapTilerDemo