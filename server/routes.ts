import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
      const userTenants = await storage.getUserTenants(userId);
      const hasAccess = userTenants.some(ut => ut.tenantId === tenantId);
      if (!hasAccess) {
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

  // Simple routes for admin functionality
  app.get('/api/rooms/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const rooms = await storage.getRooms(tenantId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get('/api/staff/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const staffList = await storage.getStaff(tenantId);
      res.json(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post('/api/staff', isAuthenticated, async (req: any, res) => {
    try {
      const staffData = req.body;
      const newStaff = await storage.createStaff(staffData);
      res.json(newStaff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put('/api/staff/:staffId', isAuthenticated, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      const staffData = req.body;
      const updatedStaff = await storage.updateStaff(staffId, staffData);
      res.json(updatedStaff);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.post('/api/staff/:staffId/reassign', isAuthenticated, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      const { newStaffId } = req.body;
      await storage.reassignStaffAppointments(staffId, newStaffId);
      await storage.deleteStaff(staffId);
      res.json({ message: "Staff member deleted and appointments reassigned successfully" });
    } catch (error) {
      console.error("Error reassigning and deleting staff:", error);
      res.status(500).json({ message: "Failed to reassign appointments and delete staff member" });
    }
  });

  app.delete('/api/staff/:staffId', isAuthenticated, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      await storage.deleteStaff(staffId);
      res.json({ message: "Staff member deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      if (error.message === "APPOINTMENTS_ASSIGNED") {
        res.status(409).json({ 
          message: "Staff member has appointments assigned",
          code: "APPOINTMENTS_ASSIGNED"
        });
      } else {
        res.status(500).json({ message: "Failed to delete staff member" });
      }
    }
  });

  app.get('/api/appointments/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { date } = req.query;
      const appointments = await storage.getAppointments(tenantId, date as string);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Create appointment
  app.post('/api/appointments/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const appointmentData = { ...req.body, tenantId };
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Update appointment
  app.put('/api/appointments/:appointmentId', isAuthenticated, async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await storage.updateAppointment(appointmentId, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete('/api/appointments/:appointmentId', isAuthenticated, async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      await storage.deleteAppointment(appointmentId);
      res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Get available time slots for a service on a specific date
  app.get('/api/appointments/available-slots/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { date, serviceId } = req.query;
      const slots = await storage.getAvailableSlots(tenantId, date as string, serviceId as string);
      res.json({ slots });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Check availability for specific time and get alternatives
  app.get('/api/appointments/check-availability/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { date, time, serviceId } = req.query;
      const result = await storage.checkAvailability(tenantId, date as string, time as string, serviceId as string);
      res.json(result);
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Reserve a time slot temporarily
  app.post('/api/appointments/reserve-slot/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const reservationData = { ...req.body, tenantId };
      const reservation = await storage.reserveSlot(reservationData);
      res.json(reservation);
    } catch (error) {
      console.error("Error reserving slot:", error);
      res.status(500).json({ message: "Failed to reserve slot" });
    }
  });

  // Get client by phone
  app.get('/api/clients/by-phone/:tenantId/:phone', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, phone } = req.params;
      const client = await storage.getClientByPhone(tenantId, phone);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client by phone:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Dashboard stats route - Based on real database data
  app.get('/api/dashboard/stats/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      // Get real data from database
      const [appointments, clients, rooms, services, staff] = await Promise.all([
        storage.getAppointments(tenantId, today),
        storage.getClients(tenantId),
        storage.getRooms(tenantId),
        storage.getServices(tenantId),
        storage.getStaff(tenantId)
      ]);

      // Calculate statistics based on real data
      const groomingAppointments = appointments.filter(apt => apt.type === 'grooming').length;
      const medicalAppointments = appointments.filter(apt => apt.type === 'medical').length;
      const vaccinationAppointments = appointments.filter(apt => apt.type === 'vaccination').length;
      
      // Calculate today's revenue from appointments
      const todayRevenue = appointments.reduce((sum, apt) => 
        sum + (parseFloat(apt.totalCost?.toString() || '0') || 0), 0
      );

      // Calculate occupancy rate
      const activeRooms = rooms.filter(room => room.isActive);
      const occupiedSlots = appointments.length;
      const totalSlots = activeRooms.reduce((sum, room) => sum + (room.capacity || 1), 0) * 8; // 8 hours per day
      const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

      const stats = {
        appointmentsToday: appointments.length,
        groomingAppointments,
        medicalAppointments,
        vaccinationAppointments,
        totalClients: clients.length,
        totalRevenue: todayRevenue,
        occupancyRate,
        activeRooms: activeRooms.length,
        totalServices: services.filter(s => s.isActive).length,
        teamMembers: staff.filter(s => s.isActive).length,
        roomsInUse: Math.min(appointments.length, activeRooms.length)
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error calculating stats:", error);
      // Return basic structure with zeros if there's an error
      res.json({
        appointmentsToday: 0,
        groomingAppointments: 0,
        medicalAppointments: 0,
        vaccinationAppointments: 0,
        totalClients: 0,
        totalRevenue: 0,
        occupancyRate: 0,
        activeRooms: 0,
        totalServices: 0,
        teamMembers: 0,
        roomsInUse: 0
      });
    }
  });

  // Admin routes - Rooms
  app.get('/api/admin/rooms/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const rooms = await storage.getRooms(tenantId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post('/api/admin/rooms/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const roomData = { ...req.body, tenantId };
      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put('/api/admin/rooms/:roomId', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.updateRoom(roomId, req.body);
      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete('/api/admin/rooms/:roomId', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      await storage.deleteRoom(roomId);
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Services endpoint for booking form
  app.get('/api/services/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const services = await storage.getServices(tenantId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Admin routes - Services
  app.get('/api/admin/services/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const services = await storage.getServices(tenantId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Pet breeds by species for the tenant - cached endpoint
  app.get('/api/pet-breeds/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      // Return breed data organized by species
      const breedsBySpecies = {
        perro: ['Labrador', 'Golden Retriever', 'Pastor Alemán', 'Bulldog Francés', 'Chihuahua', 'Poodle', 'Yorkshire Terrier', 'Husky Siberiano', 'Rottweiler', 'Dachshund', 'Beagle', 'Mestizo', 'Otro'],
        gato: ['Persa', 'Siamés', 'Maine Coon', 'Británico de Pelo Corto', 'Angora', 'Bengalí', 'Ragdoll', 'Sphynx', 'Mestizo', 'Otro'],
        ave: ['Canario', 'Periquito', 'Cacatúa', 'Loro Amazonas', 'Agapornis', 'Ninfa', 'Guacamayo', 'Otro'],
        reptil: ['Iguana Verde', 'Tortuga de Orejas Rojas', 'Gecko Leopardo', 'Pitón Bola', 'Dragón Barbudo', 'Otro'],
        conejo: ['Holandés', 'Angora', 'Enano Holandés', 'Belier', 'Rex', 'Gigante de Flandes', 'Mestizo', 'Otro'],
        otro: ['Otro']
      };
      
      // Set cache headers for 30 minutes
      res.set('Cache-Control', 'public, max-age=1800');
      res.json(breedsBySpecies);
    } catch (error) {
      console.error("Error fetching pet breeds:", error);
      res.status(500).json({ message: "Failed to fetch pet breeds" });
    }
  });

  // Customer lookup route
  app.get('/api/customers/lookup', isAuthenticated, async (req: any, res) => {
    try {
      const { name, phone, email } = req.query;
      
      if (!name || !phone || !email) {
        return res.status(400).json({ message: "Name, phone, and email are required" });
      }
      
      const customer = await storage.findCustomerByInfo(name as string, phone as string, email as string);
      
      if (customer) {
        res.json(customer);
      } else {
        res.status(404).json({ message: "Customer not found" });
      }
    } catch (error) {
      console.error("Error looking up customer:", error);
      res.status(500).json({ message: "Failed to lookup customer" });
    }
  });

  // Slot reservation endpoints for booking flow
  app.post('/api/slot-reservation/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { scheduledDate, scheduledTime, serviceId } = req.body;
      
      // Clean up expired reservations first
      await storage.cleanupExpiredReservations();
      
      // Get tenant-specific timeout (default 5 minutes)
      const timeoutMinutes = await storage.getTenantReservationTimeout(tenantId);
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
      
      // Create reservation with session ID
      const sessionId = req.sessionID || 'unknown';
      const reservation = await storage.reserveSlot({
        tenantId,
        sessionId,
        scheduledDate,
        scheduledTime,
        serviceId,
        expiresAt
      });
      
      res.json({ 
        reservationId: reservation.id, 
        expiresAt: reservation.expiresAt,
        timeoutMinutes 
      });
    } catch (error) {
      console.error("Error reserving slot:", error);
      res.status(500).json({ message: "Failed to reserve slot" });
    }
  });

  app.delete('/api/slot-reservation/:reservationId', isAuthenticated, async (req, res) => {
    try {
      const { reservationId } = req.params;
      await storage.releaseSlot(reservationId);
      res.json({ message: "Slot released successfully" });
    } catch (error) {
      console.error("Error releasing slot:", error);
      res.status(500).json({ message: "Failed to release slot" });
    }
  });

  // Enhanced availability check with alternatives
  app.get('/api/availability/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { date, time, serviceId } = req.query;
      
      // Clean up expired reservations
      await storage.cleanupExpiredReservations();
      
      const result = await storage.checkAvailability(
        tenantId, 
        date as string, 
        time as string, 
        serviceId as string
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Business hours endpoints for admin configuration
  app.get('/api/admin/business-hours/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const businessHours = await storage.getTenantBusinessHours(tenantId);
      const reservationTimeout = await storage.getTenantReservationTimeout(tenantId);
      res.json({ ...businessHours, reservationTimeout });
    } catch (error) {
      console.error("Error fetching business hours:", error);
      res.status(500).json({ message: "Failed to fetch business hours" });
    }
  });

  app.put('/api/admin/business-hours/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { openTime, closeTime, timeSlotDuration, reservationTimeout } = req.body;
      
      const updatedTenant = await storage.updateTenantBusinessHours(tenantId, {
        openTime,
        closeTime,
        timeSlotDuration,
        reservationTimeout
      });
      
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error updating business hours:", error);
      res.status(500).json({ message: "Failed to update business hours" });
    }
  });

  app.post('/api/admin/services/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const serviceData = { ...req.body, tenantId };
      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.put('/api/admin/services/:serviceId', isAuthenticated, async (req, res) => {
    try {
      const { serviceId } = req.params;
      const service = await storage.updateService(serviceId, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete('/api/admin/services/:serviceId', isAuthenticated, async (req, res) => {
    try {
      const { serviceId } = req.params;
      await storage.deleteService(serviceId);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Admin routes - Roles
  app.get('/api/admin/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post('/api/admin/roles', isAuthenticated, async (req, res) => {
    try {
      const role = await storage.createRole(req.body);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put('/api/admin/roles/:roleId', isAuthenticated, async (req, res) => {
    try {
      const { roleId } = req.params;
      const role = await storage.updateRole(roleId, req.body);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/admin/roles/:roleId', isAuthenticated, async (req, res) => {
    try {
      const { roleId } = req.params;
      await storage.deleteRole(roleId);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Admin routes for rooms, services, and roles
  app.get('/api/admin/rooms/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const rooms = await storage.getRooms(tenantId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching admin rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post('/api/admin/rooms/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const roomData = { ...req.body, tenantId };
      const newRoom = await storage.createRoom(roomData);
      res.json(newRoom);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.delete('/api/admin/rooms/:roomId', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      await storage.deleteRoom(roomId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  app.get('/api/admin/services/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const services = await storage.getServices(tenantId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post('/api/admin/services/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const serviceData = { ...req.body, tenantId };
      const newService = await storage.createService(serviceData);
      res.json(newService);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.delete('/api/admin/services/:serviceId', isAuthenticated, async (req: any, res) => {
    try {
      const { serviceId } = req.params;
      await storage.deleteService(serviceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.get('/api/admin/roles', isAuthenticated, async (req: any, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}