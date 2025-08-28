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
  const [currentTileIndex, setCurrentTileIndex] = useState(0);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  
  // Multiple reliable tile servers for failover
  const tileServers = [
    {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c']
    },
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri'
    },
    {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      attribution: '&copy; Google Maps'
    },
    {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: ['a', 'b', 'c', 'd']
    }
  ];
  
  const currentTileServer = tileServers[currentTileIndex];

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
        attribution={currentTileServer.attribution}
        url={currentTileServer.url}
        maxZoom={19}
        minZoom={1}
        tileSize={256}
        zoomOffset={0}
        detectRetina={true}
        updateWhenIdle={false}
        updateWhenZooming={true}
        keepBuffer={4}
        maxNativeZoom={18}
        subdomains={currentTileServer.subdomains || []}
        crossOrigin={true}
        eventHandlers={{
          tileload: () => {
            console.log(`✅ Tiles loading successfully from ${currentTileServer.attribution.includes('Google') ? 'Google Maps' : currentTileServer.attribution.includes('Esri') ? 'ArcGIS' : currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap'}`);
            setTilesLoaded(true);
            setErrorCount(0);
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              setLoadingTimeout(null);
            }
          },
          tileerror: (e) => {
            const newErrorCount = errorCount + 1;
            setErrorCount(newErrorCount);
            
            // Only switch servers after multiple errors (less sensitive)
            if (newErrorCount >= 5) {
              console.log(`❌ Server ${currentTileIndex + 1} consistently failing, trying next...`);
              if (currentTileIndex < tileServers.length - 1) {
                setCurrentTileIndex(prev => prev + 1);
                setErrorCount(0);
              } else {
                console.log('⚠️ All tile servers have issues, but continuing...');
              }
            }
          },
          loading: () => {
            console.log(`🔄 Loading map from ${currentTileServer.attribution.includes('Google') ? 'Google Maps' : currentTileServer.attribution.includes('Esri') ? 'ArcGIS' : currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap'}...`);
            setTilesLoaded(false);
            
            // Set a longer timeout for tile loading (10 seconds)
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
            }
            
            const timeout = setTimeout(() => {
              console.log(`⏰ Server ${currentTileIndex + 1} taking too long, trying next...`);
              if (currentTileIndex < tileServers.length - 1) {
                setCurrentTileIndex(prev => prev + 1);
                setErrorCount(0);
              }
            }, 10000);
            
            setLoadingTimeout(timeout);
          },
          load: () => {
            console.log(`🎉 Map fully loaded from ${currentTileServer.attribution.includes('Google') ? 'Google Maps' : currentTileServer.attribution.includes('Esri') ? 'ArcGIS' : currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap'}!`);
            setTilesLoaded(true);
            setErrorCount(0);
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              setLoadingTimeout(null);
            }
          }
        }}
        key={`tile-server-${currentTileIndex}`}
      />
      
      {/* Loading overlay - only show initially, not during server switches */}
      {!tilesLoaded && !mapReady && (
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-700 font-medium">Cargando mapa...</p>
            <p className="text-xs text-gray-500">
              {currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
               currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
               currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap'}
            </p>
          </div>
        </div>
      )}
      
      {/* Success indicator */}
      {tilesLoaded && (
        <div className="absolute top-2 right-2 z-20 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
          ✅ Mapa cargado
        </div>
      )}
      
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