import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "@maptiler/leaflet-maptilersdk";
import { customBlueIcon, customRedIcon } from "@/lib/leafletIcons";

// TypeScript declarations for MapTiler SDK
declare global {
  interface Window {
    L: typeof L & {
      maptiler?: {
        maptilerLayer: any;
        MapStyle?: any;
      };
    };
  }
}

// MapTiler Layer Component using proper SDK
const MapTilerLayer = ({ apiKey, style, onReady }: { apiKey: string; style: string; onReady?: () => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!apiKey) {
      console.log('⏳ Waiting for API key...');
      return;
    }
    
    // Check if MapTiler SDK is loaded
    if (!(window as any).L?.maptiler?.maptilerLayer) {
      console.log('⏳ Waiting for MapTiler SDK...');
      // Try to load it after a short delay
      const timer = setTimeout(() => {
        if ((window as any).L?.maptiler?.maptilerLayer) {
          console.log('✅ MapTiler SDK loaded');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    console.log('🗺️ Creating MapTiler layer with style:', style);
    
    try {
      // Remove existing MapTiler layers
      map.eachLayer((layer: any) => {
        if (layer._url?.includes('maptiler') || layer.options?.apiKey) {
          map.removeLayer(layer);
        }
      });
      
      // Create MapTiler layer using the SDK
      const mtLayer = new (window as any).L.maptiler.maptilerLayer({
        apiKey: apiKey,
        style: style,
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

// A small component to manage map state changes
const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

interface Destination {
  id: number;
  name: string;
  address: string;
  coordinates: [number, number];
  type: 'main' | 'branch';
  services: string[];
}

const DemoMap = () => {
  // MapTiler SDK styles - using proper SDK approach
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
  ];

  // State to manage the active map style
  const [currentStyle, setCurrentStyle] = useState(0);
  // State to manage the map's center coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.6866, -100.3161]);
  // State to manage the map's zoom level
  const [mapZoom, setMapZoom] = useState(11);
  // MapTiler API key state
  const [apiKey, setApiKey] = useState('');
  // Map ready state
  const [mapReady, setMapReady] = useState(false);
  
  // Load MapTiler API key on mount
  useEffect(() => {
    console.log('🗺️ DemoMap mounted, loading MapTiler API key...');
    
    fetch('/api/config/maptiler')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey && data.apiKey.length > 0) {
          setApiKey(data.apiKey);
          console.log('✅ MapTiler API key loaded');
        } else {
          console.warn('⚠️ No MapTiler API key available');
        }
      })
      .catch(err => {
        console.error('❌ Failed to load MapTiler API key:', err);
      });
  }, []);
  
  // Log style changes
  useEffect(() => {
    console.log('🎯 Switched to style:', mapStyles[currentStyle]?.name);
  }, [currentStyle]);

  // Get current style with bounds checking
  const getCurrentStyle = () => {
    const index = Math.max(0, Math.min(currentStyle, mapStyles.length - 1));
    return mapStyles[index];
  };

  const currentMapStyle = getCurrentStyle();

  // Data for the veterinary clinics
  const destinations: Destination[] = [
    {
      id: 1,
      name: "Clínica Veterinaria Principal",
      address:
        "Av. Vasconcelos 1500, Del Valle, 66220 San Pedro Garza García, N.L.",
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
      address:
        "Av. Puerta del Sol 400, Col. San Jerónimo, 64640 Monterrey, N.L.",
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
      name: "Sucursal Carretera Nacional",
      address: "Carretera Nacional 500, Col. La Rioja, 64988 Monterrey, N.L.",
      coordinates: [25.5678, -100.2643],
      type: "branch",
      services: ["Consultas", "Vacunación"],
    },
    {
      id: 6,
      name: "Sucursal Centro",
      address: "Calle Dr. Mier 500, Centro, 64000 Monterrey, N.L.",
      coordinates: [25.6691, -100.3094],
      type: "branch",
      services: ["Consultas", "Vacunación"],
    },
  ];

  // Function to handle clicks on the clinic list items
  const handleClinicClick = (coordinates: [number, number]) => {
    setMapCenter(coordinates);
    setMapZoom(15);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full font-inter overflow-hidden">
      {/* Sidebar Section */}
      <div className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 bg-gray-900 text-white p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4 text-center text-teal-400">
          Clínicas Veterinarias
        </h1>
        <p className="text-sm text-gray-400 mb-6 text-center">
          Red de atención en Monterrey, Nuevo León
        </p>
        
        {/* MapTiler SDK Status */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-xs">
          <div className="text-green-400 font-semibold mb-1">🗺️ MapTiler SDK</div>
          <div className="text-gray-300">Style: {currentMapStyle?.name || 'None'}</div>
          <div className="text-gray-400 mt-1">
            {apiKey ? 'API key loaded' : 'Loading API key...'}
          </div>
          <div className={mapReady ? "text-green-400 mt-1" : "text-yellow-400 mt-1"}>
            {mapReady ? 'Map ready' : 'Initializing...'}
          </div>
        </div>
        
        <div className="space-y-4">
          {destinations.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-gray-800 p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => handleClinicClick(clinic.coordinates)}
            >
              <h3 className="text-lg font-semibold flex items-center mb-1">
                {clinic.type === "main" ? "🏥" : "🏢"} {clinic.name}
              </h3>
              <p className="text-xs text-gray-400 truncate">{clinic.address}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {clinic.services.map((service, index) => (
                  <span
                    key={index}
                    className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full"
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
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          whenReady={() => {
            console.log('🗺️ Map is ready, forcing tile refresh');
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 500);
          }}
        >
          {/* Component to update map's view when state changes */}
          <ChangeView center={mapCenter} zoom={mapZoom} />
          
          {/* MapTiler SDK Layer - only render when API key is available */}
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
                <div className="font-inter">
                  <h3 className="text-lg font-bold text-center mb-2">
                    {destination.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {destination.address}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {destination.services.map((service, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
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
        <div className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-white shadow-xl">
          <div className="text-xs text-gray-600 mb-2 font-semibold">Map Style:</div>
          <div className="flex flex-col gap-1">
            {mapStyles.map((styleObj, index) => (
              <button
                key={index}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ease-in-out ${
                  index === currentStyle
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => {
                  console.log('🔄 Switching to style:', styleObj.name);
                  setCurrentStyle(index);
                  setMapReady(false); // Reset ready state for new style
                }}
                disabled={!apiKey}
              >
                {styleObj.name}
              </button>
            ))}
          </div>
          {!apiKey && (
            <div className="text-xs text-red-600 mt-2">
              Loading API key...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoMap;
