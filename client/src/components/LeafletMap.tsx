import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { customBlueIcon, customRedIcon } from '@/lib/leafletIcons';

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  tenantLocation: { lat: number; lng: number };
  customerLocation: {
    lat: number;
    lng: number;
    address?: string;
    fraccionamiento?: string;
  } | null;
  tenantName?: string;
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (lat: number, lng: number) => void;
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
  onMapMove
}: LeafletMapProps) {
  const mapRef = useRef<any>(null);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
      ref={mapRef}
      key={`${center[0]}-${center[1]}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      
      {/* Customer Marker - Red */}
      {customerLocation && (
        <Marker
          position={[customerLocation.lat, customerLocation.lng]}
          icon={customRedIcon}
        >
          <Popup>
            <div className="text-center">
              <div className="font-semibold text-red-700">Ubicación del Cliente</div>
              <div className="text-red-600">{customerLocation.address || 'Ubicación manual'}</div>
              <div className="text-red-600">{customerLocation.fraccionamiento || 'Clic en mapa'}</div>
              <div className="text-xs text-gray-500">
                GPS: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}