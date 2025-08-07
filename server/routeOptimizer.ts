import { RouteOptimizationConfig } from "@shared/schema";

interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  petCount?: number;
  cageType?: 'small' | 'medium' | 'large';
  fraccionamiento?: string;
  appointmentId?: string;
  petId?: string;
  petName?: string;
  clientName?: string;
  completedStatus?: string;
  weight?: number;
}

interface OptimizedRoute {
  points: RoutePoint[];
  totalDistance: number;
  estimatedTime: number;
  efficiency: number;
  routeSequence: string[];
  fraccionamientoOrder: { name: string; weight: number; stopCount: number }[];
}

interface RouteOptimizationOptions {
  clinicLocation: [number, number];
  completedAppointments: RoutePoint[];
  vanCapacity: 'small' | 'medium' | 'large';
  fraccionamientoWeights: Record<string, number>;
  config?: RouteOptimizationConfig;
}

interface VRPSolution {
  routes: RoutePoint[][];
  totalDistance: number;
  totalVehicles: number;
  efficiency: number;
}

// Van capacity limits
const VAN_CAPACITIES = {
  small: { maxPets: 8, maxWeight: 50 },
  medium: { maxPets: 15, maxWeight: 100 },
  large: { maxPets: 25, maxWeight: 150 }
};

/**
 * Calculate distance between two geographic points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Classic Vehicle Routing Problem (VRP) solver with delivery constraints
 * Uses nearest neighbor heuristic with fraccionamiento weight optimization
 */
function solveVRP(options: RouteOptimizationOptions): VRPSolution {
  const { clinicLocation, completedAppointments, fraccionamientoWeights, vanCapacity } = options;
  const capacity = VAN_CAPACITIES[vanCapacity];
  
  // Filter only completed appointments ready for delivery pickup
  const deliveryReadyPoints = completedAppointments.filter(apt => 
    apt.completedStatus === 'completed' && apt.latitude && apt.longitude
  );
  
  if (deliveryReadyPoints.length === 0) {
    return {
      routes: [],
      totalDistance: 0,
      totalVehicles: 0,
      efficiency: 0
    };
  }
  
  // Group by fraccionamiento and apply weights
  const fraccionamientoGroups = deliveryReadyPoints.reduce((groups, point) => {
    const frac = point.fraccionamiento || 'unknown';
    const weight = fraccionamientoWeights[frac] || 5.0;
    
    if (!groups[frac]) {
      groups[frac] = { points: [], weight, totalPets: 0 };
    }
    
    groups[frac].points.push(point);
    groups[frac].totalPets += point.petCount || 1;
    
    return groups;
  }, {} as Record<string, { points: RoutePoint[], weight: number, totalPets: number }>);
  
  // Sort fraccionamientos by weight (lower = higher priority)
  const sortedFraccionamientos = Object.entries(fraccionamientoGroups)
    .sort(([, a], [, b]) => a.weight - b.weight);
  
  const routes: RoutePoint[][] = [];
  let totalDistance = 0;
  
  // VRP nearest neighbor algorithm with capacity constraints
  for (const [fracName, group] of sortedFraccionamientos) {
    let currentRoute: RoutePoint[] = [];
    let currentCapacity = 0;
    let currentLocation = clinicLocation;
    let remainingPoints = [...group.points];
    
    // Sort initial points by geographic proximity (eastward preference)
    remainingPoints.sort((a, b) => {
      const distA = calculateDistance(currentLocation[0], currentLocation[1], a.latitude, a.longitude);
      const distB = calculateDistance(currentLocation[0], currentLocation[1], b.latitude, b.longitude);
      
      // Apply eastward bias - prefer points with higher longitude
      const eastBiasA = a.longitude * 0.1; // Small bias factor
      const eastBiasB = b.longitude * 0.1;
      
      return (distA - eastBiasA) - (distB - eastBiasB);
    });
    
    while (remainingPoints.length > 0) {
      let nearestPoint: RoutePoint | null = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;
      
      // Find nearest unvisited point within capacity
      for (let i = 0; i < remainingPoints.length; i++) {
        const point = remainingPoints[i];
        const petCount = point.petCount || 1;
        
        if (currentCapacity + petCount <= capacity.maxPets) {
          const distance = calculateDistance(
            currentLocation[0], currentLocation[1],
            point.latitude, point.longitude
          );
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPoint = point;
            nearestIndex = i;
          }
        }
      }
      
      if (nearestPoint) {
        currentRoute.push(nearestPoint);
        currentCapacity += nearestPoint.petCount || 1;
        currentLocation = [nearestPoint.latitude, nearestPoint.longitude];
        totalDistance += nearestDistance;
        remainingPoints.splice(nearestIndex, 1);
      } else {
        // Start new route if capacity exceeded
        if (currentRoute.length > 0) {
          routes.push([...currentRoute]);
          currentRoute = [];
          currentCapacity = 0;
          currentLocation = clinicLocation;
        } else {
          // Can't fit any more points, break
          break;
        }
      }
    }
    
    if (currentRoute.length > 0) {
      routes.push(currentRoute);
    }
  }
  
  return {
    routes,
    totalDistance,
    totalVehicles: routes.length,
    efficiency: deliveryReadyPoints.length / Math.max(routes.length, 1)
  };
}

/**
 * Enhanced route optimization using VRP algorithms with fraccionamiento priorities
 */
function optimizeDeliveryRoute(options: RouteOptimizationOptions): OptimizedRoute {
  const { clinicLocation, completedAppointments, fraccionamientoWeights } = options;
  
  // Solve using VRP algorithm
  const vrpSolution = solveVRP(options);
  
  if (vrpSolution.routes.length === 0) {
    return {
      points: [],
      totalDistance: 0,
      estimatedTime: 0,
      efficiency: 0,
      routeSequence: [],
      fraccionamientoOrder: []
    };
  }
  
  // Combine all routes into single optimized sequence
  const optimizedPoints: RoutePoint[] = [];
  const routeSequence: string[] = [];
  const fraccionamientoStats: Record<string, { weight: number; stopCount: number }> = {};
  
  for (const route of vrpSolution.routes) {
    for (const point of route) {
      optimizedPoints.push(point);
      routeSequence.push(`${point.clientName} - ${point.petName} (${point.fraccionamiento})`);
      
      const frac = point.fraccionamiento || 'unknown';
      if (!fraccionamientoStats[frac]) {
        fraccionamientoStats[frac] = {
          weight: fraccionamientoWeights[frac] || 5.0,
          stopCount: 0
        };
      }
      fraccionamientoStats[frac].stopCount++;
    }
  }
  
  const fraccionamientoOrder = Object.entries(fraccionamientoStats)
    .map(([name, stats]) => ({ name, weight: stats.weight, stopCount: stats.stopCount }))
    .sort((a, b) => a.weight - b.weight);
  
  return {
    points: optimizedPoints,
    totalDistance: vrpSolution.totalDistance,
    estimatedTime: Math.round(vrpSolution.totalDistance * 3 + optimizedPoints.length * 5), // 3 min/km + 5 min/stop
    efficiency: vrpSolution.efficiency,
    routeSequence,
    fraccionamientoOrder
  };
}

// Export the main optimization function
export { optimizeDeliveryRoute, solveVRP, calculateDistance };

/**
 * Main function for delivery route optimization
 * Filters completed mascots and uses pet addresses for routing
 */
export function optimizeDeliveryRouteWithCompletedMascots(
  clinicLocation: [number, number],
  completedAppointmentsWithPetData: any[],
  fraccionamientoWeights: Record<string, number>,
  vanCapacity: 'small' | 'medium' | 'large' = 'medium'
): OptimizedRoute {
  
  // Transform completed appointments into route points
  const completedRoutePoints: RoutePoint[] = completedAppointmentsWithPetData
    .filter(apt => apt.status === 'completed' && apt.client?.latitude && apt.client?.longitude)
    .map(apt => ({
      id: apt.id,
      latitude: parseFloat(apt.client.latitude),
      longitude: parseFloat(apt.client.longitude),
      address: apt.client.address,
      fraccionamiento: apt.client.fraccionamiento,
      appointmentId: apt.id,
      petId: apt.pet?.id,
      petName: apt.pet?.name,
      clientName: apt.client?.name,
      completedStatus: apt.status,
      petCount: 1,
      weight: apt.pet?.weight ? parseFloat(apt.pet.weight) : 5.0
    }));

  const options: RouteOptimizationOptions = {
    clinicLocation,
    completedAppointments: completedRoutePoints,
    vanCapacity,
    fraccionamientoWeights
  };

  return optimizeDeliveryRoute(options);
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

// Export aliases for backward compatibility
export const optimizeDeliveryRoute = advancedRouteOptimization;
export function generateOptimizationPrompt(options: RouteOptimizationOptions): string {
  return `Optimizing delivery route for ${options.appointments.length} appointments with ${options.vanCapacity} van capacity.`;
}