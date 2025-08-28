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
  console.log("🗺️ [DEBUG] LeafletMap component mounted and initializing...");
  
  const mapRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentTileIndex, setCurrentTileIndex] = useState(0);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [serverErrorCounts, setServerErrorCounts] = useState<{[key: number]: number}>({});
  const [hasTriedAllServers, setHasTriedAllServers] = useState(false);
  
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

  // Debug current tile server on changes
  useEffect(() => {
    console.log(`🔧 [DEBUG] Tile server changed:`, {
      index: currentTileIndex,
      serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                 currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                 currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
      url: currentTileServer.url,
      subdomains: currentTileServer.subdomains || 'none',
      attribution: currentTileServer.attribution
    });
  }, [currentTileIndex, currentTileServer]);

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
          tileloadstart: (e) => {
            console.log(`🚀 [DEBUG] Tile load started:`, {
              server: currentTileIndex + 1,
              serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                         currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                         currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
              url: currentTileServer.url,
              coords: e.coords,
              tile: e.tile
            });
          },
          tileload: (e) => {
            console.log(`✅ [DEBUG] Tile loaded successfully:`, {
              server: currentTileIndex + 1,
              serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                         currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                         currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
              coords: e.coords,
              tileSize: e.tile ? `${e.tile.width}x${e.tile.height}` : 'unknown',
              tileSrc: e.tile ? e.tile.src : 'no source'
            });
            setTilesLoaded(true);
            setServerErrorCounts(prev => ({...prev, [currentTileIndex]: 0}));
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              setLoadingTimeout(null);
            }
          },
          tileerror: (e) => {
            console.log(`❌ [DEBUG] Tile error:`, {
              server: currentTileIndex + 1,
              serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                         currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                         currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
              coords: e.coords,
              error: e.error,
              tileSrc: e.tile ? e.tile.src : 'no source',
              tileComplete: e.tile ? e.tile.complete : 'unknown'
            });
            
            const currentErrors = serverErrorCounts[currentTileIndex] || 0;
            const newErrorCount = currentErrors + 1;
            setServerErrorCounts(prev => ({...prev, [currentTileIndex]: newErrorCount}));
            
            if (newErrorCount >= 10) {
              console.log(`❌ [DEBUG] Server ${currentTileIndex + 1} consistently failing, switching...`);
              if (currentTileIndex < tileServers.length - 1) {
                setCurrentTileIndex(prev => prev + 1);
              } else {
                setHasTriedAllServers(true);
                console.log('⚠️ [DEBUG] All servers tried, using best available');
              }
            }
          },
          loading: () => {
            console.log(`🔄 [DEBUG] Loading event triggered:`, {
              server: currentTileIndex + 1,
              serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                         currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                         currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
              serverUrl: currentTileServer.url,
              subdomains: currentTileServer.subdomains || 'none'
            });
            setTilesLoaded(false);
            
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
            }
            
            const timeout = setTimeout(() => {
              console.log(`⏰ [DEBUG] Server timeout reached:`, {
                server: currentTileIndex + 1,
                timeoutMs: 20000,
                switchingToNext: currentTileIndex < tileServers.length - 1 && !hasTriedAllServers
              });
              if (currentTileIndex < tileServers.length - 1 && !hasTriedAllServers) {
                setCurrentTileIndex(prev => prev + 1);
              }
            }, 20000);
            
            setLoadingTimeout(timeout);
          },
          load: () => {
            console.log(`🎉 [DEBUG] Load event complete:`, {
              server: currentTileIndex + 1,
              serverName: currentTileServer.attribution.includes('Google') ? 'Google Maps' : 
                         currentTileServer.attribution.includes('Esri') ? 'ArcGIS' :
                         currentTileServer.attribution.includes('CARTO') ? 'CARTO' : 'OpenStreetMap',
              tilesLoaded: true,
              mapReady: mapReady
            });
            setTilesLoaded(true);
            setServerErrorCounts(prev => ({...prev, [currentTileIndex]: 0}));
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              setLoadingTimeout(null);
            }
          }
        }}
        key={`tile-server-${currentTileIndex}`}
      />
      
      {/* Simplified loading overlay */}
      {!tilesLoaded && (
        <div className="absolute inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-700">Cargando mapa...</p>
          </div>
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