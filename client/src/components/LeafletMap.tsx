import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { customBlueIcon, customRedIcon } from '@/lib/leafletIcons';
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
  const [mapReady, setMapReady] = useState(false);
  
  // Primary online tile server
  const tileServer = {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };

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
        attribution={tileServer.attribution}
        url={tileServer.url}
        maxZoom={18}
        minZoom={1}
        tileSize={256}
        detectRetina={true}
        updateWhenIdle={false}
        updateWhenZooming={true}
        keepBuffer={2}
        eventHandlers={{
          tileload: () => {
            console.log('Map tiles loaded successfully');
          },
          loading: () => {
            console.log('Loading map tiles...');
          },
          load: () => {
            console.log('All map tiles loaded successfully');
          }
        }}
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