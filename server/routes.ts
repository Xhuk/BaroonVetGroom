import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertAppointmentSchema,
  insertRoomSchema,
  insertStaffSchema,
  insertClientSchema,
  insertPetSchema,
  insertFraccionamientoSchema,
  insertDeliveryRouteSchema,
  insertDeliveryStopSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Tenant context routes
  app.get('/api/tenants/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTenants = await storage.getUserTenants(userId);
      res.json(userTenants);
    } catch (error) {
      console.error("Error fetching user tenants:", error);
      res.status(500).json({ message: "Failed to fetch user tenants" });
    }
  });

  app.get('/api/tenants/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Dashboard stats routes
  app.get('/api/dashboard/stats/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Get today's appointments
      const appointments = await storage.getAppointmentsForTenant(tenantId, today, today);
      
      // Get today's delivery routes
      const deliveryRoutes = await storage.getDeliveryRoutesForTenant(tenantId, today, today);
      
      // Get rooms
      const rooms = await storage.getRoomsForTenant(tenantId);
      
      // Get staff
      const staff = await storage.getStaffForTenant(tenantId);

      // Calculate stats
      const groomingAppointments = appointments.filter(apt => apt.type === 'grooming');
      const medicalAppointments = appointments.filter(apt => apt.type === 'medical');
      const vaccinationAppointments = appointments.filter(apt => apt.type === 'vaccination');
      
      const groomingRooms = rooms.filter(room => room.type === 'grooming');
      const medicalRooms = rooms.filter(room => room.type === 'medical');
      const vaccinationRooms = rooms.filter(room => room.type === 'vaccination');
      
      // Calculate room availability
      const groomingRoomAvailability = Math.max(0, groomingRooms.reduce((sum, room) => sum + (room.capacity || 1), 0) - groomingAppointments.length);
      const medicalRoomAvailability = Math.max(0, medicalRooms.reduce((sum, room) => sum + (room.capacity || 1), 0) - medicalAppointments.length);
      const vaccinationRoomAvailability = Math.max(0, vaccinationRooms.reduce((sum, room) => sum + (room.capacity || 1), 0) - vaccinationAppointments.length);
      
      // Calculate total delivery weight
      const totalDeliveryWeight = deliveryRoutes.reduce((sum, route) => sum + (parseFloat(route.totalWeight?.toString() || '0')), 0);
      
      // Calculate room utilization
      const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 1), 0);
      const totalBookedSlots = appointments.length;
      const roomUtilization = totalCapacity > 0 ? Math.round((totalBookedSlots / totalCapacity) * 100) : 0;
      
      // Count active staff today (simplified - assume all staff are active)
      const activeStaffToday = staff.length;

      const stats = {
        groomingAppointments: groomingAppointments.length,
        medicalAppointments: medicalAppointments.length,
        vaccinationAppointments: vaccinationAppointments.length,
        scheduledDeliveries: deliveryRoutes.length,
        groomingRoomAvailability,
        medicalRoomAvailability,
        vaccinationRoomAvailability,
        totalDeliveryWeight,
        teamMembers: staff.length,
        activeStaffToday,
        roomUtilization,
        totalRooms: rooms.length,
        currentDate: today
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Appointments routes
  app.get('/api/appointments/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const appointments = await storage.getAppointmentsForTenant(
        tenantId, 
        startDate as string, 
        endDate as string
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post('/api/appointments/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const appointmentData = insertAppointmentSchema.parse({ ...req.body, tenantId });
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.put('/api/appointments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(id, appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete('/api/appointments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAppointment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Rooms routes
  app.get('/api/rooms/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const rooms = await storage.getRoomsForTenant(tenantId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post('/api/rooms/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant || userTenant.role === 'staff') {
        return res.status(403).json({ message: "Access denied" });
      }

      const roomData = insertRoomSchema.parse({ ...req.body, tenantId });
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Staff routes
  app.get('/api/staff/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const staff = await storage.getStaffForTenant(tenantId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Clients routes
  app.get('/api/clients/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const clients = await storage.getClientsForTenant(tenantId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Fraccionamientos routes
  app.get('/api/fraccionamientos/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const fraccionamientos = await storage.getFraccionamientosForTenant(tenantId);
      res.json(fraccionamientos);
    } catch (error) {
      console.error("Error fetching fraccionamientos:", error);
      res.status(500).json({ message: "Failed to fetch fraccionamientos" });
    }
  });

  // Delivery routes
  app.get('/api/delivery-routes/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.claims.sub;
      
      // Verify user has access to this tenant
      const userTenant = await storage.getUserTenantByTenant(userId, tenantId);
      if (!userTenant) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }

      const routes = await storage.getDeliveryRoutesForTenant(
        tenantId, 
        startDate as string, 
        endDate as string
      );
      res.json(routes);
    } catch (error) {
      console.error("Error fetching delivery routes:", error);
      res.status(500).json({ message: "Failed to fetch delivery routes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
