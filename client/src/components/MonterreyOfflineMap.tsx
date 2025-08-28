import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface MonterreyOfflineMapProps {
  center: [number, number];
  zoom: number;
  tenantLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  tenantName?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMapMove?: (lat: number, lng: number) => void;
  onCenterChange?: (centerFunction: any) => void;
}

export default function MonterreyOfflineMap({
  center,
  zoom,
  tenantLocation,
  customerLocation,
  tenantName,
  onMapClick,
  onMapMove,
  onCenterChange
}: MonterreyOfflineMapProps) {
  const mapRef = useRef<SVGSVGElement>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState(zoom);

  // Monterrey bounds: roughly 25.6-25.8 lat, -100.5 to -100.2 lng
  const MONTERREY_BOUNDS = {
    north: 25.8,
    south: 25.6,
    east: -100.2,
    west: -100.5
  };

  // Convert lat/lng to SVG coordinates
  const latLngToSVG = (lat: number, lng: number, width: number = 800, height: number = 600) => {
    const x = ((lng - MONTERREY_BOUNDS.west) / (MONTERREY_BOUNDS.east - MONTERREY_BOUNDS.west)) * width;
    const y = ((MONTERREY_BOUNDS.north - lat) / (MONTERREY_BOUNDS.north - MONTERREY_BOUNDS.south)) * height;
    return { x, y };
  };

  // Convert SVG coordinates back to lat/lng
  const svgToLatLng = (x: number, y: number, width: number = 800, height: number = 600) => {
    const lng = MONTERREY_BOUNDS.west + (x / width) * (MONTERREY_BOUNDS.east - MONTERREY_BOUNDS.west);
    const lat = MONTERREY_BOUNDS.north - (y / height) * (MONTERREY_BOUNDS.north - MONTERREY_BOUNDS.south);
    return { lat, lng };
  };

  const handleMapClick = (event: React.MouseEvent<SVGElement>) => {
    if (!onMapClick) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const { lat, lng } = svgToLatLng(x, y, rect.width, rect.height);
    onMapClick(lat, lng);
  };

  const centerMapOnLocation = (lat: number, lng: number, zoomLevel: number = 16) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoomLevel);
    console.log(`Centering offline map on: ${lat}, ${lng} zoom: ${zoomLevel}`);
  };

  // Expose center function
  useEffect(() => {
    if (onCenterChange) {
      onCenterChange(centerMapOnLocation);
    }
  }, [onCenterChange]);

  // Major streets and landmarks in Monterrey
  const monterreyFeatures = [
    // Major avenues
    { type: 'road', name: 'Av. Constitución', coordinates: [[25.67, -100.31], [25.68, -100.31], [25.70, -100.31]] },
    { type: 'road', name: 'Av. Universidad', coordinates: [[25.67, -100.34], [25.68, -100.34], [25.70, -100.34]] },
    { type: 'road', name: 'Av. Gonzalitos', coordinates: [[25.66, -100.33], [25.69, -100.33], [25.72, -100.33]] },
    { type: 'road', name: 'Av. Revolución', coordinates: [[25.67, -100.35], [25.68, -100.35], [25.70, -100.35]] },
    
    // Landmarks
    { type: 'landmark', name: 'Centro de Monterrey', coordinates: [[25.669, -100.309]] },
    { type: 'landmark', name: 'Cerro de la Silla', coordinates: [[25.635, -100.23]] },
    { type: 'landmark', name: 'Macroplaza', coordinates: [[25.669, -100.310]] },
    { type: 'landmark', name: 'UANL', coordinates: [[25.726, -100.314]] },
  ];

  return (
    <div className="w-full h-96 bg-gray-50 border-2 border-gray-200 rounded-lg relative overflow-hidden">
      {/* Map Title */}
      <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-90 rounded px-2 py-1 text-sm font-medium text-gray-700">
        📍 Mapa de Monterrey (Offline)
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1">
        <Button 
          size="sm" 
          variant="outline"
          className="w-8 h-8 p-0 bg-white"
          onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
        >
          +
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="w-8 h-8 p-0 bg-white"
          onClick={() => setMapZoom(prev => Math.max(prev - 1, 8))}
        >
          −
        </Button>
      </div>

      {/* SVG Map */}
      <svg 
        ref={mapRef}
        width="100%" 
        height="100%" 
        viewBox="0 0 800 600"
        className="cursor-crosshair"
        onClick={handleMapClick}
      >
        {/* Background */}
        <rect width="800" height="600" fill="#f0f9ff" />
        
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid)" />

        {/* Major roads */}
        {monterreyFeatures
          .filter(f => f.type === 'road')
          .map((road, index) => {
            const pathData = road.coordinates
              .map((coord, i) => {
                const { x, y } = latLngToSVG(coord[0], coord[1]);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');
            
            return (
              <path
                key={index}
                d={pathData}
                stroke="#6b7280"
                strokeWidth="3"
                fill="none"
                opacity="0.7"
              />
            );
          })}

        {/* Landmarks */}
        {monterreyFeatures
          .filter(f => f.type === 'landmark')
          .map((landmark, index) => {
            const { x, y } = latLngToSVG(landmark.coordinates[0][0], landmark.coordinates[0][1]);
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="6" fill="#3b82f6" opacity="0.8" />
                <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#1f2937" fontWeight="bold">
                  {landmark.name}
                </text>
              </g>
            );
          })}

        {/* Tenant Location Marker */}
        {tenantLocation && (
          <g>
            {(() => {
              const { x, y } = latLngToSVG(tenantLocation.lat, tenantLocation.lng);
              return (
                <>
                  <circle cx={x} cy={y} r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y={y + 25} textAnchor="middle" fontSize="12" fill="#ef4444" fontWeight="bold">
                    🏥 {tenantName || 'Clínica'}
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* Customer Location Marker */}
        {customerLocation && (
          <g>
            {(() => {
              const { x, y } = latLngToSVG(customerLocation.lat, customerLocation.lng);
              return (
                <>
                  <circle cx={x} cy={y} r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y={y + 20} textAnchor="middle" fontSize="12" fill="#10b981" fontWeight="bold">
                    📍 Cliente
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* Center crosshair */}
        {(() => {
          const { x, y } = latLngToSVG(mapCenter[0], mapCenter[1]);
          return (
            <g opacity="0.5">
              <line x1={x - 15} y1={y} x2={x + 15} y2={y} stroke="#6b7280" strokeWidth="2" />
              <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke="#6b7280" strokeWidth="2" />
            </g>
          );
        })()}
      </svg>

      {/* Coordinates Display */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600">
        Centro: {mapCenter[0].toFixed(4)}, {mapCenter[1].toFixed(4)} | Zoom: {mapZoom}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-500">
        Haz clic para establecer ubicación
      </div>
    </div>
  );
}