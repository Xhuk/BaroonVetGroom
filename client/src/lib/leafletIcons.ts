import L from 'leaflet';
import blueMarkerIcon from '@assets/marker-icon_1754283680600.png';
import pawMarkerIcon from '@assets/iconpaw_1754286092477.png';

// Fix for default markers in webpack - ensure proper cleanup
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom blue clinic marker
export const customBlueIcon = new L.Icon({
  iconUrl: blueMarkerIcon,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [13, 41]
});

// Custom green paw customer marker - eye-catching and bouncing
export const customRedIcon = new L.Icon({
  iconUrl: pawMarkerIcon,
  iconSize: [40, 40], // Square paw icon
  iconAnchor: [20, 20], // Center anchor for circular icon
  popupAnchor: [0, -20],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [50, 50],
  shadowAnchor: [25, 25]
});