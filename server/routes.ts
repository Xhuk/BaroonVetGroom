import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { webhookMonitor } from "./webhookMonitor";

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
      const appointmentData = req.body;
      
      // First, create or find the client
      let client = await storage.findCustomerByInfo(
        appointmentData.customerName,
        appointmentData.customerPhone,
        appointmentData.customerEmail
      );
      
      if (!client) {
        // Create new client
        client = await storage.createClient({
          tenantId,
          name: appointmentData.customerName,
          phone: appointmentData.customerPhone,
          email: appointmentData.customerEmail,
          address: appointmentData.customerAddress,
          fraccionamiento: appointmentData.customerFraccionamiento,
          postalCode: appointmentData.customerPostalCode,
          latitude: appointmentData.customerLatitude,
          longitude: appointmentData.customerLongitude
        });
      }
      
      // Create or find the pet
      let pet;
      const existingPets = await storage.getPets(client.id);
      pet = existingPets.find(p => p.name.toLowerCase() === appointmentData.petName.toLowerCase());
      
      if (!pet) {
        // Create new pet
        pet = await storage.createPet({
          clientId: client.id,
          name: appointmentData.petName,
          species: appointmentData.petSpecies,
          breed: appointmentData.petBreed,
          age: appointmentData.petAge,
          weight: appointmentData.petWeight,
          medicalHistory: appointmentData.petMedicalHistory
        });
      }
      
      // Get service type for appointment
      const service = await storage.getService(appointmentData.serviceId);
      
      // Create the appointment with proper client and pet IDs
      const newAppointment = await storage.createAppointment({
        tenantId,
        clientId: client.id,
        petId: pet.id,
        serviceId: appointmentData.serviceId,
        scheduledDate: appointmentData.requestedDate,
        scheduledTime: appointmentData.requestedTime,
        type: service?.type || "medical", // Use service type or default to medical
        logistics: appointmentData.logistics,
        notes: appointmentData.notes,
        status: appointmentData.status || "scheduled"
      });
      
      res.json(newAppointment);
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

  // Check availability for a specific date, time, and service
  app.get('/api/availability/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { date, time, serviceId } = req.query;

      if (!date || !time || !serviceId) {
        return res.status(400).json({ message: "Date, time, and serviceId are required" });
      }

      // Get existing appointments for this date
      const existingAppointments = await storage.getAppointments(tenantId, date as string);
      
      // Get service details for duration
      const service = await storage.getService(serviceId as string);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Check if the requested time slot is available
      const requestedDateTime = new Date(`${date}T${time}`);
      const serviceEndTime = new Date(requestedDateTime.getTime() + (service.duration * 60000));

      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt: any) => {
        const aptStart = new Date(`${apt.requestedDate}T${apt.requestedTime}`);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration * 60000));
        
        return (
          (requestedDateTime >= aptStart && requestedDateTime < aptEnd) ||
          (serviceEndTime > aptStart && serviceEndTime <= aptEnd) ||
          (requestedDateTime <= aptStart && serviceEndTime >= aptEnd)
        );
      });

      if (!hasConflict) {
        // Slot is available
        res.json({ available: true });
      } else {
        // Generate alternative slots (next 3 available slots)
        const businessHours = await storage.getTenantBusinessHours(tenantId);
        const alternativeSlots = [];
        
        // Start looking from the next 30-minute slot
        let nextSlot = new Date(requestedDateTime.getTime() + (30 * 60000));
        let searchCount = 0;
        
        while (alternativeSlots.length < 3 && searchCount < 20) {
          const nextTime = nextSlot.toTimeString().slice(0, 5);
          const nextHasConflict = existingAppointments.some((apt: any) => {
            const aptStart = new Date(`${apt.requestedDate}T${apt.requestedTime}`);
            const aptEnd = new Date(aptStart.getTime() + (apt.duration * 60000));
            const testEnd = new Date(nextSlot.getTime() + (service.duration * 60000));
            
            return (
              (nextSlot >= aptStart && nextSlot < aptEnd) ||
              (testEnd > aptStart && testEnd <= aptEnd) ||
              (nextSlot <= aptStart && testEnd >= aptEnd)
            );
          });
          
          if (!nextHasConflict) {
            alternativeSlots.push(nextTime);
          }
          
          nextSlot = new Date(nextSlot.getTime() + (30 * 60000));
          searchCount++;
        }

        res.json({ 
          available: false, 
          alternativeSlots 
        });
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // WhatsApp notification endpoint via n8n server
  app.post('/api/send-whatsapp', isAuthenticated, async (req: any, res) => {
    try {
      const { phone, message } = req.body;
      
      // Check if N8N_WEBHOOK_URL is configured
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      
      if (!n8nWebhookUrl) {
        console.log('WhatsApp message to', phone, ':', message);
        return res.json({ 
          success: false, 
          message: "N8N_WEBHOOK_URL not configured - message logged only" 
        });
      }
      
      // Send to n8n webhook for WhatsApp processing with JWT
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.N8N_JWT_TOKEN || 'default-token'}`
        },
        body: JSON.stringify({
          phone: phone,
          message: message,
          type: 'whatsapp_appointment_confirmation'
        })
      });
      
      if (response.ok) {
        // Log successful webhook call
        await webhookMonitor.logSuccess(req.user?.claims?.sub || 'unknown', 'whatsapp', n8nWebhookUrl);
        res.json({ 
          success: true, 
          message: "WhatsApp message sent via n8n" 
        });
      } else {
        const errorText = await response.text();
        console.error('n8n webhook failed:', errorText);
        
        // Log webhook error for monitoring
        await webhookMonitor.logError(
          req.user?.claims?.sub || 'unknown', 
          'whatsapp', 
          n8nWebhookUrl, 
          new Error(`HTTP ${response.status}: ${errorText}`),
          { phone, message, type: 'whatsapp_appointment_confirmation' }
        );
        
        res.json({ 
          success: false, 
          message: "n8n webhook failed - check server logs" 
        });
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      
      // Log webhook error for monitoring
      await webhookMonitor.logError(
        req.user?.claims?.sub || 'unknown', 
        'whatsapp', 
        n8nWebhookUrl || 'N/A', 
        error,
        { phone, message, type: 'whatsapp_appointment_confirmation' }
      );
      
      res.status(500).json({ message: "Failed to send WhatsApp message" });
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

  // Super Admin Routes - Webhook Monitoring
  app.get('/api/superadmin/webhook-stats', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is super admin (this could be enhanced with proper role checking)
      const userId = req.user?.claims?.sub;
      
      const stats = await webhookMonitor.getWebhookStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching webhook stats:", error);
      res.status(500).json({ message: "Failed to fetch webhook statistics" });
    }
  });

  app.get('/api/superadmin/webhook-errors', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, limit } = req.query;
      const logs = await storage.getWebhookErrorLogs(tenantId, parseInt(limit) || 50);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook errors:", error);
      res.status(500).json({ message: "Failed to fetch webhook errors" });
    }
  });

  app.post('/api/superadmin/webhook-retry/:logId', isAuthenticated, async (req: any, res) => {
    try {
      const { logId } = req.params;
      
      // Mark error as resolved
      await storage.updateWebhookErrorStatus(logId, 'resolved', new Date());
      
      res.json({ message: "Webhook error marked as resolved" });
    } catch (error) {
      console.error("Error resolving webhook error:", error);
      res.status(500).json({ message: "Failed to resolve webhook error" });
    }
  });

  app.get('/api/superadmin/webhook-monitoring', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.query;
      
      // Get all webhook monitoring records
      const { db } = await import('./db');
      const { webhookMonitoring } = await import('@shared/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      const monitoring = await db.select().from(webhookMonitoring)
        .where(tenantId ? eq(webhookMonitoring.tenantId, tenantId) : undefined)
        .orderBy(sql`${webhookMonitoring.updatedAt} DESC`);
      
      res.json(monitoring);
    } catch (error) {
      console.error("Error fetching webhook monitoring:", error);
      res.status(500).json({ message: "Failed to fetch webhook monitoring data" });
    }
  });

  app.put('/api/superadmin/webhook-monitoring/:tenantId/:webhookType', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, webhookType } = req.params;
      const { isAutoRetryEnabled, retryIntervalMinutes, maxRetryIntervalMinutes } = req.body;
      
      const monitoring = await storage.getWebhookMonitoring(tenantId, webhookType);
      if (!monitoring) {
        return res.status(404).json({ message: "Webhook monitoring not found" });
      }

      await storage.upsertWebhookMonitoring({
        ...monitoring,
        isAutoRetryEnabled,
        retryIntervalMinutes,
        maxRetryIntervalMinutes
      });
      
      res.json({ message: "Webhook monitoring updated successfully" });
    } catch (error) {
      console.error("Error updating webhook monitoring:", error);
      res.status(500).json({ message: "Failed to update webhook monitoring" });
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