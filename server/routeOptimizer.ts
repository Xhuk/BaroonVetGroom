import { RouteOptimizationConfig } from "@shared/schema";

interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  petCount?: number;
  cageType?: 'small' | 'medium' | 'large';
  fraccionamiento?: string;
}

interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number;
  estimatedTime: number;
  efficiency: number;
}

interface RouteOptimizationOptions {
  clinicLocation: [number, number];
  appointments: RoutePoint[];
  vanCapacity: 'small' | 'medium' | 'large';
  fraccionamientoWeights: Record<string, number>;
  config?: RouteOptimizationConfig;
}

// Van capacity limits
const VAN_CAPACITIES = {
  small: { maxPets: 8, maxWeight: 50 },
  medium: { maxPets: 15, maxWeight: 100 },
  large: { maxPets: 25, maxWeight: 150 }
};

/**
 * Simple weight-based route optimization using fraccionamiento weights
 * and "turn right gross mode" from tenant location
 */
function simpleWeightBasedRouting(options: RouteOptimizationOptions): OptimizedRoute {
  const { clinicLocation, appointments, fraccionamientoWeights, vanCapacity } = options;
  const capacity = VAN_CAPACITIES[vanCapacity];
  
  // Group appointments by fraccionamiento and apply weights
  const weightedGroups = appointments.reduce((groups, apt) => {
    const frac = apt.fraccionamiento || 'unknown';
    const weight = fraccionamientoWeights[frac] || 5.0; // Default weight
    
    if (!groups[frac]) {
      groups[frac] = { appointments: [], weight, totalPets: 0 };
    }
    
    groups[frac].appointments.push(apt);
    groups[frac].totalPets += apt.petCount || 1;
    
    return groups;
  }, {} as Record<string, { appointments: RoutePoint[], weight: number, totalPets: number }>);
  
  // Sort fraccionamientos by weight (lower weight = higher priority)
  const sortedFraccionamientos = Object.entries(weightedGroups)
    .sort(([, a], [, b]) => a.weight - b.weight);
  
  const optimizedRoute: RoutePoint[] = [];
  let currentCapacity = 0;
  
  // Start from clinic location
  const clinicPoint: RoutePoint = {
    id: 'clinic',
    latitude: clinicLocation[0],
    longitude: clinicLocation[1],
    address: 'Clínica Veterinaria'
  };
  
  // Apply "turn right gross mode" - prioritize eastward movement first
  for (const [fracName, group] of sortedFraccionamientos) {
    // Sort appointments within fraccionamiento by longitude (eastward first)
    const sortedApps = group.appointments.sort((a, b) => b.longitude - a.longitude);
    
    for (const apt of sortedApps) {
      const petCount = apt.petCount || 1;
      
      // Check capacity constraints
      if (currentCapacity + petCount <= capacity.maxPets) {
        optimizedRoute.push(apt);
        currentCapacity += petCount;
      } else {
        // Van is full, would need multiple routes
        break;
      }
    }
  }
  
  // Calculate simple distance estimation
  let totalDistance = 0;
  let prevPoint = clinicPoint;
  
  for (const point of optimizedRoute) {
    const distance = calculateHaversineDistance(
      prevPoint.latitude, prevPoint.longitude,
      point.latitude, point.longitude
    );
    totalDistance += distance;
    prevPoint = point;
  }
  
  // Return to clinic
  totalDistance += calculateHaversineDistance(
    prevPoint.latitude, prevPoint.longitude,
    clinicPoint.latitude, clinicPoint.longitude
  );
  
  return {
    points: optimizedRoute,
    totalDistance: Math.round(totalDistance * 100) / 100,
    estimatedTime: Math.round(totalDistance * 3.5), // ~3.5 minutes per km in city
    efficiency: Math.round((optimizedRoute.length / appointments.length) * 100)
  };
}

/**
 * Advanced route optimization using external providers (Mapbox, Google, HERE)
 */
async function advancedRouteOptimization(options: RouteOptimizationOptions): Promise<OptimizedRoute> {
  const { config } = options;
  
  if (!config || !config.isEnabled || config.provider === 'none') {
    return simpleWeightBasedRouting(options);
  }
  
  try {
    switch (config.provider) {
      case 'mapbox':
        return await optimizeWithMapbox(options);
      case 'google':
        return await optimizeWithGoogle(options);
      case 'here':
        return await optimizeWithHere(options);
      default:
        return simpleWeightBasedRouting(options);
    }
  } catch (error) {
    console.warn('Advanced routing failed, using fallback:', error);
    return simpleWeightBasedRouting(options);
  }
}

/**
 * Mapbox route optimization
 */
async function optimizeWithMapbox(options: RouteOptimizationOptions): Promise<OptimizedRoute> {
  const { clinicLocation, appointments, config } = options;
  
  if (!config?.apiKey) {
    throw new Error('Mapbox API key not configured');
  }
  
  // Prepare coordinates for Mapbox Optimization API
  const coordinates = [
    clinicLocation,
    ...appointments.map(apt => [apt.longitude, apt.latitude] as [number, number])
  ];
  
  const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.map(coord => coord.join(',')).join(';')}`;
  const params = new URLSearchParams({
    access_token: config.apiKey,
    source: 'first',
    destination: 'first',
    roundtrip: 'true',
    geometries: 'geojson'
  });
  
  const response = await fetch(`${url}?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${data.message}`);
  }
  
  // Parse Mapbox response
  const trip = data.trips[0];
  const optimizedPoints = trip.waypoints
    .slice(1, -1) // Remove start/end clinic points
    .map((wp: any, index: number) => appointments[wp.waypoint_index - 1]);
  
  return {
    points: optimizedPoints,
    totalDistance: Math.round(trip.distance / 1000 * 100) / 100, // Convert m to km
    estimatedTime: Math.round(trip.duration / 60), // Convert s to minutes
    efficiency: 95 // Mapbox provides high efficiency
  };
}

/**
 * Google Maps route optimization  
 */
async function optimizeWithGoogle(options: RouteOptimizationOptions): Promise<OptimizedRoute> {
  // Implementation for Google Routes API
  // Similar structure to Mapbox but using Google's API
  return simpleWeightBasedRouting(options); // Fallback for now
}

/**
 * HERE Maps route optimization
 */
async function optimizeWithHere(options: RouteOptimizationOptions): Promise<OptimizedRoute> {
  // Implementation for HERE Routing API
  // Similar structure to Mapbox but using HERE's API  
  return simpleWeightBasedRouting(options); // Fallback for now
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export {
  simpleWeightBasedRouting,
  advancedRouteOptimization,
  type RoutePoint,
  type OptimizedRoute,
  type RouteOptimizationOptions
};