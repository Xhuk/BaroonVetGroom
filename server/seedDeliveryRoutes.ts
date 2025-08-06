import { db } from "./db";
import { deliveryRoutes, deliveryRouteStops, clients, staff } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDeliveryRoutes(tenantId: string) {
  try {
    console.log(`Seeding delivery routes for tenant: ${tenantId}`);

    // Get some clients and staff for the tenant
    const tenantClients = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .limit(10);

    const tenantStaff = await db
      .select()
      .from(staff)
      .where(eq(staff.tenantId, tenantId))
      .limit(5);

    if (tenantClients.length === 0 || tenantStaff.length === 0) {
      console.log(`No clients or staff found for tenant ${tenantId}, skipping route seeding`);
      return;
    }

    // Create sample delivery routes
    const sampleRoutes = [
      {
        tenantId,
        name: "Ruta Norte - Mañana",
        scheduledDate: "2025-08-06",
        driverId: tenantStaff[0]?.id,
        status: "in_progress" as const,
        estimatedDuration: 180,
        startTime: new Date("2025-08-06T09:00:00"),
      },
      {
        tenantId,
        name: "Ruta Centro - Tarde",
        scheduledDate: "2025-08-06", 
        driverId: tenantStaff[1]?.id || tenantStaff[0]?.id,
        status: "scheduled" as const,
        estimatedDuration: 120,
      },
      {
        tenantId,
        name: "Ruta Sur - Mañana",
        scheduledDate: "2025-08-07",
        driverId: tenantStaff[0]?.id,
        status: "scheduled" as const,
        estimatedDuration: 150,
      },
    ];

    // Insert routes
    const insertedRoutes = await db
      .insert(deliveryRoutes)
      .values(sampleRoutes)
      .returning();

    console.log(`Created ${insertedRoutes.length} delivery routes`);

    // Create stops for each route
    for (const [routeIndex, route] of insertedRoutes.entries()) {
      const numStops = Math.min(3 + routeIndex, tenantClients.length);
      const routeClients = tenantClients.slice(0, numStops);
      
      const stops = routeClients.map((client, index) => ({
        routeId: route.id,
        clientId: client.id,
        address: client.address || `${client.fraccionamiento || 'Centro'}, Dirección ${index + 1}`,
        estimatedTime: `${9 + index}:${index === 0 ? '00' : '30'}`,
        status: routeIndex === 0 && index === 0 ? "completed" as const : 
               routeIndex === 0 && index === 1 ? "in_progress" as const : 
               "pending" as const,
        stopOrder: index + 1,
        services: index === 0 ? ["Consulta Veterinaria", "Vacunación"] :
                 index === 1 ? ["Grooming", "Baño medicado"] : 
                 ["Entrega de medicamentos", "Seguimiento"],
        actualArrivalTime: routeIndex === 0 && index === 0 ? 
          new Date("2025-08-06T09:05:00") : null,
        actualCompletionTime: routeIndex === 0 && index === 0 ? 
          new Date("2025-08-06T09:45:00") : null,
      }));

      await db.insert(deliveryRouteStops).values(stops);
      console.log(`Created ${stops.length} stops for route ${route.name}`);
    }

    // Update first route with actual duration if completed stops exist
    const firstRoute = insertedRoutes[0];
    if (firstRoute) {
      const completedStops = await db
        .select({
          actualArrivalTime: deliveryRouteStops.actualArrivalTime,
          actualCompletionTime: deliveryRouteStops.actualCompletionTime,
        })
        .from(deliveryRouteStops)
        .where(eq(deliveryRouteStops.routeId, firstRoute.id));

      const firstArrival = completedStops.find(s => s.actualArrivalTime)?.actualArrivalTime;
      const lastCompletion = completedStops
        .filter(s => s.actualCompletionTime)
        .sort((a, b) => new Date(b.actualCompletionTime!).getTime() - new Date(a.actualCompletionTime!).getTime())[0]?.actualCompletionTime;

      if (firstArrival && lastCompletion) {
        const actualDuration = Math.round((new Date(lastCompletion).getTime() - new Date(firstArrival).getTime()) / (1000 * 60));
        
        await db
          .update(deliveryRoutes)
          .set({ actualDuration })
          .where(eq(deliveryRoutes.id, firstRoute.id));
      }
    }

    console.log(`✅ Successfully seeded delivery routes for tenant: ${tenantId}`);
    
  } catch (error) {
    console.error(`❌ Error seeding delivery routes for tenant ${tenantId}:`, error);
  }
}