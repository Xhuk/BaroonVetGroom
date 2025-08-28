import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { customBlueIcon, customRedIcon } from '@/lib/leafletIcons';
import MonterreyOfflineMap from './MonterreyOfflineMap';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  tenantLocation: { lat: number; lng: number };
  customerLocation: {
    lat: number;
    lng: number;
    address?: string;
    fraccionamiento?: string;
    clientName?: string;
    petName?: string;
  } | null;
  tenantName?: string;
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (lat: number, lng: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}

// Map Click Handler Component for Leaflet - Right click only
function MapClickHandler({ onMapClick }: { 
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault();
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LeafletMap({
  center,
  zoom,
  tenantLocation,
  customerLocation,
  tenantName,
  onMapClick,
  onMapMove,
  onCenterChange
}: LeafletMapProps) {
  const mapRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const [tileServerIndex, setTileServerIndex] = useState(0);
  const [allServersFailed, setAllServersFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Multiple tile server options as fallbacks
  const tileServers = [
    {
      url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: "abc"
    },
    {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      subdomains: "abc"
    },
    {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ""
    },
    {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd"
    }
  ];

  // Center map function that can be called externally
  const centerMapOnLocation = (lat: number, lng: number, zoomLevel: number = 16) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoomLevel);
      if (onCenterChange) {
        onCenterChange([lat, lng]);
      }
    }
  };

  // Expose the center function and handle map initialization
  useEffect(() => {
    if (mapRef.current && onCenterChange) {
      (mapRef.current as any).centerMapOnLocation = centerMapOnLocation;
    }
    
    // Force map resize after a short delay
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        setMapReady(true);
        console.log('Map initialized and resized');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [mapRef.current]);
  
  // Reset tile server on center change
  useEffect(() => {
    setTileServerIndex(0);
    setAllServersFailed(false);
  }, [center]);

  // Get current tile server safely
  const currentTileServer = tileServers[tileServerIndex] || tileServers[0];
  
  // Use offline Monterrey map when all tile servers fail
  if (allServersFailed || tileServerIndex >= tileServers.length) {
    return (
      <div className="relative">
        <MonterreyOfflineMap
          center={center}
          zoom={zoom}
          tenantLocation={tenantLocation ? { lat: tenantLocation.lat, lng: tenantLocation.lng } : undefined}
          customerLocation={customerLocation ? { lat: customerLocation.lat, lng: customerLocation.lng } : undefined}
          tenantName={tenantName}
          onMapClick={onMapClick}
          onMapMove={onMapMove}
          onCenterChange={onCenterChange}
        />
        <button 
          className="absolute top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 z-20"
          onClick={() => {
            setTileServerIndex(0);
            setAllServersFailed(false);
          }}
        >
          🔄 Reintentar mapa online
        </button>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', minHeight: '384px' }}
      className="rounded-lg leaflet-container"
      ref={mapRef}
      key={`${center[0]}-${center[1]}`}
    >
      <TileLayer
        attribution={currentTileServer.attribution}
        url={currentTileServer.url}
        maxZoom={18}
        minZoom={1}
        tileSize={256}
        subdomains={currentTileServer.subdomains}
        detectRetina={true}
        updateWhenIdle={false}
        updateWhenZooming={true}
        keepBuffer={2}
        errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        eventHandlers={{
          tileerror: (e) => {
            console.log(`Tile server ${tileServerIndex} failed, trying next...`, e);
            if (tileServerIndex < tileServers.length - 1) {
              const nextIndex = tileServerIndex + 1;
              console.log(`Switching to tile server ${nextIndex}`);
              setTileServerIndex(nextIndex);
            } else {
              console.log("All tile servers failed, showing fallback");
              setAllServersFailed(true);
            }
          },
          tileload: () => {
            console.log(`Tile server ${tileServerIndex} loaded successfully`);
          }
        }}
        key={tileServerIndex}
      />
      
      {/* Map Click Handler */}
      <MapClickHandler 
        onMapClick={onMapClick}
      />
      
      {/* Clinic Marker - Blue */}
      {tenantLocation.lat && tenantLocation.lng && (
        <Marker
          position={[tenantLocation.lat, tenantLocation.lng]}
          icon={customBlueIcon}
        >
          <Popup>
            <div className="text-center">
              <div className="font-semibold">Clínica Veterinaria</div>
              <div className="text-blue-600">{tenantName}</div>
              <div className="text-xs text-gray-500">
                GPS: {tenantLocation.lat}, {tenantLocation.lng}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Customer Marker - Green Paw with stable positioning using memoized position */}
      {customerLocation && customerLocation.lat && customerLocation.lng && (() => {
        const position: [number, number] = [Number(customerLocation.lat), Number(customerLocation.lng)];
        return (
          <Marker
            position={position}
            icon={customRedIcon}
            ref={customerMarkerRef}
          >
            <Popup>
              <div className="text-center">
                <div className="font-semibold text-green-700">
                  🐾 {customerLocation.clientName && customerLocation.petName 
                      ? `${customerLocation.clientName} - ${customerLocation.petName}` 
                      : 'Cliente - Mascota'}
                </div>
                <div className="text-xs text-gray-500">
                  {customerLocation.address || 'Ubicación seleccionada'}
                  {customerLocation.fraccionamiento && `, ${customerLocation.fraccionamiento}`}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })()}
    </MapContainer>
  );
}