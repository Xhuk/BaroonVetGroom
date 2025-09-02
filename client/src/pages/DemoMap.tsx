import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Configure the default marker icon globally to prevent broken image links
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom icon for the main clinic, using an inline SVG for simplicity and consistency
const mainClinicIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-hospital'%3e%3cpath d='M12 6v4h4'/%3e%3cpath d='M22 12h-4V6H2v14h20Z'/%3e%3cpath d='M7 15h0'/%3e%3cpath d='M9 15h0'/%3e%3cpath d='M16 15h0'/%3e%3cpath d='M14 15h0'/%3e%3c/svg%3e",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -30],
});

// Custom icon for the branch clinics, also an inline SVG
const branchIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-hospital'%3e%3cpath d='M12 6v4h4'/%3e%3cpath d='M22 12h-4V6H2v14h20Z'/%3e%3cpath d='M7 15h0'/%3e%3cpath d='M9 15h0'/%3e%3cpath d='M16 15h0'/%3e%3cpath d='M14 15h0'/%3e%3c/svg%3e",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -25],
});

// A small component to manage map state changes, allowing us to update the
// map's view from the main component's state
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
  // State to manage the active tile provider
  const [currentProvider, setCurrentProvider] = useState(0);
  // State to manage the map's center coordinates
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.6866, -100.3161]);
  // State to manage the map's zoom level
  const [mapZoom, setMapZoom] = useState(11);

  // Array of available tile providers with their details
  const tileProviders = [
    {
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    {
      name: "CartoDB Dark",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    },
    {
      name: "CartoDB Positron",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    },
  ];

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
        >
          {/* Component to update map's view when state changes */}
          <ChangeView center={mapCenter} zoom={mapZoom} />
          {/* Tile layer for the map, changes when a new provider is selected */}
          <TileLayer
            key={currentProvider}
            attribution={tileProviders[currentProvider].attribution}
            url={tileProviders[currentProvider].url}
          />
          {/* Markers for each clinic location */}
          {destinations.map((destination) => (
            <Marker
              key={destination.id}
              position={destination.coordinates}
              icon={destination.type === "main" ? mainClinicIcon : branchIcon}
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
        {/* Map provider switcher */}
        <div className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-white shadow-xl flex gap-2">
          {tileProviders.map((provider, index) => (
            <button
              key={index}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ease-in-out ${
                index === currentProvider
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
              onClick={() => setCurrentProvider(index)}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemoMap;
