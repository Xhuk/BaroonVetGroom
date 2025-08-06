import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { and } from 'drizzle-orm';
import { clients, rooms, services, staff, slotReservations, appointments } from '@shared/schema';
import { setupAuth, isAuthenticated } from "./replitAuth";
import { webhookMonitor } from "./webhookMonitor";
import { advancedRouteOptimization, type OptimizedRoute, type RouteOptimizationOptions } from "./routeOptimizer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { TempLinkService } from "./tempLinkService";
import { tempLinkTypes } from "../shared/tempLinks";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { pets, companies, tempLinks } from "@shared/schema";
import { gt } from "drizzle-orm";
// Removed autoStatusService import - now using database functions

// Helper function to check system admin access
async function isSystemAdmin(req: any): Promise<boolean> {
  try {
    const user = req.user;
    if (!user?.claims?.sub) {
      return false;
    }
    return await storage.hasSystemRole(user.claims.sub);
  } catch (error) {
    console.error('Error checking system admin access:', error);
    return false;
  }
}

// Middleware to check super admin access
const isSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const hasAccess = await isSystemAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  } catch (error) {
    console.error('Error in super admin middleware:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Enhanced in-memory cache for user data (valid for 15 minutes)
  const userCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - longer cache
  
  // Cache for tenant data to reduce auth overhead
  const tenantCache = new Map<string, { data: any, timestamp: number }>();
  const TENANT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Auth routes with ultra-aggressive caching
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Set ultra-aggressive cache headers for instant subsequent loads
      res.set({
        'Cache-Control': 'private, max-age=1800, s-maxage=1800', // 30 minutes browser cache
        'ETag': `"user-${userId}-${Math.floor(Date.now() / 60000)}"`, // Change every minute
        'Vary': 'Cookie, Authorization',
        'Last-Modified': new Date(Date.now() - 60000).toUTCString()
      });
      
      // Check cache first
      const cached = userCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
      
      const user = await storage.getUser(userId);
      
      // Cache the result
      userCache.set(userId, { data: user, timestamp: Date.now() });
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all tenants for system admin users - MUST BE BEFORE tenant-specific routes
  app.get('/api/tenants/all', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Checking system admin access for /api/tenants/all');
      const hasSystemAccess = await isSystemAdmin(req);
      console.log('System admin access result:', hasSystemAccess);
      
      if (!hasSystemAccess) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const tenants = await storage.getAllTenantsWithCompany();
      console.log('Found tenants:', tenants.length);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
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

  // ULTRA-OPTIMIZED: Lightweight appointment data - only essential fields for instant loading
  // FAST APPOINTMENTS: Rebuilt endpoint for reliable performance
  app.get('/api/appointments-fast/:tenantId', async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { date } = req.query;
      // Use current date in UTC format for consistent handling
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      console.log(`Fast appointments: ${tenantId} on ${targetDate}`);
      
      const appointments = await storage.getAppointments(tenantId, targetDate);
      const clients = await storage.getClients(tenantId);
      
      const appointmentClientIds = new Set(appointments.map(apt => apt.clientId));
      const relevantClients = clients.filter(client => appointmentClientIds.has(client.id));
      
      res.json({
        appointments: appointments.map(apt => ({
          id: apt.id,
          clientId: apt.clientId,
          petId: apt.petId,
          scheduledDate: apt.scheduledDate,
          scheduledTime: apt.scheduledTime,
          status: apt.status,
          type: apt.type,
          notes: apt.notes
        })),
        clients: relevantClients.map(client => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email
        })),
        date: targetDate,
        count: appointments.length
      });
      
    } catch (error) {
      console.error("Fast appointments error:", error);
      res.status(500).json({ error: "Failed to load appointments" });
    }
  });

  // ULTRA-OPTIMIZED: Fast medical appointments with minimal payload
  app.get('/api/medical-appointments-fast/:tenantId', async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      console.log(`Fast medical appointments: ${tenantId}`);
      
      const [medicalAppointments, pets, clients, veterinarians, rooms] = await Promise.all([
        storage.getMedicalAppointments(tenantId),
        storage.getPets(tenantId),
        storage.getClients(tenantId),
        storage.getStaff(tenantId, 'veterinarian'),
        storage.getRooms(tenantId)
      ]);
      
      // Create lookup maps for efficient filtering
      const appointmentClientIds = new Set(medicalAppointments.map(apt => apt.clientId));
      const appointmentPetIds = new Set(medicalAppointments.map(apt => apt.petId));
      const appointmentVetIds = new Set(medicalAppointments.map(apt => apt.veterinarianId));
      const appointmentRoomIds = new Set(medicalAppointments.map(apt => apt.roomId).filter(Boolean));
      
      // Only include relevant data
      const relevantClients = clients.filter(client => appointmentClientIds.has(client.id));
      const relevantPets = pets.filter(pet => appointmentPetIds.has(pet.id));
      const relevantVets = veterinarians.filter(vet => appointmentVetIds.has(vet.id));
      const relevantRooms = rooms.filter(room => appointmentRoomIds.has(room.id));
      
      res.json({
        medicalAppointments: medicalAppointments.map(apt => ({
          id: apt.id,
          petId: apt.petId,
          clientId: apt.clientId,
          veterinarianId: apt.veterinarianId,
          roomId: apt.roomId,
          visitDate: apt.visitDate,
          visitType: apt.visitType,
          chiefComplaint: apt.chiefComplaint,
          diagnosis: apt.diagnosis,
          treatment: apt.treatment,
          status: apt.status,
          followUpRequired: apt.followUpRequired,
          followUpDate: apt.followUpDate
        })),
        clients: relevantClients.map(client => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email
        })),
        pets: relevantPets.map(pet => ({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          clientId: pet.clientId
        })),
        veterinarians: relevantVets.map(vet => ({
          id: vet.id,
          name: vet.name,
          email: vet.email
        })),
        rooms: relevantRooms.map(room => ({
          id: room.id,
          name: room.name,
          roomType: room.roomType
        })),
        count: medicalAppointments.length
      });
      
    } catch (error) {
      console.error("Fast medical appointments error:", error);
      res.status(500).json({ error: "Failed to load medical appointments" });
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
          registeredAge: appointmentData.petAge,
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

  // Reschedule appointment endpoint - dedicated for scheduling adjustments
  app.put('/api/appointments/:appointmentId/reschedule', isAuthenticated, async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      const { scheduledDate, scheduledTime, reason } = req.body;
      
      // Update appointment with new schedule and add reschedule reason
      const updatedData = {
        scheduledDate,
        scheduledTime,
        status: 'rescheduled',
        notes: `Reprogramada: ${reason || 'Sin motivo especificado'}`
      };
      
      const appointment = await storage.updateAppointment(appointmentId, updatedData);
      res.json({ 
        appointment, 
        message: 'Cita reprogramada exitosamente',
        oldDate: req.body.oldDate,
        newDate: scheduledDate 
      });
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      res.status(500).json({ message: "Error al reprogramar la cita" });
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

  // Update client information
  app.patch('/api/clients/:clientId', isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.params;
      const updates = req.body;
      const updatedClient = await storage.updateClient(clientId, updates);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Update pet information
  app.patch('/api/pets/:petId', isAuthenticated, async (req, res) => {
    try {
      const { petId } = req.params;
      const updates = req.body;
      const updatedPet = await storage.updatePet(petId, updates);
      res.json(updatedPet);
    } catch (error) {
      console.error("Error updating pet:", error);
      res.status(500).json({ message: "Failed to update pet" });
    }
  });

  // Create new client
  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clientData = req.body;
      const newClient = await storage.createClient(clientData);
      res.json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Create new pet
  app.post('/api/pets', isAuthenticated, async (req, res) => {
    try {
      const petData = req.body;
      const newPet = await storage.createPet(petData);
      res.json(newPet);
    } catch (error) {
      console.error("Error creating pet:", error);
      res.status(500).json({ message: "Failed to create pet" });
    }
  });

  // Get all clients for a tenant
  app.get('/api/clients/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const clients = await storage.getClients(tenantId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get all pets for a tenant
  app.get('/api/pets/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      // Get all pets for this tenant by joining with clients
      const tenantPets = await db.select({
        id: pets.id,
        name: pets.name,
        species: pets.species,
        breed: pets.breed,
        registeredAge: pets.registeredAge,
        birthDate: pets.birthDate,
        weight: pets.weight,
        isActive: pets.isActive,
        clientId: pets.clientId
      })
      .from(pets)
      .leftJoin(clients, eq(pets.clientId, clients.id))
      .where(eq(clients.tenantId, tenantId));
      
      res.json(tenantPets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  // Get pets for a specific client
  app.get('/api/pets/client/:clientId', isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.params;
      const pets = await storage.getPets(clientId);
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets for client:", error);
      res.status(500).json({ message: "Failed to fetch pets for client" });
    }
  });

  // Pet age management endpoints
  app.post('/api/pets/update-ages', isSuperAdmin, async (req, res) => {
    try {
      // Trigger manual pet age update using database function
      const result = await db.execute(sql`SELECT * FROM trigger_auto_pet_age_update()`);
      const resultData = result.rows[0] as any;
      res.json({ 
        message: "Pet ages updated successfully",
        updatedPets: resultData?.updated_pets || 0,
        executionTime: resultData?.execution_time
      });
    } catch (error) {
      console.error("Error updating pet ages:", error);
      res.status(500).json({ message: "Failed to update pet ages" });
    }
  });

  // Slot reservation endpoints for click-to-book
  app.post('/api/slot-reservations', async (req, res) => {
    try {
      const { tenantId, scheduledDate, scheduledTime, serviceId } = req.body;
      const sessionId = req.sessionID || req.headers['x-session-id'] as string || `session-${Date.now()}`;
      
      if (!tenantId || !scheduledDate || !scheduledTime || !sessionId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if slot is already reserved or has appointment
      const existingReservation = await db.select()
        .from(slotReservations)
        .where(and(
          eq(slotReservations.tenantId, tenantId),
          eq(slotReservations.scheduledDate, scheduledDate),
          eq(slotReservations.scheduledTime, scheduledTime),
          gt(slotReservations.expiresAt, sql`CURRENT_TIMESTAMP`)
        ))
        .limit(1);

      const existingAppointment = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.scheduledDate, scheduledDate),
          eq(appointments.scheduledTime, scheduledTime)
        ))
        .limit(1);

      if (existingReservation.length > 0) {
        return res.status(409).json({ message: "Slot is already reserved" });
      }

      if (existingAppointment.length > 0) {
        return res.status(409).json({ message: "Slot is already booked" });
      }

      // Create 15-minute reservation
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      const [reservation] = await db.insert(slotReservations)
        .values({
          tenantId,
          sessionId,
          scheduledDate,
          scheduledTime,
          serviceId,
          expiresAt,
        })
        .returning();

      res.json({ 
        reservation,
        expiresIn: 15 * 60 // seconds
      });
    } catch (error) {
      console.error("Error creating slot reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  // Release slot reservation
  app.delete('/api/slot-reservations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const sessionId = req.sessionID || req.headers['x-session-id'] as string;

      await db.delete(slotReservations)
        .where(and(
          eq(slotReservations.id, id),
          eq(slotReservations.sessionId, sessionId)
        ));

      res.json({ message: "Reservation released" });
    } catch (error) {
      console.error("Error releasing slot reservation:", error);
      res.status(500).json({ message: "Failed to release reservation" });
    }
  });

  // Clean up expired reservations (manual trigger)
  app.post('/api/slot-reservations/cleanup', isSuperAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT cleanup_expired_reservations()`);
      const deletedCount = result.rows[0] as any;
      res.json({ 
        message: "Cleanup completed",
        deletedReservations: deletedCount?.cleanup_expired_reservations || 0
      });
    } catch (error) {
      console.error("Error cleaning up reservations:", error);
      res.status(500).json({ message: "Failed to cleanup reservations" });
    }
  });

  // Get reserved slots for a tenant and date
  app.get('/api/slot-reservations/:tenantId', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date parameter required" });
      }

      const reservations = await db.select()
        .from(slotReservations)
        .where(and(
          eq(slotReservations.tenantId, tenantId),
          eq(slotReservations.scheduledDate, date as string),
          gt(slotReservations.expiresAt, sql`CURRENT_TIMESTAMP`)
        ));

      res.json({ reservations });
    } catch (error) {
      console.error("Error fetching slot reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  // Get pet age update configuration for a company
  app.get('/api/pets/age-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const config = await db.select({
        petAgeUpdateEnabled: companies.petAgeUpdateEnabled,
        petAgeUpdateInterval: companies.petAgeUpdateInterval,
        petAgeUpdateLastRun: companies.petAgeUpdateLastRun
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      res.json(config[0] || {
        petAgeUpdateEnabled: true,
        petAgeUpdateInterval: 1440,
        petAgeUpdateLastRun: null
      });
    } catch (error) {
      console.error("Error fetching pet age config:", error);
      res.status(500).json({ message: "Failed to fetch pet age configuration" });
    }
  });

  // Dashboard stats route - Based on real database data
  app.get('/api/dashboard/stats/:tenantId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      // Use efficient count queries instead of fetching full datasets
      const [
        todayAppointments,
        clientCount,
        activeRoomCount,
        activeServiceCount,
        activeStaffCount
      ] = await Promise.all([
        // Only get today's appointments (much smaller dataset)
        storage.getAppointments(tenantId, today),
        // Use count queries instead of full data
        db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.tenantId, tenantId)),
        db.select({ count: sql<number>`count(*)` }).from(rooms).where(and(eq(rooms.tenantId, tenantId), eq(rooms.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(services).where(and(eq(services.tenantId, tenantId), eq(services.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)))
      ]);

      // Calculate statistics efficiently
      const groomingAppointments = todayAppointments.filter(apt => apt.type === 'grooming').length;
      const medicalAppointments = todayAppointments.filter(apt => apt.type === 'medical').length;
      const vaccinationAppointments = todayAppointments.filter(apt => apt.type === 'vaccination').length;
      
      // Calculate today's revenue from appointments
      const todayRevenue = todayAppointments.reduce((sum, apt) => 
        sum + (parseFloat(apt.totalCost?.toString() || '0') || 0), 0
      );

      // Calculate facturated/billed appointments (servicios servidos)
      const serviciosServidos = todayAppointments.filter(apt => 
        apt.status === 'confirmed' || apt.status === 'completed'
      ).length;

      // Simple occupancy calculation
      const occupiedSlots = todayAppointments.length;
      const totalSlots = (activeRoomCount[0]?.count || 0) * 8; // 8 hours per day
      const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

      const stats = {
        appointmentsToday: todayAppointments.length,
        groomingToday: groomingAppointments,
        medicalToday: medicalAppointments,
        groomingAppointments,
        medicalAppointments,
        vaccinationAppointments,
        totalClients: clientCount[0]?.count || 0,
        totalRevenue: todayRevenue,
        occupancyRate,
        activeRooms: activeRoomCount[0]?.count || 0,
        totalServices: activeServiceCount[0]?.count || 0,
        teamMembers: activeStaffCount[0]?.count || 0,
        roomsInUse: Math.min(todayAppointments.length, activeRoomCount[0]?.count || 0),
        serviciosServidos,
        pendingPayments: 0, // This would need proper billing system integration
        totalPets: 0, // This would need proper pets count from database
        entriesDelivered: 0, // This would need delivery system integration
        deliveriesToday: 0 // This would need delivery system integration
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error calculating stats:", error);
      res.json({
        appointmentsToday: 0,
        groomingToday: 0,
        medicalToday: 0,
        groomingAppointments: 0,
        medicalAppointments: 0,
        vaccinationAppointments: 0,
        totalClients: 0,
        totalRevenue: 0,
        occupancyRate: 0,
        activeRooms: 0,
        totalServices: 0,
        teamMembers: 0,
        roomsInUse: 0,
        serviciosServidos: 0,
        pendingPayments: 0,
        totalPets: 0,
        entriesDelivered: 0,
        deliveriesToday: 0
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
      const { type } = req.query;
      
      const services = await storage.getServices(tenantId);
      
      // Filter by type if specified
      const filteredServices = type 
        ? services.filter(service => service.type === type)
        : services;
        
      res.json(filteredServices);
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

  // Prepare WhatsApp message for manual copying (replaces automatic sending)
  app.post('/api/prepare-whatsapp', isAuthenticated, async (req: any, res) => {
    const { phone, message, tenantId, paymentLink, type } = req.body;
    const actualTenantId = tenantId || 'vetgroom1';
    
    try {
      // Format the phone number for WhatsApp (remove special characters, keep only digits)
      const formattedPhone = phone.replace(/[^\d]/g, '');
      
      // Prepare the complete message with payment link if provided
      let completeMessage = message;
      if (paymentLink) {
        completeMessage += `\n\nLink de pago: ${paymentLink}`;
      }
      
      console.log(`WhatsApp message prepared for manual sending to: ${formattedPhone}`);
      
      res.json({
        success: true,
        data: {
          phoneNumber: formattedPhone,
          message: completeMessage,
          paymentLink: paymentLink || null,
          type: type || 'appointment_confirmation'
        },
        message: "Mensaje preparado para envío manual por WhatsApp"
      });
      
    } catch (error: any) {
      console.error('Error preparing WhatsApp message:', error);
      res.status(500).json({ 
        success: false, 
        message: "Error preparando el mensaje de WhatsApp" 
      });
    }
  });

  // Generate payment link for invoices and billing
  app.post('/api/generate-payment-link', isAuthenticated, async (req: any, res) => {
    const { invoiceId, amount, description, clientName, tenantId } = req.body;
    
    try {
      // For now, generate a placeholder payment link
      // In production, this would integrate with payment providers like Stripe, MercadoPago, etc.
      const paymentLink = `https://pay.vetgroom.app/invoice/${invoiceId}?amount=${amount}&tenant=${tenantId}`;
      
      console.log(`Payment link generated for invoice ${invoiceId}: ${paymentLink}`);
      
      res.json({
        success: true,
        data: {
          paymentLink,
          invoiceId,
          amount,
          description,
          clientName,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        },
        message: "Link de pago generado correctamente"
      });
      
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      res.status(500).json({ 
        success: false, 
        message: "Error generando el link de pago" 
      });
    }
  });

  // Get follow-up count for notifications
  app.get('/api/medical-appointments/follow-up-count/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const count = await storage.getFollowUpCount(tenantId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting follow-up count:", error);
      res.status(500).json({ message: "Failed to get follow-up count" });
    }
  });

  // Get company follow-up configuration
  app.get('/api/company/follow-up-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const config = await storage.getCompanyFollowUpConfig(companyId);
      res.json(config);
    } catch (error) {
      console.error("Error getting follow-up config:", error);
      res.status(500).json({ message: "Failed to get follow-up configuration" });
    }
  });

  // Update company follow-up configuration (Super Admin only)
  app.put('/api/company/follow-up-config/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has super admin access
      const accessLevel = await getUserAccessLevel(req);
      if (accessLevel !== 'system_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { companyId } = req.params;
      const { 
        followUpNormalThreshold, 
        followUpUrgentThreshold, 
        followUpHeartBeatEnabled, 
        followUpShowCount 
      } = req.body;

      const updatedConfig = await storage.updateCompanyFollowUpConfig(companyId, {
        followUpNormalThreshold,
        followUpUrgentThreshold,
        followUpHeartBeatEnabled,
        followUpShowCount
      });

      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating follow-up config:", error);
      res.status(500).json({ message: "Failed to update follow-up configuration" });
    }
  });

  // Auto Status Update Service Configuration (Super Admin only)
  app.get('/api/company/auto-status-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const config = await storage.getCompanyAutoStatusConfig(companyId);
      res.json(config);
    } catch (error) {
      console.error("Error getting auto status config:", error);
      res.status(500).json({ message: "Failed to get auto status configuration" });
    }
  });

  app.put('/api/company/auto-status-config/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has super admin access
      const accessLevel = await getUserAccessLevel(req);
      if (accessLevel !== 'system_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { companyId } = req.params;
      const { 
        autoStatusUpdateEnabled, 
        autoStatusUpdateInterval 
      } = req.body;

      const updatedConfig = await storage.updateCompanyAutoStatusConfig(companyId, {
        autoStatusUpdateEnabled,
        autoStatusUpdateInterval
      });

      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating auto status config:", error);
      res.status(500).json({ message: "Failed to update auto status configuration" });
    }
  });

  // Auto Status Database Cron Job Control (Super Admin only)
  app.post('/api/superadmin/auto-status-service/trigger', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const results = await db.execute(sql`SELECT * FROM trigger_auto_status_update()`);
      res.json({ 
        message: "Auto status update triggered successfully", 
        results: results.rows 
      });
    } catch (error) {
      console.error("Error triggering auto status update:", error);
      res.status(500).json({ message: "Failed to trigger auto status update" });
    }
  });

  app.get('/api/superadmin/auto-status-service/status', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      // Check which companies have auto status enabled and their last run times
      const enabledCompanies = await db.select({
        id: companies.id,
        name: companies.name,
        autoStatusUpdateEnabled: companies.autoStatusUpdateEnabled,
        autoStatusUpdateInterval: companies.autoStatusUpdateInterval,
        autoStatusUpdateLastRun: companies.autoStatusUpdateLastRun
      }).from(companies)
      .where(eq(companies.autoStatusUpdateEnabled, true));
      
      res.json({ 
        message: "Database cron job status", 
        type: "database_function",
        enabledCompanies: enabledCompanies.length,
        companies: enabledCompanies
      });
    } catch (error) {
      console.error("Error getting auto status service status:", error);
      res.status(500).json({ message: "Failed to get service status" });
    }
  });

  // WebSocket connection statistics for scalability monitoring
  app.get('/api/admin/websocket-stats', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { scalableAppointmentService } = await import('./scalableAppointmentService');
      const stats = scalableAppointmentService.getConnectionStats();
      
      res.json({
        success: true,
        stats: {
          ...stats,
          scalabilityNote: `System can handle 2000+ tenants with ${stats.totalConnections} WebSocket connections vs ${stats.totalTenants * 60} API requests per minute with polling`,
          performanceGain: `${Math.round((1 - stats.totalConnections / (stats.totalTenants * 60)) * 100)}% reduction in server load`
        }
      });
    } catch (error) {
      console.error('Error getting WebSocket stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Load test simulation endpoint
  app.post('/api/admin/simulate-load', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { totalUsers = 4000, totalTenants = 3000 } = req.body;
      const { loadTestSimulator } = await import('./loadTestSimulator');
      
      const metrics = loadTestSimulator.simulateLoad(totalUsers, totalTenants);
      const tenantStats = loadTestSimulator.getDetailedTenantStats();
      const serverCapacity = loadTestSimulator.estimateServerCapacity();
      
      res.json({
        success: true,
        simulation: {
          requested: { totalUsers, totalTenants },
          metrics,
          topTenants: tenantStats.slice(0, 10), // Top 10 tenants by connection count
          serverCapacity,
          scalabilityAnalysis: {
            canHandle: totalUsers <= serverCapacity.maxConnections,
            memoryUsagePercent: Math.round((metrics.memoryUsageMB / (serverCapacity.maxConnections * 8 / 1024)) * 100),
            recommendedUpgrade: totalUsers > serverCapacity.maxConnections ? "Consider upgrading to higher memory instance" : "Current capacity sufficient"
          }
        }
      });
    } catch (error) {
      console.error('Error running load simulation:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      console.error("Error updating business hours:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Failed to update business hours" });
    }
  });

  // Test webhook monitoring (for demonstration)
  app.post('/api/test-webhook-monitoring', isAuthenticated, async (req: any, res) => {
    try {
      // Use a valid tenant ID from the database instead of user ID
      const tenants = await storage.getAllTenants();
      const tenantId = tenants.length > 0 ? tenants[0].id : 'vetgroom1';
      
      console.log(`Testing webhook monitoring for tenant: ${tenantId}`);
      
      // Simulate a webhook failure
      await webhookMonitor.logError(
        tenantId,
        'whatsapp',
        'https://test-n8n-webhook.example.com',
        new Error('Test webhook failure - n8n en mantenimiento'),
        { phone: '+1234567890', message: 'Test message', type: 'test' }
      );
      
      res.json({ 
        success: true, 
        message: 'Test webhook error logged successfully' 
      });
    } catch (error) {
      console.error("Error testing webhook monitoring:", error);
      res.status(500).json({ message: `Failed to test webhook monitoring: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Super Admin Routes - Webhook Monitoring
  app.get('/api/superadmin/webhook-stats', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is super admin (this could be enhanced with proper role checking)
      const userId = (req.user as any)?.claims?.sub;
      
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

  // Route optimization endpoint
  // Route optimization endpoint with configurable providers
  app.post('/api/optimize-route/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { appointments, vanCapacity, fraccionamientoWeights, clinicLocation, date } = req.body;
      
      if (!appointments || !Array.isArray(appointments)) {
        return res.status(400).json({ message: "Valid appointments array is required" });
      }

      // Check for saved route first
      const appointmentIds = appointments.map((apt: any) => apt.id);
      const today = date || new Date().toISOString().split('T')[0];
      const savedRoute = await storage.getSavedRoute(tenantId, today, appointmentIds);
      
      if (savedRoute) {
        console.log(`Using cached route for ${tenantId} on ${today}`);
        return res.json({
          optimizedRoute: savedRoute.optimizedRoute,
          totalDistance: parseFloat(savedRoute.distanceKm || "0"),
          estimatedTime: savedRoute.estimatedDurationMinutes || 0,
          efficiency: 95, // Cached routes are considered highly efficient
          provider: 'cached',
          cached: true
        });
      }

      // Get company's route optimization configuration
      const tenant = await storage.getTenant(tenantId);
      const config = tenant ? await storage.getRouteOptimizationConfig(tenant.companyId) : undefined;

      // Transform appointments to route points
      const routePoints = appointments.map((apt: any) => ({
        id: apt.id,
        latitude: apt.client.latitude,
        longitude: apt.client.longitude,
        address: apt.client.address || `${apt.client.fraccionamiento}, Monterrey`,
        petCount: apt.pets?.length || 1,
        fraccionamiento: apt.client.fraccionamiento
      }));

      // Use advanced or simple routing based on configuration
      const { advancedRouteOptimization } = await import('./routeOptimizer');
      const result = await advancedRouteOptimization({
        clinicLocation: clinicLocation || [25.6866, -100.3161],
        appointments: routePoints,
        vanCapacity: vanCapacity || 'medium',
        fraccionamientoWeights: fraccionamientoWeights || {},
        config
      });

      // Map optimized points back to appointments
      const optimizedRoute = result.points.map(point => 
        appointments.find((apt: any) => apt.id === point.id)
      ).filter(Boolean);

      // Save the optimized route for future use
      await storage.saveOptimizedRoute(tenantId, today, appointmentIds, optimizedRoute, {
        totalDistance: result.totalDistance,
        totalDuration: result.estimatedTime
      });
      
      // Track beta feature usage
      if (tenant) {
        await storage.trackBetaFeatureUsage('route_optimization', tenant.companyId, tenantId, (req.user as any)?.claims?.sub);
      }

      res.json({
        optimizedRoute,
        totalDistance: result.totalDistance,
        estimatedTime: result.estimatedTime,
        efficiency: result.efficiency,
        provider: config?.isEnabled ? config.provider : 'simple_weight_based',
        cached: false
      });
    } catch (error) {
      console.error("Error optimizing route:", error);
      
      // Fallback: simple weight-based optimization
      const appointments = req.body.appointments || [];
      const fallbackRoute = appointments.sort((a: any, b: any) => {
        const weightA = req.body.fraccionamientoWeights?.[a.client?.fraccionamiento] || 5;
        const weightB = req.body.fraccionamientoWeights?.[b.client?.fraccionamiento] || 5;
        return weightA - weightB;
      });

      res.json({
        optimizedRoute: fallbackRoute,
        totalDistance: 0,
        estimatedTime: fallbackRoute.length * 15, // 15 minutes per stop
        efficiency: 75,
        provider: 'fallback_weight_based'
      });
    }
  });

  // Van management endpoints
  app.get('/api/vans/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const vans = await storage.getVans(tenantId);
      res.json(vans);
    } catch (error) {
      console.error("Error fetching vans:", error);
      res.status(500).json({ message: "Failed to fetch vans" });
    }
  });

  app.post('/api/vans', isAuthenticated, async (req, res) => {
    try {
      const vanData = req.body;
      const newVan = await storage.createVan(vanData);
      res.json(newVan);
    } catch (error) {
      console.error("Error creating van:", error);
      res.status(500).json({ message: "Failed to create van" });
    }
  });

  app.patch('/api/vans/:vanId', isAuthenticated, async (req, res) => {
    try {
      const { vanId } = req.params;
      const updates = req.body;
      const updatedVan = await storage.updateVan(vanId, updates);
      res.json(updatedVan);
    } catch (error) {
      console.error("Error updating van:", error);
      res.status(500).json({ message: "Failed to update van" });
    }
  });

  app.delete('/api/vans/:vanId', isAuthenticated, async (req, res) => {
    try {
      const { vanId } = req.params;
      await storage.deleteVan(vanId);
      res.json({ message: "Van deleted successfully" });
    } catch (error) {
      console.error("Error deleting van:", error);
      res.status(500).json({ message: "Failed to delete van" });
    }
  });

  // Super Admin route optimization configuration endpoints
  app.get("/api/superadmin/companies-route-config", isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const companiesWithConfig = await Promise.all(
        companies.map(async (company) => {
          const config = await storage.getRouteOptimizationConfig(company.id);
          return { ...company, config };
        })
      );
      res.json(companiesWithConfig);
    } catch (error) {
      console.error("Error fetching companies route config:", error);
      res.status(500).json({ error: "Failed to fetch companies route configuration" });
    }
  });

  app.post("/api/superadmin/route-config/:companyId", isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const configData = req.body;

      const config = await storage.createRouteOptimizationConfig({
        companyId,
        ...configData,
      });

      res.json(config);
    } catch (error) {
      console.error("Error updating route config:", error);
      res.status(500).json({ error: "Failed to update route configuration" });
    }
  });

  // Delivery tracking routes
  app.get("/api/delivery-tracking/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const activeDeliveries = await storage.getActiveDeliveryTracking(tenantId);
      
      // Enhance with van and driver details, route information
      const enhancedDeliveries = await Promise.all(
        activeDeliveries.map(async (delivery) => {
          const van = await storage.getVan(delivery.vanId);
          const driver = await storage.getStaff(delivery.driverId);
          
          return {
            ...delivery,
            vanName: van?.name || "Unknown Van",
            driverName: Array.isArray(driver) ? (driver[0]?.name || "Unknown Driver") : "Unknown Driver",
            route: {
              id: delivery.routeId,
              name: `Ruta ${new Date(delivery.createdAt || new Date()).toLocaleDateString()}`,
              totalStops: 0, // TODO: Get from delivery route
              completedStops: 0, // TODO: Calculate from check-ins
            }
          };
        })
      );
      
      res.json(enhancedDeliveries);
    } catch (error) {
      console.error("Error fetching delivery tracking:", error);
      res.status(500).json({ message: "Failed to fetch delivery tracking" });
    }
  });

  app.get("/api/delivery-alerts/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const alerts = await storage.getDeliveryAlerts(tenantId);
      
      // Enhance with van and driver details
      const enhancedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          const tracking = await storage.getDeliveryTracking(alert.deliveryTrackingId);
          if (!tracking) return { ...alert, vanName: "Unknown", driverName: "Unknown" };
          
          const van = await storage.getVan(tracking.vanId);
          const driver = await storage.getStaff(tracking.driverId);
          
          return {
            ...alert,
            vanName: van?.name || "Unknown Van",
            driverName: Array.isArray(driver) ? (driver[0]?.name || "Unknown Driver") : "Unknown Driver",
          };
        })
      );
      
      res.json(enhancedAlerts);
    } catch (error) {
      console.error("Error fetching delivery alerts:", error);
      res.status(500).json({ message: "Failed to fetch delivery alerts" });
    }
  });

  app.post("/api/delivery-tracking/:trackingId/emergency", isAuthenticated, async (req, res) => {
    try {
      const { trackingId } = req.params;
      
      // Update delivery status to emergency
      await storage.updateDeliveryTracking(trackingId, { 
        status: "emergency",
        updatedAt: new Date() 
      });

      // Create emergency alert
      const tracking = await storage.getDeliveryTracking(trackingId);
      if (tracking) {
        await storage.createDeliveryAlert({
          tenantId: tracking.tenantId,
          deliveryTrackingId: trackingId,
          alertType: "emergency",
          severity: "critical",
          recipientType: "admin",
          message: "Alerta de emergencia activada manualmente para la entrega",
        });

        // Send WhatsApp notification via n8n webhook
        try {
          await sendWhatsAppAlert({
            tenantId: tracking.tenantId,
            message: `🚨 EMERGENCIA: Entrega ${trackingId} necesita atención inmediata`,
            type: "emergency"
          });
        } catch (webhookError) {
          console.error("Failed to send WhatsApp emergency alert:", webhookError);
        }
      }

      res.json({ message: "Emergency alert sent successfully" });
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      res.status(500).json({ message: "Failed to send emergency alert" });
    }
  });

  app.patch("/api/delivery-alerts/:alertId/resolve", isAuthenticated, async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      const resolvedAlert = await storage.resolveDeliveryAlert(alertId, userId);
      res.json(resolvedAlert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Driver check-in endpoint
  app.post("/api/driver-checkin", isAuthenticated, async (req, res) => {
    try {
      const checkInData = req.body;
      const newCheckIn = await storage.createDriverCheckIn(checkInData);
      
      // Update delivery tracking with latest check-in
      await storage.updateDeliveryTracking(checkInData.deliveryTrackingId, {
        lastCheckIn: new Date(),
        currentLocation: checkInData.location,
        nextCheckInDue: checkInData.estimatedNextCheckIn,
      });

      res.json(newCheckIn);
    } catch (error) {
      console.error("Error creating driver check-in:", error);
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  // WhatsApp alert function
  async function sendWhatsAppAlert({ tenantId, message, type }: { tenantId: string, message: string, type: string }) {
    if (!process.env.N8N_WEBHOOK_URL || !process.env.N8N_JWT_TOKEN) {
      throw new Error("n8n webhook not configured");
    }

    const webhookPayload = {
      tenantId,
      message,
      type: `delivery_${type}`,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.N8N_JWT_TOKEN}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    return response.json();
  }

  // RBAC Helper Functions
  const isSystemAdmin = async (req: any) => {
    const user = req.user;
    if (!user?.claims?.sub) return false;
    
    try {
      return await storage.hasSystemRole(user.claims.sub);
    } catch (error) {
      console.error('Error checking system admin role:', error);
      return false;
    }
  };

  const hasDebugAccess = async (req: any) => {
    const user = req.user;
    if (!user?.claims?.sub) return false;
    
    try {
      return await storage.hasDebugRole(user.claims.sub);
    } catch (error) {
      console.error('Error checking debug role:', error);
      return false;
    }
  };

  const getUserAccessLevel = async (req: any) => {
    const user = req.user;
    if (!user?.claims?.sub) return 'none';
    
    try {
      const roles = await storage.getUserSystemRoles(user.claims.sub);
      
      if (roles.some(r => ['debug', 'developer', 'sysadmin'].includes(r.roleName))) {
        return 'system_admin';
      }
      
      // Check if user is a super tenant (company admin)
      // This would need to be implemented based on your tenant hierarchy
      
      return 'tenant';
    } catch (error) {
      console.error('Error checking user access level:', error);
      return 'none';
    }
  };

  // Add error logging endpoint
  app.post('/api/error-log', isAuthenticated, async (req: any, res) => {
    try {
      const errorInfo = req.body;
      console.group('🐛 Frontend Error Log');
      console.error('Context:', errorInfo.context);
      console.error('Error:', errorInfo.error);
      console.log('User Info:', {
        userId: errorInfo.userId,
        tenantId: errorInfo.tenantId,
        timestamp: errorInfo.timestamp
      });
      console.log('Additional Info:', errorInfo.additionalInfo);
      console.groupEnd();
      
      // In production, you might want to store this in a database
      // await storage.logError(errorInfo);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to log frontend error:', error);
      res.status(500).json({ message: 'Failed to log error' });
    }
  });

  // Get user access info
  app.get('/api/auth/access-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const cacheKey = `access_${userId}`;
      
      // Check cache first
      const cached = userCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
      
      const accessLevel = await getUserAccessLevel(req);
      const roles = await storage.getUserSystemRoles(userId);
      
      const accessInfo = {
        accessLevel,
        roles,
        canAccessSuperAdmin: accessLevel === 'system_admin',
        canAccessAdmin: ['system_admin', 'super_tenant'].includes(accessLevel),
        canDebugTenants: await hasDebugAccess(req)
      };
      
      // Cache the result
      userCache.set(cacheKey, { data: accessInfo, timestamp: Date.now() });
      
      res.json(accessInfo);
    } catch (error) {
      console.error("Error fetching access info:", error);
      res.status(500).json({ message: "Failed to fetch access info" });
    }
  });



  // Get all companies for SuperAdmin
  app.get('/api/superadmin/companies', isAuthenticated, async (req: any, res) => {
    try {
      console.log('SuperAdmin companies - User ID:', req.user?.claims?.sub);
      console.log('SuperAdmin companies - User Email:', req.user?.claims?.email);
      
      const hasRole = await isSystemAdmin(req);
      console.log('SuperAdmin companies - Has system role:', hasRole);
      
      if (!hasRole) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get system roles
  app.get('/api/superadmin/system-roles', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const systemRoles = await storage.getSystemRoles();
      res.json(systemRoles);
    } catch (error) {
      console.error("Error fetching system roles:", error);
      res.status(500).json({ message: "Failed to fetch system roles" });
    }
  });

  // Get roles for a company
  app.get('/api/superadmin/roles/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { companyId } = req.params;
      const roles = await storage.getRolesByCompany(companyId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Create new role
  app.post('/api/superadmin/roles', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const roleData = req.body;
      const newRole = await storage.createRole(roleData);
      res.json(newRole);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Get users for a company
  app.get('/api/superadmin/users/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { companyId } = req.params;
      const users = await storage.getUsersByCompany(companyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user assignments for a company
  app.get('/api/superadmin/user-assignments/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { companyId } = req.params;
      const assignments = await storage.getUserAssignments(companyId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ message: "Failed to fetch user assignments" });
    }
  });

  // Assign system role to user
  app.post('/api/superadmin/assign-system-role', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { userId, systemRoleId } = req.body;
      const assignment = await storage.assignSystemRole(userId, systemRoleId);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning system role:", error);
      res.status(500).json({ message: "Failed to assign system role" });
    }
  });

  // Team Member Management Endpoints
  
  // Get all team members with their system roles and company assignments
  app.get('/api/superadmin/team-members', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const teamMembers = await storage.getTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Invite new team member
  app.post('/api/superadmin/team-members/invite', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { email, firstName, lastName, systemRoleId } = req.body;
      
      // Create or get user
      const user = await storage.createOrGetUser({ 
        email, 
        firstName, 
        lastName 
      });
      
      // Assign system role
      await storage.assignSystemRole(user.id, systemRoleId);
      
      res.json({ 
        success: true, 
        message: "Team member invited successfully",
        userId: user.id 
      });
    } catch (error) {
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  // Assign system role to team member
  app.post('/api/superadmin/team-members/assign-system-role', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { userId, systemRoleId } = req.body;
      const assignment = await storage.assignSystemRole(userId, systemRoleId);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning system role:", error);
      res.status(500).json({ message: "Failed to assign system role" });
    }
  });

  // Remove system role from team member
  app.delete('/api/superadmin/team-members/remove-system-role', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "System admin access required" });
      }
      
      const { userId, systemRoleId } = req.body;
      await storage.removeSystemRole(userId, systemRoleId);
      res.json({ success: true, message: "System role removed successfully" });
    } catch (error) {
      console.error("Error removing system role:", error);
      res.status(500).json({ message: "Failed to remove system role" });
    }
  });

  // Object Storage Routes
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get('/objects/:objectPath(*)', async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get('/public-objects/:filePath(*)', async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Medical Appointments API
  app.get('/api/medical-appointments/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const appointments = await storage.getMedicalAppointments(tenantId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching medical appointments:", error);
      res.status(500).json({ message: "Failed to fetch medical appointments" });
    }
  });

  app.get('/api/medical-appointments/:appointmentId', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await storage.getMedicalAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Medical appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching medical appointment:", error);
      res.status(500).json({ message: "Failed to fetch medical appointment" });
    }
  });

  app.post('/api/medical-appointments/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const appointmentData = { ...req.body, tenantId };
      const appointment = await storage.createMedicalAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating medical appointment:", error);
      res.status(500).json({ message: "Failed to create medical appointment" });
    }
  });

  app.put('/api/medical-appointments/:appointmentId', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await storage.updateMedicalAppointment(appointmentId, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating medical appointment:", error);
      res.status(500).json({ message: "Failed to update medical appointment" });
    }
  });

  // Medical Document Routes
  app.post('/api/medical-appointments/:appointmentId/documents', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      const appointment = await storage.getMedicalAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Medical appointment not found" });
      }

      const documentData = { 
        ...req.body, 
        appointmentId, 
        tenantId: appointment.tenantId,
        petId: appointment.petId,
        uploadedBy: userId 
      };
      
      const document = await storage.createMedicalDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error("Error creating medical document:", error);
      res.status(500).json({ message: "Failed to create medical document" });
    }
  });

  app.get('/api/medical-appointments/:appointmentId/documents', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const documents = await storage.getMedicalDocuments(appointmentId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching medical documents:", error);
      res.status(500).json({ message: "Failed to fetch medical documents" });
    }
  });

  // Follow-up Tasks API
  app.get('/api/medical-appointments/follow-up/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const followUpTasks = await storage.getFollowUpTasks(tenantId);
      res.json(followUpTasks);
    } catch (error) {
      console.error("Error fetching follow-up tasks:", error);
      res.status(500).json({ message: "Failed to fetch follow-up tasks" });
    }
  });

  app.put('/api/medical-appointments/:appointmentId/complete-followup', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      const appointment = await storage.updateMedicalAppointment(appointmentId, {
        isConfirmed: true,
        confirmedAt: new Date(),
        confirmedBy: userId
      });
      
      res.json(appointment);
    } catch (error) {
      console.error("Error completing follow-up:", error);
      res.status(500).json({ message: "Failed to complete follow-up" });
    }
  });

  app.put('/api/medical-appointments/:appointmentId/schedule-followup', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { followUpDate } = req.body;
      
      const appointment = await storage.updateMedicalAppointment(appointmentId, {
        followUpDate
      });
      
      res.json(appointment);
    } catch (error) {
      console.error("Error scheduling follow-up:", error);
      res.status(500).json({ message: "Failed to schedule follow-up" });
    }
  });

  // Debug endpoint for system admins to access all tenants
  app.get('/api/debug/all-tenants', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSystemAdmin(req))) {
        return res.status(403).json({ message: "Debug access requires system admin role" });
      }
      
      const tenants = await storage.getAllTenantsWithCompany();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching all tenants for debug:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Medical Records API
  app.get('/api/medical-records/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const records = await storage.getMedicalRecords(tenantId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  app.post('/api/medical-records/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const recordData = { ...req.body, tenantId };
      
      // Create medical record
      const record = await storage.createMedicalRecord(recordData);
      
      // Check company billing configuration for auto-invoice generation
      const tenant = await storage.getTenant(tenantId);
      if (tenant) {
        const billingConfig = await storage.getCompanyBillingConfig(tenant.companyId);
        
        if (billingConfig?.autoGenerateMedicalInvoices) {
          // Generate invoice automatically
          const invoiceNumber = `MED-${Date.now()}`;
          const suppliesCost = recordData.suppliesCost || 0;
          const servicesCost = recordData.servicesCost || 100; // Default consultation fee
          
          await storage.createInvoice({
            tenantId,
            medicalRecordId: record.id,
            clientId: recordData.clientId,
            invoiceNumber,
            totalAmount: suppliesCost + servicesCost,
            suppliesCost,
            servicesCost,
            status: 'pending'
          });
        }
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error creating medical record:", error);
      res.status(500).json({ message: "Failed to create medical record" });
    }
  });

  app.get('/api/medical-records/:tenantId/:recordId', isAuthenticated, async (req, res) => {
    try {
      const { recordId } = req.params;
      const record = await storage.getMedicalRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Medical record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching medical record:", error);
      res.status(500).json({ message: "Failed to fetch medical record" });
    }
  });

  app.put('/api/medical-records/:recordId', isAuthenticated, async (req, res) => {
    try {
      const { recordId } = req.params;
      const record = await storage.updateMedicalRecord(recordId, req.body);
      res.json(record);
    } catch (error) {
      console.error("Error updating medical record:", error);
      res.status(500).json({ message: "Failed to update medical record" });
    }
  });

  // Grooming Records API
  app.get('/api/grooming-records/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const records = await storage.getGroomingRecords(tenantId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching grooming records:", error);
      res.status(500).json({ message: "Failed to fetch grooming records" });
    }
  });

  app.post('/api/grooming-records/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const recordData = { ...req.body, tenantId };
      
      // Create grooming record
      const record = await storage.createGroomingRecord(recordData);
      
      // Check company billing configuration
      const tenant = await storage.getTenant(tenantId);
      if (tenant) {
        const billingConfig = await storage.getCompanyBillingConfig(tenant.companyId);
        
        // Auto-generate invoice if enabled
        if (billingConfig?.autoGenerateGroomingInvoices) {
          const invoiceNumber = `GRM-${Date.now()}`;
          const totalCost = parseFloat(recordData.totalCost || '0');
          
          await storage.createInvoice({
            tenantId,
            groomingRecordId: record.id,
            clientId: recordData.clientId,
            invoiceNumber,
            totalAmount: totalCost.toString(),
            servicesCost: totalCost.toString(),
            status: 'pending'
          });
        }
        
        // Auto-schedule delivery if enabled and client needs delivery
        if (billingConfig?.autoScheduleDelivery && recordData.needsDelivery) {
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + 1); // Schedule for next day
          
          await storage.createDeliverySchedule({
            tenantId,
            groomingRecordId: record.id,
            clientId: recordData.clientId,
            deliveryDate: deliveryDate.toISOString().split('T')[0],
            notes: `Delivery for grooming session ${record.id}`
          });
        }
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error creating grooming record:", error);
      res.status(500).json({ message: "Failed to create grooming record" });
    }
  });

  app.get('/api/grooming-records/:tenantId/:recordId', isAuthenticated, async (req, res) => {
    try {
      const { recordId } = req.params;
      const record = await storage.getGroomingRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Grooming record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching grooming record:", error);
      res.status(500).json({ message: "Failed to fetch grooming record" });
    }
  });

  app.put('/api/grooming-records/:recordId', isAuthenticated, async (req, res) => {
    try {
      const { recordId } = req.params;
      const record = await storage.updateGroomingRecord(recordId, req.body);
      res.json(record);
    } catch (error) {
      console.error("Error updating grooming record:", error);
      res.status(500).json({ message: "Failed to update grooming record" });
    }
  });

  // Update grooming record status with automated workflow
  app.patch("/api/grooming-records/:tenantId/:recordId/status", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, recordId } = req.params;
      const { status } = req.body;

      // Update the status with timestamp
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
        
        // Auto-calculate next appointment date based on grooming follow-up config
        try {
          const tenant = await storage.getTenant(tenantId);
          if (!tenant) {
            console.log("Tenant not found for follow-up calculation");
            return;
          }
          const billingConfig = await storage.getCompanyBillingConfig(tenant.companyId);
          
          if (billingConfig?.enableGroomingFollowUp) {
            const followUpDays = billingConfig.groomingFollowUpDays || 30;
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + followUpDays);
            updateData.nextAppointmentDate = nextDate.toISOString().split('T')[0];
            updateData.nextAppointmentRecommended = true;
          }
        } catch (configError) {
          console.log("Could not get billing config for follow-up calculation:", configError);
        }
      } else if (status === 'billed') {
        updateData.billedAt = new Date().toISOString();
      }

      const record = await storage.updateGroomingRecord(recordId, updateData);

      // If status is 'billed', trigger billing workflow
      if (status === 'billed') {
        try {
          // Get billing configuration
          const tenant = await storage.getTenant(tenantId);
          if (!tenant) {
            console.log("Tenant not found for billing workflow");
            return;
          }
          const billingConfig = await storage.getCompanyBillingConfig(tenant.companyId);
          
          if (billingConfig?.autoGenerateGroomingInvoices) {
            // Get client ID through pet relation
            // We need to add a method to get pet by ID, but for now use a direct query
            const [pet] = await db.select().from(pets).where(eq(pets.id, record.petId));
            if (!pet) {
              console.log("Pet not found for grooming record");
              return;
            }
            
            // Auto-generate invoice
            const invoiceData = {
              tenantId,
              groomingRecordId: recordId,
              clientId: pet.clientId,
              invoiceNumber: `GR-${Date.now()}`,
              totalAmount: record.totalCost || "0",
              servicesCost: record.totalCost || "0",
              suppliesCost: "0",
              status: "pending" as const,
            };
            
            await storage.createInvoice(invoiceData);
            console.log(`Auto-generated invoice for grooming record ${recordId}`);
          }

          // Auto-schedule delivery if configured
          if (billingConfig?.autoScheduleDelivery) {
            // Reuse the pet data from above if available, or query again
            const [pet] = await db.select().from(pets).where(eq(pets.id, record.petId));
            if (!pet) {
              console.log("Pet not found for delivery scheduling");
              return;
            }
            
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 1); // Next day
            
            const deliveryData = {
              tenantId,
              groomingRecordId: recordId,
              clientId: pet.clientId,
              deliveryDate: deliveryDate.toISOString().split('T')[0],
              status: "scheduled" as const,
            };
            
            await storage.createDeliverySchedule(deliveryData);
            console.log(`Auto-scheduled delivery for grooming record ${recordId}`);
          }
        } catch (billingError) {
          console.error("Error in billing workflow:", billingError);
          // Don't fail the status update if billing fails
        }
      }

      res.json(record);
    } catch (error) {
      console.error("Error updating grooming record status:", error);
      res.status(500).json({ error: "Failed to update grooming record status" });
    }
  });

  // Staff by role endpoint
  app.get('/api/staff/:tenantId/:role', isAuthenticated, async (req, res) => {
    try {
      const { tenantId, role } = req.params;
      const staff = await storage.getStaffByRole(tenantId, role);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff by role:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Company billing configuration endpoints
  app.get('/api/company-billing-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const config = await storage.getCompanyBillingConfig(companyId);
      res.json(config || {
        companyId,
        autoGenerateMedicalInvoices: false,
        autoGenerateGroomingInvoices: false,
        allowAdvanceScheduling: true,
        autoScheduleDelivery: false
      });
    } catch (error) {
      console.error("Error fetching billing config:", error);
      res.status(500).json({ message: "Failed to fetch billing configuration" });
    }
  });

  app.put('/api/company-billing-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const config = await storage.upsertCompanyBillingConfig({ 
        ...req.body, 
        companyId 
      });
      res.json(config);
    } catch (error) {
      console.error("Error updating billing config:", error);
      res.status(500).json({ message: "Failed to update billing configuration" });
    }
  });

  // Billing invoices endpoints
  app.get('/api/invoices/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const invoices = await storage.getInvoicesByTenant(tenantId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.put('/api/invoices/:invoiceId/status', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { status } = req.body;
      const updatedInvoice = await storage.updateInvoiceStatus(invoiceId, status);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  // Delivery scheduling endpoints
  app.get('/api/delivery-schedule/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const schedules = await storage.getDeliverySchedulesByTenant(tenantId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching delivery schedules:", error);
      res.status(500).json({ message: "Failed to fetch delivery schedules" });
    }
  });

  app.post('/api/delivery-schedule/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const scheduleData = { ...req.body, tenantId };
      const schedule = await storage.createDeliverySchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating delivery schedule:", error);
      res.status(500).json({ message: "Failed to create delivery schedule" });
    }
  });

  app.put('/api/delivery-schedule/:scheduleId/status', isAuthenticated, async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { status } = req.body;
      const updatedSchedule = await storage.updateDeliveryStatus(scheduleId, status);
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ message: "Failed to update delivery status" });
    }
  });

  // Medical Appointments routes
  app.get('/api/medical-appointments/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const appointments = await storage.getMedicalAppointments(tenantId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching medical appointments:", error);
      res.status(500).json({ message: "Failed to fetch medical appointments" });
    }
  });

  app.post('/api/medical-appointments/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const appointmentData = { ...req.body, tenantId };
      const appointment = await storage.createMedicalAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating medical appointment:", error);
      res.status(500).json({ message: "Failed to create medical appointment" });
    }
  });

  app.put('/api/medical-appointments/:tenantId/:appointmentId', isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await storage.updateMedicalAppointment(appointmentId, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating medical appointment:", error);
      res.status(500).json({ message: "Failed to update medical appointment" });
    }
  });

  // Invoice Queue routes
  app.get('/api/invoice-queue/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const items = await storage.getInvoiceQueueByTenant(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice queue:", error);
      res.status(500).json({ message: "Failed to fetch invoice queue" });
    }
  });

  app.post('/api/invoice-queue/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const itemData = { ...req.body, tenantId };
      const item = await storage.createInvoiceQueueItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating invoice queue item:", error);
      res.status(500).json({ message: "Failed to create invoice queue item" });
    }
  });

  // Payment Gateway Configuration routes
  app.get("/api/admin/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const { companyId, tenantId } = req.query;
      const configs = await storage.getPaymentGatewayConfigs(
        companyId as string, 
        tenantId as string
      );
      res.json(configs);
    } catch (error) {
      console.error("Error fetching payment gateway configs:", error);
      res.status(500).json({ message: "Failed to fetch payment gateway configurations" });
    }
  });

  app.post("/api/admin/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const newConfig = await storage.createPaymentGatewayConfig(req.body);
      res.json(newConfig);
    } catch (error) {
      console.error("Error creating payment gateway config:", error);
      res.status(500).json({ message: "Failed to create payment gateway configuration" });
    }
  });

  app.put("/api/admin/payment-gateways/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedConfig = await storage.updatePaymentGatewayConfig(id, req.body);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating payment gateway config:", error);
      res.status(500).json({ message: "Failed to update payment gateway configuration" });
    }
  });

  app.delete("/api/admin/payment-gateways/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentGatewayConfig(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment gateway config:", error);
      res.status(500).json({ message: "Failed to delete payment gateway configuration" });
    }
  });

  // Billing Queue routes
  app.get("/api/billing-queue/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const billingQueue = await storage.getBillingQueue(tenantId);
      res.json(billingQueue);
    } catch (error) {
      console.error("Error fetching billing queue:", error);
      res.status(500).json({ message: "Failed to fetch billing queue" });
    }
  });

  app.post("/api/billing-queue", isAuthenticated, async (req, res) => {
    try {
      const newItem = await storage.createBillingQueueItem(req.body);
      res.json(newItem);
    } catch (error) {
      console.error("Error creating billing queue item:", error);
      res.status(500).json({ message: "Failed to create billing queue item" });
    }
  });

  app.put("/api/billing-queue/:id/process", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, paymentGateway, notes, status } = req.body;
      
      let updates: any = {
        paymentMethod,
        status,
        processedBy: (req.user as any)?.claims?.sub,
        processedAt: new Date(),
      };

      if (notes) updates.notes = notes;
      if (paymentGateway) updates.paymentGateway = paymentGateway;

      // TODO: Implement actual payment link generation with Stripe/MercadoPago
      if (paymentMethod === "payment_link") {
        updates.paymentLinkUrl = `https://pay.example.com/checkout/${id}`;
        updates.status = "processing";
      }

      const updatedItem = await storage.updateBillingQueueItem(id, updates);
      
      // TODO: Re-enable when inventory tables are implemented
      // Process inventory deduction when payment is completed
      // if (status === "paid_cash" || status === "paid_link") {
      //   await storage.processInventoryForPayment(id);
      // }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process paymentt" });
    }
  });

  // Subscription plans routes (public)
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Company subscription routes
  app.get("/api/company-subscription/:companyId", isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const subscription = await storage.getCompanySubscription(companyId);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching company subscription:", error);
      res.status(500).json({ message: "Failed to fetch company subscription" });
    }
  });

  // Tax configuration routes
  app.get('/api/tax-config/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.getTaxConfiguration(tenantId);
      res.json(config || {
        tenantId,
        countryCode: 'MX',
        vatRate: 16,
        invoiceNumberPrefix: 'FAC',
        invoiceNumberCounter: 1,
        currency: 'MXN'
      });
    } catch (error) {
      console.error("Error fetching tax configuration:", error);
      res.status(500).json({ message: "Failed to fetch tax configuration" });
    }
  });

  app.put('/api/tax-config/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.upsertTaxConfiguration({ 
        ...req.body, 
        tenantId 
      });
      res.json(config);
    } catch (error) {
      console.error("Error updating tax configuration:", error);
      res.status(500).json({ message: "Failed to update tax configuration" });
    }
  });

  // Pending invoices routes
  app.get('/api/pending-invoices/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const invoices = await storage.getPendingInvoices(tenantId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      res.status(500).json({ message: "Failed to fetch pending invoices" });
    }
  });

  app.get('/api/pending-invoices/:tenantId/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoice = await storage.getPendingInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching pending invoice:", error);
      res.status(500).json({ message: "Failed to fetch pending invoice" });
    }
  });

  app.post('/api/pending-invoices/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber(tenantId);
      
      const invoiceData = { 
        ...req.body, 
        tenantId,
        invoiceNumber
      };
      
      const invoice = await storage.createPendingInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating pending invoice:", error);
      res.status(500).json({ message: "Failed to create pending invoice" });
    }
  });

  app.put('/api/pending-invoices/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoice = await storage.updatePendingInvoice(invoiceId, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating pending invoice:", error);
      res.status(500).json({ message: "Failed to update pending invoice" });
    }
  });

  // Invoice line items routes
  app.get('/api/invoice-line-items/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const lineItems = await storage.getInvoiceLineItems(invoiceId);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching invoice line items:", error);
      res.status(500).json({ message: "Failed to fetch invoice line items" });
    }
  });

  app.post('/api/invoice-line-items/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const lineItemData = { ...req.body, invoiceId };
      const lineItem = await storage.createInvoiceLineItem(lineItemData);
      res.json(lineItem);
    } catch (error) {
      console.error("Error creating invoice line item:", error);
      res.status(500).json({ message: "Failed to create invoice line item" });
    }
  });

  app.put('/api/invoice-line-items/:lineItemId', isAuthenticated, async (req, res) => {
    try {
      const { lineItemId } = req.params;
      const lineItem = await storage.updateInvoiceLineItem(lineItemId, req.body);
      res.json(lineItem);
    } catch (error) {
      console.error("Error updating invoice line item:", error);
      res.status(500).json({ message: "Failed to update invoice line item" });
    }
  });

  app.delete('/api/invoice-line-items/:lineItemId', isAuthenticated, async (req, res) => {
    try {
      const { lineItemId } = req.params;
      await storage.deleteInvoiceLineItem(lineItemId);
      res.json({ message: "Invoice line item deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice line item:", error);
      res.status(500).json({ message: "Failed to delete invoice line item" });
    }
  });

  // LateNode Webhook Integration API Routes
  app.get('/api/webhook-integrations/:companyId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const integrations = await storage.getWebhookIntegrations(companyId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching webhook integrations:", error);
      res.status(500).json({ message: "Failed to fetch webhook integrations" });
    }
  });

  app.get('/api/webhook-integrations/:companyId/type/:webhookType', isAuthenticated, async (req, res) => {
    try {
      const { companyId, webhookType } = req.params;
      const integrations = await storage.getWebhookIntegrationsByType(companyId, webhookType);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching webhook integrations by type:", error);
      res.status(500).json({ message: "Failed to fetch webhook integrations" });
    }
  });

  app.post('/api/webhook-integrations/:companyId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const integrationData = { ...req.body, companyId };
      const integration = await storage.createWebhookIntegration(integrationData);
      res.json(integration);
    } catch (error) {
      console.error("Error creating webhook integration:", error);
      res.status(500).json({ message: "Failed to create webhook integration" });
    }
  });

  app.put('/api/webhook-integrations/:integrationId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { integrationId } = req.params;
      const integration = await storage.updateWebhookIntegration(integrationId, req.body);
      res.json(integration);
    } catch (error) {
      console.error("Error updating webhook integration:", error);
      res.status(500).json({ message: "Failed to update webhook integration" });
    }
  });

  app.delete('/api/webhook-integrations/:integrationId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { integrationId } = req.params;
      await storage.deleteWebhookIntegration(integrationId);
      res.json({ message: "Webhook integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting webhook integration:", error);
      res.status(500).json({ message: "Failed to delete webhook integration" });
    }
  });

  // Webhook Logs API
  app.get('/api/webhook-logs/:integrationId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { integrationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getWebhookLogs(integrationId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  app.get('/api/webhook-logs/tenant/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getWebhookLogsByTenant(tenantId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs for tenant:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  app.get('/api/webhook-stats/:companyId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      const stats = await storage.getWebhookStats(companyId, days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching webhook stats:", error);
      res.status(500).json({ message: "Failed to fetch webhook stats" });
    }
  });

  // Webhook Test Endpoint for Super Admin
  app.post('/api/webhook-integrations/:integrationId/test', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { integrationId } = req.params;
      const integration = await storage.getWebhookIntegration(integrationId);
      
      if (!integration) {
        return res.status(404).json({ message: "Webhook integration not found" });
      }

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        data: req.body || { message: "Test webhook from VetGroom Super Admin" }
      };

      const startTime = Date.now();
      const response = await fetch(integration.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(integration.headers || {}),
          ...(integration.apiKey ? { 'Authorization': `Bearer ${integration.apiKey}` } : {})
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(integration.timeoutMs || 30000)
      });

      const executionTime = Date.now() - startTime;
      const responseText = await response.text();

      // Log the test execution
      await storage.createWebhookLog({
        webhookIntegrationId: integrationId,
        tenantId: null, // Test logs don't belong to specific tenants
        triggerType: 'test',
        triggerData: testPayload,
        requestPayload: testPayload,
        responseStatus: response.status,
        responseBody: responseText,
        executionTimeMs: executionTime,
        success: response.ok,
        retryCount: 0
      });

      // Update last used timestamp
      await storage.updateWebhookLastUsed(integrationId);

      res.json({
        success: response.ok,
        status: response.status,
        executionTime,
        response: responseText,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to test webhook",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Super Admin Company Management Endpoints
  
  // Create new company (Super Admin only)
  app.post('/api/superadmin/companies', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const companyData = req.body;
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Create company trial (Super Admin only)
  app.post('/api/superadmin/companies/trial', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId, duration, customFee, notes } = req.body;
      
      // Create trial subscription record
      const trialData = {
        companyId,
        subscriptionType: 'trial',
        trialDuration: duration,
        trialCustomFee: customFee || 0,
        trialNotes: notes,
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      // For now, we'll store this in the company settings
      // In a full implementation, you'd have a separate subscriptions table
      await storage.updateCompanySettings(companyId, { 
        subscriptionType: 'trial',
        trialInfo: trialData
      });
      
      res.json({ success: true, trial: trialData });
    } catch (error) {
      console.error("Error creating company trial:", error);
      res.status(500).json({ message: "Failed to create company trial" });
    }
  });

  // Create company subscription (Super Admin only)
  app.post('/api/superadmin/companies/subscription', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId, planId } = req.body;
      
      const subscriptionData = {
        companyId,
        planId,
        subscriptionType: 'paid',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
      };
      
      await storage.updateCompanySettings(companyId, { 
        subscriptionType: 'paid',
        subscriptionInfo: subscriptionData
      });
      
      res.json({ success: true, subscription: subscriptionData });
    } catch (error) {
      console.error("Error creating company subscription:", error);
      res.status(500).json({ message: "Failed to create company subscription" });
    }
  });

  // Setup WhatsApp credits for company (Super Admin only)
  app.post('/api/superadmin/companies/whatsapp', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId, credits } = req.body;
      
      // Create WhatsApp external service subscription
      const whatsappSubscription = {
        companyId,
        serviceName: 'whatsapp',
        serviceType: 'communication',
        subscriptionStatus: 'active',
        creditsRemaining: credits,
        creditsTotal: credits,
        pricePerBlock: 29.99,
        blockSize: 1000,
        autoRefill: false,
        lowCreditThreshold: 100,
        usageThisPeriod: 0,
      };
      
      const subscription = await storage.createExternalServiceSubscription(whatsappSubscription);
      res.json({ success: true, subscription });
    } catch (error) {
      console.error("Error creating WhatsApp subscription:", error);
      res.status(500).json({ message: "Failed to create WhatsApp subscription" });
    }
  });

  // Get all companies (Super Admin only)
  app.get('/api/superadmin/companies', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // External Services API Endpoints
  
  // Get all external service subscriptions for a company (Super Admin only)
  app.get('/api/external-services/:companyId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const subscriptions = await storage.getExternalServiceSubscriptions(companyId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching external service subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch external service subscriptions" });
    }
  });

  // Create or update external service subscription (Super Admin only)
  app.post('/api/external-services/:companyId/subscription', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const subscriptionData = { ...req.body, companyId };
      const subscription = await storage.createExternalServiceSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating external service subscription:", error);
      res.status(500).json({ message: "Failed to create external service subscription" });
    }
  });

  // Update subscription credits (Super Admin only)
  app.put('/api/external-services/:subscriptionId/credits', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { creditsToAdd, blocksPurchased } = req.body;
      
      const subscription = await storage.addExternalServiceCredits(subscriptionId, creditsToAdd, blocksPurchased);
      res.json(subscription);
    } catch (error) {
      console.error("Error adding external service credits:", error);
      res.status(500).json({ message: "Failed to add external service credits" });
    }
  });

  // Get WhatsApp usage statistics for a company
  app.get('/api/external-services/:companyId/whatsapp-usage', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { startDate, endDate } = req.query;
      
      const usage = await storage.getWhatsAppUsageStats(companyId, startDate as string, endDate as string);
      res.json(usage);
    } catch (error) {
      console.error("Error fetching WhatsApp usage:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp usage statistics" });
    }
  });

  // Record WhatsApp message usage
  app.post('/api/external-services/:companyId/whatsapp-usage', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { tenantId, messageType, messageCount, triggerType, businessHours } = req.body;
      
      const usage = await storage.recordWhatsAppUsage({
        companyId,
        tenantId,
        messageType,
        messageCount: messageCount || 1,
        triggerType,
        businessHours: businessHours !== false
      });
      
      res.json(usage);
    } catch (error) {
      console.error("Error recording WhatsApp usage:", error);
      res.status(500).json({ message: "Failed to record WhatsApp usage" });
    }
  });

  // Get external service subscription status for a company (tenant access)
  app.get('/api/external-services/status/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      // Get WhatsApp subscription status
      const whatsappSubscription = await storage.getExternalServiceSubscriptionByType(companyId, 'whatsapp');
      
      res.json({
        whatsapp: {
          enabled: whatsappSubscription?.subscriptionStatus === 'active',
          creditsRemaining: whatsappSubscription?.creditsRemaining || 0,
          lowCreditAlert: (whatsappSubscription?.creditsRemaining || 0) <= (whatsappSubscription?.lowCreditThreshold || 100)
        }
      });
    } catch (error) {
      console.error("Error fetching external service status:", error);
      res.status(500).json({ message: "Failed to fetch external service status" });
    }
  });

  // Route for seeding inventory data
  app.post("/api/seed/inventory-data", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }
      
      const { seedInventoryData } = await import("./seedInventoryData");
      const result = await seedInventoryData(tenantId);
      res.json({ 
        message: "Inventory data seeded successfully", 
        data: result 
      });
    } catch (error) {
      console.error("Error seeding inventory data:", error);
      res.status(500).json({ message: "Failed to seed inventory data" });
    }
  });

  // AI-powered mass inventory import
  app.post("/api/inventory/mass-import", isAuthenticated, async (req, res) => {
    try {
      const { text, tenantId } = req.body;
      
      if (!text || !tenantId) {
        return res.status(400).json({ message: "Text description and tenant ID are required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const aiProcessor = await import("./aiInventoryProcessor");
      const result = await aiProcessor.processInventoryWithAI(text, tenantId);
      
      res.json({
        message: "Inventory imported successfully with AI",
        imported: result.length,
        data: result
      });
    } catch (error) {
      console.error("Error processing AI inventory import:", error);
      res.status(500).json({ 
        message: "Failed to process inventory with AI",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Temporary Links API Routes
  
  // Create temporary link for QR codes
  app.post("/api/temp-links/qr/:petId", isAuthenticated, async (req, res) => {
    try {
      const { petId } = req.params;
      const userId = req.user?.claims?.sub;
      const { tenantId } = req.body;
      
      if (!userId || !tenantId) {
        return res.status(400).json({ error: "User and tenant required" });
      }

      // Verify pet exists and user has access
      const pet = await storage.getPetById(petId);
      if (!pet || pet.tenantId !== tenantId) {
        return res.status(404).json({ error: "Pet not found" });
      }

      const tempLink = await TempLinkService.createTempLink({
        type: tempLinkTypes.PET_QR,
        resourceId: petId,
        tenantId,
        createdBy: userId,
        expirationHours: 24 * 7, // 1 week
        metadata: { petName: pet.name, petSpecies: pet.species }
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const linkUrl = `${baseUrl}/temp/${tempLink.token}`;

      res.json({ 
        token: tempLink.token, 
        url: linkUrl,
        expiresAt: tempLink.expiresAt 
      });
    } catch (error) {
      console.error('Error creating pet QR link:', error);
      res.status(500).json({ error: "Failed to create temporary link" });
    }
  });

  // Create temporary link for file sharing
  app.post("/api/temp-links/file-share", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tenantId, expirationHours = 24, maxAccess = 10 } = req.body;
      
      if (!userId || !tenantId) {
        return res.status(400).json({ error: "User and tenant required" });
      }

      const tempLink = await TempLinkService.createTempLink({
        type: tempLinkTypes.FILE_SHARE,
        resourceId: `file-${Date.now()}`,
        tenantId,
        createdBy: userId,
        expirationHours,
        maxAccess,
        metadata: { purpose: 'file_sharing' }
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const linkUrl = `${baseUrl}/temp/${tempLink.token}`;

      res.json({ 
        token: tempLink.token, 
        url: linkUrl,
        expiresAt: tempLink.expiresAt,
        maxAccess 
      });
    } catch (error) {
      console.error('Error creating file share link:', error);
      res.status(500).json({ error: "Failed to create temporary link" });
    }
  });

  // Validate and access temporary link
  app.get("/api/temp-links/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await TempLinkService.validateAndAccess(token);
      
      if (!result.valid) {
        return res.status(404).json({ valid: false, error: result.error });
      }

      const link = result.link!;
      let responseData: any = { valid: true, link };

      // Add additional data based on link type
      if (link.type === tempLinkTypes.PET_QR) {
        const pet = await storage.getPetById(link.resourceId);
        if (pet) {
          const client = await storage.getClientById(pet.clientId);
          responseData.data = { pet, client };
        }
      }

      res.json(responseData);
    } catch (error) {
      console.error('Error validating temp link:', error);
      res.status(500).json({ valid: false, error: "Internal server error" });
    }
  });

  // Update temp link with file information (for uploads)
  app.post("/api/temp-links/:token/file", async (req, res) => {
    try {
      const { token } = req.params;
      const { fileUrl } = req.body;
      
      const result = await TempLinkService.validateAndAccess(token);
      if (!result.valid) {
        return res.status(404).json({ error: result.error });
      }

      // Update the link metadata with file information
      await db.update(tempLinks)
        .set({ 
          metadata: { 
            ...result.link!.metadata, 
            fileUrl,
            uploadedAt: new Date().toISOString()
          } 
        })
        .where(eq(tempLinks.token, token));

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating temp link file:', error);
      res.status(500).json({ error: "Failed to update file information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}