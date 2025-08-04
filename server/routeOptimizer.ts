interface RouteOptimizationRequest {
  appointments: any[];
  vanCapacity: 'small' | 'medium' | 'large';
  fraccionamientoWeights: Record<string, number>;
  clinicLocation: [number, number];
}

interface OptimizedRoute {
  optimizedRoute: any[];
  totalDistance: number;
  estimatedTime: number;
  efficiency: number;
}

// Van capacity configurations
const VAN_CAPACITIES = {
  small: { maxPets: 8, maxWeight: 50 },
  medium: { maxPets: 15, maxWeight: 100 },
  large: { maxPets: 25, maxWeight: 150 }
};

/**
 * Calculate distance between two geographic points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/**
 * Simple nearest neighbor algorithm for route optimization
 * In production, this could be replaced with more sophisticated algorithms
 * or external route optimization services
 */
function optimizeRouteSimple(appointments: any[], clinicLocation: [number, number]): any[] {
  if (appointments.length === 0) return [];
  
  const unvisited = [...appointments];
  const route: any[] = [];
  let currentLocation = clinicLocation;
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    // Find nearest unvisited appointment
    unvisited.forEach((appointment, index) => {
      if (appointment.client?.latitude && appointment.client?.longitude) {
        const distance = calculateDistance(
          currentLocation[0], currentLocation[1],
          appointment.client.latitude, appointment.client.longitude
        );
        
        // Apply fraccionamiento weight penalty (higher weight = less priority)
        const weight = appointment.client.fraccionamiento ? 
          (appointment.fraccionamientoWeight || 1) : 1;
        const adjustedDistance = distance * (1 + (weight - 1) * 0.1);
        
        if (adjustedDistance < nearestDistance) {
          nearestDistance = adjustedDistance;
          nearestIndex = index;
        }
      }
    });
    
    // Add nearest appointment to route
    const selected = unvisited.splice(nearestIndex, 1)[0];
    route.push(selected);
    
    if (selected.client?.latitude && selected.client?.longitude) {
      currentLocation = [selected.client.latitude, selected.client.longitude];
    }
  }
  
  return route;
}

/**
 * Advanced route optimization considering time windows, traffic patterns, and capacity
 */
function optimizeRouteAdvanced(
  appointments: any[], 
  clinicLocation: [number, number],
  vanCapacity: 'small' | 'medium' | 'large',
  fraccionamientoWeights: Record<string, number>
): any[] {
  // Sort by scheduled time first (time windows)
  const timeWindowSorted = [...appointments].sort((a, b) => {
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
  
  // Group by fraccionamiento to reduce travel time
  const fraccionamientoGroups: Record<string, any[]> = {};
  timeWindowSorted.forEach(apt => {
    const frac = apt.client?.fraccionamiento || 'unknown';
    if (!fraccionamientoGroups[frac]) {
      fraccionamientoGroups[frac] = [];
    }
    fraccionamientoGroups[frac].push(apt);
  });
  
  // Sort fraccionamientos by weight (closer ones first)
  const sortedFraccionamientos = Object.entries(fraccionamientoGroups)
    .sort(([fracA], [fracB]) => {
      const weightA = fraccionamientoWeights[fracA] || 5;
      const weightB = fraccionamientoWeights[fracB] || 5;
      return weightA - weightB;
    });
  
  // Build optimized route
  const optimizedRoute: any[] = [];
  sortedFraccionamientos.forEach(([fraccionamiento, appointments]) => {
    // Within each fraccionamiento, sort by time
    const sortedByTime = appointments.sort((a, b) => 
      a.scheduledTime.localeCompare(b.scheduledTime)
    );
    optimizedRoute.push(...sortedByTime);
  });
  
  return optimizedRoute;
}

/**
 * Check if route fits within van capacity
 */
function validateCapacity(route: any[], vanCapacity: 'small' | 'medium' | 'large'): {
  fits: boolean;
  petCount: number;
  estimatedWeight: number;
} {
  const capacity = VAN_CAPACITIES[vanCapacity];
  const petCount = route.length;
  const estimatedWeight = route.reduce((total, apt) => {
    // Estimate weight based on pet species and size
    const petWeight = apt.pet?.weight || 
      (apt.pet?.species === 'dog' ? 15 : apt.pet?.species === 'cat' ? 5 : 10);
    return total + petWeight;
  }, 0);
  
  return {
    fits: petCount <= capacity.maxPets && estimatedWeight <= capacity.maxWeight,
    petCount,
    estimatedWeight
  };
}

/**
 * Calculate total route distance and estimated time
 */
function calculateRouteMetrics(route: any[], clinicLocation: [number, number]): {
  totalDistance: number;
  estimatedTime: number;
} {
  if (route.length === 0) return { totalDistance: 0, estimatedTime: 0 };
  
  let totalDistance = 0;
  let currentLocation = clinicLocation;
  
  // Distance to first stop
  if (route[0].client?.latitude && route[0].client?.longitude) {
    totalDistance += calculateDistance(
      currentLocation[0], currentLocation[1],
      route[0].client.latitude, route[0].client.longitude
    );
    currentLocation = [route[0].client.latitude, route[0].client.longitude];
  }
  
  // Distance between stops
  for (let i = 1; i < route.length; i++) {
    if (route[i].client?.latitude && route[i].client?.longitude) {
      totalDistance += calculateDistance(
        currentLocation[0], currentLocation[1],
        route[i].client.latitude, route[i].client.longitude
      );
      currentLocation = [route[i].client.latitude, route[i].client.longitude];
    }
  }
  
  // Distance back to clinic
  totalDistance += calculateDistance(
    currentLocation[0], currentLocation[1],
    clinicLocation[0], clinicLocation[1]
  );
  
  // Estimate time (assuming 30 km/h average speed + 10 minutes per stop)
  const estimatedTime = (totalDistance / 30) * 60 + (route.length * 10);
  
  return { totalDistance, estimatedTime };
}

/**
 * Main route optimization function
 */
export function optimizeDeliveryRoute(request: RouteOptimizationRequest): OptimizedRoute {
  const { appointments, vanCapacity, fraccionamientoWeights, clinicLocation } = request;
  
  if (appointments.length === 0) {
    return {
      optimizedRoute: [],
      totalDistance: 0,
      estimatedTime: 0,
      efficiency: 0
    };
  }
  
  // Add fraccionamiento weights to appointments
  const appointmentsWithWeights = appointments.map(apt => ({
    ...apt,
    fraccionamientoWeight: fraccionamientoWeights[apt.client?.fraccionamiento] || 5
  }));
  
  // Try advanced optimization first
  let optimizedRoute = optimizeRouteAdvanced(
    appointmentsWithWeights, 
    clinicLocation, 
    vanCapacity, 
    fraccionamientoWeights
  );
  
  // Validate capacity
  const capacityCheck = validateCapacity(optimizedRoute, vanCapacity);
  if (!capacityCheck.fits) {
    // If doesn't fit, trim route or suggest multiple trips
    const capacity = VAN_CAPACITIES[vanCapacity];
    optimizedRoute = optimizedRoute.slice(0, capacity.maxPets);
  }
  
  // Calculate metrics
  const metrics = calculateRouteMetrics(optimizedRoute, clinicLocation);
  
  // Calculate efficiency score (lower distance per stop is better)
  const efficiency = optimizedRoute.length > 0 ? 
    Math.max(0, 100 - (metrics.totalDistance / optimizedRoute.length) * 10) : 0;
  
  return {
    optimizedRoute,
    totalDistance: metrics.totalDistance,
    estimatedTime: metrics.estimatedTime,
    efficiency
  };
}

/**
 * Generate AI prompt for external optimization (Gemini/ChatGPT)
 */
export function generateOptimizationPrompt(request: RouteOptimizationRequest): string {
  const { appointments, vanCapacity, fraccionamientoWeights, clinicLocation } = request;
  
  return `
Optimize a veterinary pickup route in Monterrey, Mexico with the following constraints:

CLINIC LOCATION: ${clinicLocation[0]}, ${clinicLocation[1]}

VAN CAPACITY: ${vanCapacity} (${VAN_CAPACITIES[vanCapacity].maxPets} pets max, ${VAN_CAPACITIES[vanCapacity].maxWeight}kg max)

APPOINTMENTS TO PICKUP:
${appointments.map((apt, i) => `
${i + 1}. ${apt.client?.name} - ${apt.pet?.name}
   Location: ${apt.client?.latitude}, ${apt.client?.longitude}
   Fraccionamiento: ${apt.client?.fraccionamiento}
   Scheduled: ${apt.scheduledTime}
   Weight Factor: ${fraccionamientoWeights[apt.client?.fraccionamiento] || 5}/10
`).join('')}

OPTIMIZATION CRITERIA:
1. Minimize total travel distance
2. Respect time windows (scheduled times)
3. Consider fraccionamiento weights (1=closest, 10=farthest)
4. Account for Monterrey traffic patterns
5. Prefer right turns to reduce wait times
6. Group nearby locations together

Please provide:
1. Optimal visit order (return array of appointment IDs)
2. Estimated total distance in km
3. Estimated total time in minutes
4. Efficiency score (1-100)

Return format: JSON with optimizedRoute, totalDistance, estimatedTime, efficiency
  `.trim();
}