import type { Express, Request } from "express";
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
import { pets, companies, tempLinks, fraccionamientos } from "@shared/schema";
import { gt } from "drizzle-orm";
import { subscriptionService } from "./subscriptionService";
import express from "express";
import path from "path";
// Removed autoStatusService import - now using database functions

// Extended request type for authenticated requests
interface AuthenticatedRequest extends Request {
  user: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

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

// Middleware to check subscription validity for tenant access
const checkSubscriptionValidity = async (req: any, res: any, next: any) => {
  try {
    const tenantId = req.params.tenantId || req.body.tenantId;
    
    if (!tenantId) {
      return next(); // Skip check if no tenantId
    }

    // Get tenant and company information
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const subscription = await storage.getCompanySubscription(tenant.companyId);
    if (!subscription) {
      // No subscription found - block access except for super admins
      if (await isSystemAdmin(req)) {
        return next(); // Super admins can always access
      }
      return res.status(403).json({ 
        message: "No active subscription found", 
        subscriptionRequired: true 
      });
    }

    // Check if subscription is expired
    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    
    if (endDate < now && subscription.status !== 'trial') {
      // Subscription expired - block access except for super admins
      if (await isSystemAdmin(req)) {
        return next(); // Super admins can always access
      }
      
      // Update subscription status to cancelled (expired status not in enum)
      await storage.updateCompanySubscription(tenant.companyId, { 
        status: 'cancelled' 
      });
      
      return res.status(403).json({ 
        message: "Subscription expired", 
        expiredDate: endDate.toISOString(),
        subscriptionRequired: true 
      });
    }

    // Check VetSite limits
    const plan = await storage.getSubscriptionPlan(subscription.planId);
    if (plan) {
      const tenants = await storage.getCompanyTenants(tenant.companyId);
      if (tenants.length > plan.maxTenants) {
        if (await isSystemAdmin(req)) {
          return next(); // Super admins can always access
        }
        return res.status(403).json({ 
          message: "VetSite limit exceeded", 
          currentSites: tenants.length,
          maxAllowed: plan.maxTenants,
          upgradeRequired: true 
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking subscription validity:", error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Marketing brochure editor routes
  app.get('/marketing/brochure.html', async (req, res) => {
    try {
      const fs = await import('fs');
      const marketingPath = path.resolve(import.meta.dirname, '..', 'marketing', 'brochure.html');
      const content = await fs.promises.readFile(marketingPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } catch (error) {
      console.error('Error serving marketing brochure:', error);
      res.status(404).send('Marketing brochure not found');
    }
  });

  // Marketing brochure editor interface
  app.get('/marketing/editor', async (req, res) => {
    try {
      const fs = await import('fs');
      const editorPath = path.resolve(import.meta.dirname, '..', 'marketing', 'brochure-editor.html');
      const content = await fs.promises.readFile(editorPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } catch (error) {
      console.error('Error serving marketing editor:', error);
      res.status(404).send('Marketing editor not found');
    }
  });

  // API endpoint to save brochure content
  app.post('/api/marketing/brochure/save', async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      const fs = await import('fs');
      const marketingPath = path.resolve(import.meta.dirname, '..', 'marketing', 'brochure.html');
      await fs.promises.writeFile(marketingPath, content, 'utf-8');
      
      res.json({ success: true, message: 'Brochure saved successfully' });
    } catch (error) {
      console.error('Error saving marketing brochure:', error);
      res.status(500).json({ message: 'Failed to save brochure' });
    }
  });

  // API endpoint to get editable content
  app.get('/api/marketing/brochure/content', async (req: any, res) => {
    try {
      const fs = await import('fs');
      const marketingPath = path.resolve(import.meta.dirname, '..', 'marketing', 'brochure.html');
      const content = await fs.promises.readFile(marketingPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      console.error('Error reading marketing brochure:', error);
      res.status(500).json({ message: 'Failed to read brochure' });
    }
  });

  // Clear auth cache endpoint for clean logout
  app.post('/api/auth/clear-cache', (req: any, res) => {
    // This endpoint helps clear server-side session data if needed
    res.json({ success: true, message: 'Cache cleared' });
  });

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

  app.get('/api/appointments/:tenantId', isAuthenticated, checkSubscriptionValidity, async (req: any, res) => {
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
        storage.getPetsByTenant(tenantId),
        storage.getClients(tenantId),
        storage.getStaff(tenantId),
        storage.getRooms(tenantId)
      ]);

      // Create lookup maps for efficient filtering
      const appointmentClientIds = new Set(medicalAppointments.map(apt => apt.clientId));
      const appointmentPetIds = new Set(medicalAppointments.map(apt => apt.petId));
      const appointmentVetIds = new Set(medicalAppointments.map(apt => apt.veterinarianId));
      const appointmentRoomIds = new Set(medicalAppointments.map(apt => apt.roomId).filter(Boolean));

      // Debug logging to see what IDs we're looking for
      console.log(`Medical appointments debug - Found ${medicalAppointments.length} appointments, ${pets.length} total pets`);
      if (medicalAppointments.length > 0) {
        console.log('Sample appointment petIds:', Array.from(appointmentPetIds).slice(0, 3));
      }
      if (pets.length > 0) {
        console.log('Sample pet IDs:', pets.slice(0, 3).map(p => p.id));
      }
      
      // Only include relevant data
      const relevantClients = clients.filter(client => appointmentClientIds.has(client.id));
      const relevantPets = pets.filter(pet => appointmentPetIds.has(pet.id));
      const relevantVets = veterinarians.filter(vet => appointmentVetIds.has(vet.id));
      const relevantRooms = rooms.filter(room => appointmentRoomIds.has(room.id));
      
      console.log(`Filtered results: ${relevantPets.length} pets, ${relevantClients.length} clients`);
      
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
          specialization: vet.specialization
        })),
        rooms: relevantRooms.map(room => ({
          id: room.id,
          name: room.name,
          type: room.type
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

  // Super Admin Routes - Webhook Monitoring (Global System Administration)
  app.get('/api/superadmin/webhook-stats', isSuperAdmin, async (req: any, res) => {
    try {
      // SuperAdmin gets system-wide webhook statistics
      const stats = await webhookMonitor.getWebhookStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching webhook stats:", error);
      res.status(500).json({ message: "Failed to fetch webhook statistics" });
    }
  });

  app.get('/api/superadmin/webhook-errors', isSuperAdmin, async (req: any, res) => {
    try {
      // SuperAdmin gets all webhook errors across ALL tenants, with optional filtering
      const { tenantId, limit } = req.query;
      const logs = await storage.getWebhookErrorLogs(tenantId || undefined, parseInt(limit) || 100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook errors:", error);
      res.status(500).json({ message: "Failed to fetch webhook errors" });
    }
  });

  app.post('/api/superadmin/webhook-retry/:logId', isSuperAdmin, async (req: any, res) => {
    try {
      const { logId } = req.params;
      
      // SuperAdmin can resolve webhook errors for any tenant
      await storage.updateWebhookErrorStatus(logId, 'resolved', new Date());
      
      res.json({ message: "Webhook error marked as resolved" });
    } catch (error) {
      console.error("Error resolving webhook error:", error);
      res.status(500).json({ message: "Failed to resolve webhook error" });
    }
  });

  app.get('/api/superadmin/webhook-monitoring', isSuperAdmin, async (req: any, res) => {
    try {
      // SuperAdmin gets ALL webhook monitoring records across the entire system
      const { tenantId } = req.query;
      
      const { db } = await import('./db');
      const { webhookMonitoring } = await import('@shared/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      // If tenantId is provided, filter by tenant; otherwise return ALL monitoring data
      const monitoring = await db.select().from(webhookMonitoring)
        .where(tenantId ? eq(webhookMonitoring.tenantId, tenantId as string) : undefined)
        .orderBy(sql`${webhookMonitoring.updatedAt} DESC`);
      
      res.json(monitoring);
    } catch (error) {
      console.error("Error fetching webhook monitoring:", error);
      res.status(500).json({ message: "Failed to fetch webhook monitoring data" });
    }
  });

  app.put('/api/superadmin/webhook-monitoring/:tenantId/:webhookType', isSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId, webhookType } = req.params;
      const { isAutoRetryEnabled, retryIntervalMinutes, maxRetryIntervalMinutes } = req.body;
      
      // SuperAdmin can update webhook monitoring for any tenant
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
        completedAppointments: routePoints,
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

  // Get all inventory items for a tenant (for cashier product search)
  app.get('/api/inventory/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      if (typeof storage.getInventoryItems === 'function') {
        const inventoryItems = await storage.getInventoryItems(tenantId);
        res.json(inventoryItems.filter(item => item.isActive));
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.json([]);
    }
  });

  // Inventory API for retrieving vehicles
  app.get('/api/inventory/:tenantId/:category', isAuthenticated, async (req, res) => {
    try {
      const { tenantId, category } = req.params;
      // Check if storage has getInventoryItems method
      if (typeof storage.getInventoryItems === 'function') {
        const inventoryItems = await storage.getInventoryItems(tenantId);
        const filteredItems = inventoryItems.filter(item => 
          item.category === category && item.isActive
        );
        res.json(filteredItems);
      } else {
        // Return empty array if inventory system not implemented yet
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching inventory by category:", error);
      res.json([]); // Return empty array on error to prevent UI breaking
    }
  });

  // Sales/Cashier API endpoints
  app.get('/api/sales/:tenantId', checkSubscriptionValidity, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const salesData = await storage.getSales(tenantId);
      
      // Fetch sale items for each sale
      const salesWithItems = await Promise.all(
        salesData.map(async (sale) => {
          const items = await storage.getSaleItems(sale.id);
          return { ...sale, items };
        })
      );
      
      res.json(salesWithItems);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/sales', async (req, res) => {
    try {
      const saleData = req.body;
      const newSale = await storage.createSale(saleData);
      res.json(newSale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  app.patch('/api/sales/:saleId/items/:itemId/deliver', async (req, res) => {
    try {
      const { saleId, itemId } = req.params;
      const { deliveredAt } = req.body;
      
      const updatedItem = await storage.updateSaleItem(itemId, {
        delivered: true,
        deliveredAt: new Date(deliveredAt)
      });
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error marking item as delivered:", error);
      res.status(500).json({ message: "Failed to mark item as delivered" });
    }
  });

  app.patch('/api/sales/:saleId/complete-delivery', async (req, res) => {
    try {
      const { saleId } = req.params;
      const { deliveredAt, notes } = req.body;
      
      // Update all items as delivered
      const items = await storage.getSaleItems(saleId);
      await Promise.all(
        items.map(item => 
          storage.updateSaleItem(item.id, {
            delivered: true,
            deliveredAt: new Date(deliveredAt)
          })
        )
      );
      
      // Update sale status
      const updatedSale = await storage.updateSale(saleId, {
        deliveryStatus: 'delivered',
        deliveredAt: new Date(deliveredAt),
        notes
      });
      
      res.json(updatedSale);
    } catch (error) {
      console.error("Error completing delivery:", error);
      res.status(500).json({ message: "Failed to complete delivery" });
    }
  });

  app.post('/api/sales/:saleId/add-item', async (req, res) => {
    try {
      const { saleId } = req.params;
      const itemData = {
        ...req.body,
        saleId
      };
      
      const newItem = await storage.createSaleItem(itemData);
      
      // Update sale total amount
      const sale = await storage.getSale(saleId);
      const allItems = await storage.getSaleItems(saleId);
      const newTotal = allItems.reduce((sum, item) => sum + parseFloat(item.total.toString()), 0);
      
      await storage.updateSale(saleId, {
        totalAmount: newTotal.toString()
      });
      
      res.json(newItem);
    } catch (error) {
      console.error("Error adding item to sale:", error);
      res.status(500).json({ message: "Failed to add item to sale" });
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

  // Delivery configuration endpoints
  app.get("/api/admin/delivery-config/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.getDeliveryConfig(tenantId);
      res.json(config);
    } catch (error) {
      console.error("Error fetching delivery config:", error);
      res.status(500).json({ error: "Failed to fetch delivery configuration" });
    }
  });

  app.post("/api/admin/delivery-config", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, ...configData } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      const config = await storage.updateDeliveryConfig(tenantId, configData);
      res.json(config);
    } catch (error) {
      console.error("Error updating delivery config:", error);
      res.status(500).json({ error: "Failed to update delivery configuration" });
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
        autoScheduleDelivery: false,
        groomingFollowUpDays: 30,
        groomingFollowUpVariance: 7,
        enableGroomingFollowUp: true,
        clinicalInterventionPricing: 'operation_plus_items',
        enableItemizedCharges: true,
        allowCashierAddItems: true
      });
    } catch (error) {
      console.error("Error fetching billing config:", error);
      res.status(500).json({ message: "Failed to fetch billing configuration" });
    }
  });

  app.put('/api/company-billing-config/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const configData = req.body;
      
      // Validate clinical intervention pricing value
      if (configData.clinicalInterventionPricing && 
          !['operation_plus_items', 'flat_price'].includes(configData.clinicalInterventionPricing)) {
        return res.status(400).json({ 
          message: "Invalid clinical intervention pricing model" 
        });
      }
      
      const config = await storage.upsertCompanyBillingConfig({
        companyId,
        ...configData
      });
      res.json(config);
    } catch (error) {
      console.error("Error updating billing config:", error);
      res.status(500).json({ message: "Failed to update billing configuration" });
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

  // Create grooming appointments for today
  app.post("/api/seed-grooming-today/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { days = 1 } = req.body;
      
      // Import and run the seeding function
      const { seedGroomingAppointmentsToday } = await import('./seedGroomingToday');
      await seedGroomingAppointmentsToday(tenantId, days);
      
      res.json({ 
        success: true, 
        message: `Successfully created grooming appointments for ${days} day(s)`,
        tenantId,
        days
      });
    } catch (error) {
      console.error("Error seeding grooming appointments:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create grooming appointments",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Demo data seeding endpoint
  app.post("/api/seed-demo-data", isAuthenticated, async (req, res) => {
    try {
      // Check if user has system admin access
      const hasSystemAccess = await isSystemAdmin(req);
      if (!hasSystemAccess) {
        return res.status(403).json({ message: "System admin access required" });
      }

      const { days = 45 } = req.body;
      
      // Import and run the demo data seeding function
      const { runDemoDataSeeder } = await import('./seedDemoData');
      const result = await runDemoDataSeeder(days);
      
      res.json(result);
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to seed demo data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // SuperAdmin Dashboard Statistics API
  app.get("/api/superadmin/dashboard-stats", isAuthenticated, async (req, res) => {
    try {
      // Check if user has system admin access
      const hasSystemAccess = await isSystemAdmin(req);
      if (!hasSystemAccess) {
        return res.status(403).json({ message: "System admin access required" });
      }

      // Execute the data cube function to get all dashboard statistics
      const result = await db.execute(sql`SELECT get_superadmin_dashboard_cube() as dashboard_data`);
      const dashboardData = result.rows[0] as any;
      
      res.json(dashboardData?.dashboard_data || {});
    } catch (error) {
      console.error("Error fetching SuperAdmin dashboard stats:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced VRP Route Optimization with Completed Mascots API
  app.post("/api/delivery-routes/optimize/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { date, vanCapacity = 'medium' } = req.body;
      
      // Get completed appointments with pet and client data
      const appointments = await storage.getAppointmentsByDate(tenantId, date);
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      
      // Enhance with pet and client data
      const appointmentsWithData = await Promise.all(
        completedAppointments.map(async (apt) => {
          const client = await storage.getClientById(apt.clientId);
          const pet = await storage.getPetById(apt.petId);
          return { ...apt, client, pet };
        })
      );
      
      // Get fraccionamiento weights
      const fraccionamientos = await storage.getFraccionamientos();
      const fraccionamientoWeights = fraccionamientos.reduce((acc, frac) => {
        acc[frac.name] = frac.weight || 5.0;
        return acc;
      }, {} as Record<string, number>);
      
      // Default clinic location (you may want to get this from tenant settings)
      const clinicLocation: [number, number] = [24.8066, -107.3938]; // Culiacán
      
      // Import and use the VRP optimizer
      const { optimizeDeliveryRouteWithCompletedMascots } = await import('./routeOptimizer');
      
      const optimizedRoute = optimizeDeliveryRouteWithCompletedMascots(
        clinicLocation,
        appointmentsWithData,
        fraccionamientoWeights,
        vanCapacity
      );
      
      res.json({
        success: true,
        route: optimizedRoute,
        summary: {
          totalStops: optimizedRoute.points.length,
          totalDistance: optimizedRoute.totalDistance,
          estimatedTime: optimizedRoute.estimatedTime,
          efficiency: optimizedRoute.efficiency,
          fraccionamientoOrder: optimizedRoute.fraccionamientoOrder
        }
      });
      
    } catch (error) {
      console.error("Error optimizing delivery route:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to optimize delivery route",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Subscription and Payment API Endpoints
  
  // Get available subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await subscriptionService.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Process company onboarding
  app.post('/api/company-onboarding', async (req, res) => {
    try {
      const onboardingData = req.body;
      
      // Validate required fields
      if (!onboardingData.legalName || !onboardingData.contactPersonEmail) {
        return res.status(400).json({ message: "Missing required company information" });
      }

      // For demo purposes, create a transaction record
      const mockTransactionId = `tx_${Date.now()}`;
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

      const transactionData = {
        id: mockTransactionId,
        amount: onboardingData.sitesRequested <= 3 ? 2999 : 4999,
        currency: "MXN",
        status: "completed",
        paymentProvider: "demo",
        externalTransactionId: `demo_${Date.now()}`,
        subscriptionPlan: onboardingData.sitesRequested <= 3 ? "medium" : "large",
        subscriptionEndDate,
        paymentDate: new Date(),
      };

      const transaction = await subscriptionService.createSubscriptionTransaction({
        ...transactionData,
        companyId: "temp",
        subscriptionPlanId: transactionData.subscriptionPlan,
        billingCycle: "monthly",
        subscriptionStartDate: new Date(),
        amount: transactionData.amount.toString()
      });
      
      // Process onboarding
      const { company, onboarding } = await subscriptionService.processCompanyOnboarding(
        transaction.id, 
        onboardingData
      );

      // Auto-activate for demo
      await subscriptionService.activateCompanyAccount(onboarding.id);

      res.json({ 
        success: true, 
        company, 
        onboarding, 
        transaction 
      });
    } catch (error) {
      console.error("Error processing company onboarding:", error);
      res.status(500).json({ message: "Failed to process onboarding" });
    }
  });

  // Get onboarding status
  app.get('/api/onboarding-status/:onboardingId', async (req, res) => {
    try {
      const { onboardingId } = req.params;
      const status = await subscriptionService.getOnboardingStatus(onboardingId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  // Stripe payment processing
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const { amount, planId, billingCycle } = req.body;
      
      // Here you would integrate with Stripe
      // For now, return a mock response
      res.json({ 
        clientSecret: `pi_mock_${Date.now()}_secret_mock`,
        paymentIntentId: `pi_mock_${Date.now()}`
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // PayPal setup endpoint
  app.get("/api/paypal/setup", async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID) {
        return res.status(500).json({ message: "PayPal not configured" });
      }

      // Here you would get PayPal client token
      res.json({
        clientToken: `mock_paypal_token_${Date.now()}`
      });
    } catch (error) {
      console.error("Error setting up PayPal:", error);
      res.status(500).json({ message: "Failed to setup PayPal" });
    }
  });

  // PayPal order creation
  app.post("/api/paypal/order", async (req, res) => {
    try {
      const { amount, currency, intent } = req.body;
      
      // Here you would create PayPal order
      res.json({
        id: `ORDER_${Date.now()}`,
        status: "CREATED"
      });
    } catch (error) {
      console.error("Error creating PayPal order:", error);
      res.status(500).json({ message: "Failed to create PayPal order" });
    }
  });

  // PayPal order capture
  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    try {
      const { orderID } = req.params;
      
      // Here you would capture PayPal order
      res.json({
        id: orderID,
        status: "COMPLETED",
        purchase_units: []
      });
    } catch (error) {
      console.error("Error capturing PayPal order:", error);
      res.status(500).json({ message: "Failed to capture PayPal order" });
    }
  });

  // Webhook endpoint for payment providers
  app.post("/api/webhooks/payment", async (req, res) => {
    try {
      const { provider, transactionId, status, webhookData } = req.body;
      
      // Update transaction status
      const transaction = await subscriptionService.updateTransactionStatus(
        transactionId,
        status,
        webhookData
      );

      res.json({ success: true, transaction });
    } catch (error) {
      console.error("Error processing payment webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
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

  // Calendar Configuration Routes (SuperAdmin)
  app.get('/api/superadmin/calendar-config', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      // Get all companies with calendar settings
      const companiesList = await db.select({
        id: companies.id,
        name: companies.name,
        calendarAutoReturnEnabled: companies.calendarAutoReturnEnabled,
        calendarAutoReturnTimeout: companies.calendarAutoReturnTimeout
      }).from(companies);
      
      res.json(companiesList);
    } catch (error) {
      console.error("Error fetching calendar config:", error);
      res.status(500).json({ message: "Failed to fetch calendar configuration" });
    }
  });

  app.put('/api/superadmin/calendar-config/:companyId', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { calendarAutoReturnEnabled, calendarAutoReturnTimeout } = req.body;
      
      const updatedCompany = await db.update(companies)
        .set({
          calendarAutoReturnEnabled,
          calendarAutoReturnTimeout,
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      if (updatedCompany.length === 0) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(updatedCompany[0]);
    } catch (error) {
      console.error("Error updating calendar config:", error);
      res.status(500).json({ message: "Failed to update calendar configuration" });
    }
  });

  // Get calendar settings for a specific company (used by clients)
  app.get('/api/company/:companyId/calendar-config', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const [company] = await db.select({
        calendarAutoReturnEnabled: companies.calendarAutoReturnEnabled,
        calendarAutoReturnTimeout: companies.calendarAutoReturnTimeout
      }).from(companies)
        .where(eq(companies.id, companyId));
        
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company calendar config:", error);
      res.status(500).json({ message: "Failed to fetch calendar configuration" });
    }
  });

  // Fraccionamientos Management Routes (Admin)
  app.get('/api/admin/fraccionamientos/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const fraccionamientosList = await db.select()
        .from(fraccionamientos)
        .where(eq(fraccionamientos.tenantId, tenantId))
        .orderBy(fraccionamientos.displayName);
      
      res.json(fraccionamientosList);
    } catch (error) {
      console.error("Error fetching fraccionamientos:", error);
      res.status(500).json({ message: "Failed to fetch fraccionamientos" });
    }
  });

  app.post('/api/admin/fraccionamientos/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const fraccionamientoData = { ...req.body, tenantId };
      
      const newFraccionamiento = await db.insert(fraccionamientos)
        .values(fraccionamientoData)
        .returning();
      
      res.json(newFraccionamiento[0]);
    } catch (error) {
      console.error("Error creating fraccionamiento:", error);
      res.status(500).json({ message: "Failed to create fraccionamiento" });
    }
  });

  app.put('/api/admin/fraccionamientos/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updatedFraccionamiento = await db.update(fraccionamientos)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(fraccionamientos.id, id))
        .returning();
        
      if (updatedFraccionamiento.length === 0) {
        return res.status(404).json({ message: "Fraccionamiento not found" });
      }
      
      res.json(updatedFraccionamiento[0]);
    } catch (error) {
      console.error("Error updating fraccionamiento:", error);
      res.status(500).json({ message: "Failed to update fraccionamiento" });
    }
  });

  app.delete('/api/admin/fraccionamientos/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(fraccionamientos)
        .where(eq(fraccionamientos.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting fraccionamiento:", error);
      res.status(500).json({ message: "Failed to delete fraccionamiento" });
    }
  });

  // Object Storage Routes - simplified for logo uploads
  app.post('/api/objects/upload', isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { fileName, companyId, tenantId, templateType = 'receipt' } = req.body;
      const userId = (req as AuthenticatedRequest).user.claims.sub;
      
      console.log('Upload request received:', { fileName, companyId, tenantId, templateType, userId });
      
      // Validate that user has access to this company/tenant (only if provided)
      if (tenantId) {
        const userTenants = await storage.getUserTenants(userId);
        const hasAccess = userTenants.some(ut => ut.tenantId === tenantId);
        if (!hasAccess && !(await isSystemAdmin(req))) {
          return res.status(403).json({ 
            error: "Access denied to this tenant",
            success: false
          });
        }
      }
      
      // Generate upload path - use fallback method for simpler uploads
      const secureFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'upload';
      
      // Use the simple receipt template upload method
      const uploadURL = await objectStorageService.getReceiptTemplateUploadURL(secureFileName);
      
      // Log the upload request for security audit
      console.log(`Upload requested by user ${userId} for file: ${fileName}`);
      console.log('Generated upload URL:', uploadURL);
      
      const response = { 
        uploadURL,
        success: true,
        fileName: secureFileName
      };
      
      console.log('Sending response:', response);
      res.json(response);
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      const errorResponse = { 
        error: "Failed to get upload URL", 
        details: error?.message || "Unknown error",
        success: false
      };
      console.log('Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
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
      const userId = (req.user as any)?.claims?.sub;
      const { tenantId } = req.body;
      
      if (!userId || !tenantId) {
        return res.status(400).json({ error: "User and tenant required" });
      }

      // Verify pet exists and user has access
      const pet = await storage.getPetById(petId);
      if (!pet || (pet as any).tenantId !== tenantId) {
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
      const userId = (req.user as any)?.claims?.sub;
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
            ...(result.link?.metadata || {}), 
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

  // Mobile SuperAdmin Subscription Management Endpoints
  
  // Get all subscription plans with limits for mobile dashboard
  app.get("/api/mobile/subscription-plans", isSuperAdmin, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      const plansWithLimits = plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        maxTenants: plan.maxTenants,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: plan.features,
        isActive: plan.isActive
      }));
      res.json(plansWithLimits);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Create new company subscription with trial setup (mobile onboarding)
  app.post("/api/mobile/onboard-client", isSuperAdmin, async (req, res) => {
    try {
      const {
        companyName,
        adminEmail,
        adminFirstName,
        adminLastName,
        planId,
        trialDays = 14,
        maxTenants = 1,
        maxStaff = 5,
        customLimits = {}
      } = req.body;

      // Validate required fields
      if (!companyName || !adminEmail || !planId) {
        return res.status(400).json({
          message: "Company name, admin email, and plan ID are required"
        });
      }

      // Get the subscription plan
      const plans = await storage.getSubscriptionPlans();
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Create company
      const company = await storage.createCompany({
        name: companyName,
        subscriptionStatus: "trial",
        subscriptionPlan: selectedPlan.name,
        subscriptionEndDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      });

      // Create admin user
      const adminUser = await storage.createUser({
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName
      });

      // Link user to company
      await storage.createUserCompany(adminUser.id, company.id);

      // Create company subscription
      const subscription = await storage.createCompanySubscription({
        companyId: company.id,
        planId: selectedPlan.id,
        status: "trial",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      });

      // Generate initial credentials
      const tempPassword = Math.random().toString(36).slice(-8);
      const loginUrl = `${req.protocol}://${req.get('host')}/api/login`;
      
      res.json({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          subscriptionStatus: "trial",
          trialEndDate: subscription.trialEndsAt
        },
        admin: {
          id: adminUser.id,
          email: adminEmail,
          tempPassword: tempPassword,
          loginUrl: loginUrl
        },
        subscription: {
          plan: selectedPlan.displayName,
          status: "trial",
          maxTenants: null,
          maxStaff: null,
          trialDaysRemaining: trialDays
        },
        credentials: {
          companyId: company.id,
          adminEmail: adminEmail,
          tempPassword: tempPassword,
          loginUrl: loginUrl,
          setupInstructions: "Login with provided credentials to complete setup"
        }
      });

    } catch (error) {
      console.error("Error onboarding client:", error);
      res.status(500).json({ 
        message: "Failed to onboard client",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update company subscription limits (mobile management)
  app.patch("/api/mobile/company-subscription/:companyId", isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { 
        planId, 
        status, 
        maxTenants, 
        maxStaff, 
        extendTrialDays,
        customLimits 
      } = req.body;

      const updates: any = {};
      
      if (planId) {
        const plans = await storage.getSubscriptionPlans();
        const newPlan = plans.find(p => p.id === planId);
        if (!newPlan) {
          return res.status(404).json({ message: "Plan not found" });
        }
        updates.planId = planId;
      }
      
      if (status) updates.status = status;
      if (maxTenants !== undefined) updates.maxTenants = maxTenants;
      if (maxStaff !== undefined) updates.maxStaff = maxStaff;
      if (customLimits) updates.customLimits = customLimits;
      
      if (extendTrialDays) {
        const currentSub = await storage.getCompanySubscription(companyId);
        if (currentSub?.trialEndsAt) {
          updates.trialEndsAt = new Date(currentSub.trialEndsAt.getTime() + extendTrialDays * 24 * 60 * 60 * 1000);
        }
      }

      const updatedSubscription = await storage.updateCompanySubscription(companyId, updates);
      
      res.json({
        success: true,
        subscription: updatedSubscription,
        message: "Subscription updated successfully"
      });

    } catch (error) {
      console.error("Error updating company subscription:", error);
      res.status(500).json({ 
        message: "Failed to update subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get company subscription details with usage stats (mobile view)
  app.get("/api/mobile/company-subscription/:companyId", isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const [subscription, company, tenants, staff] = await Promise.all([
        storage.getCompanySubscription(companyId),
        storage.getCompany(companyId),
        storage.getTenantsByCompany(companyId),
        storage.getStaffByCompany(companyId)
      ]);

      if (!subscription || !company) {
        return res.status(404).json({ message: "Company or subscription not found" });
      }

      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.id === subscription.planId);

      const currentUsage = {
        tenants: tenants.length,
        staff: staff.length,
        maxTenants: plan?.maxTenants || 1,
        maxStaff: 50
      };

      const trialInfo = subscription.status === 'trial' ? {
        isOnTrial: true,
        trialStartDate: subscription.currentPeriodStart,
        trialEndDate: subscription.trialEndsAt,
        daysRemaining: subscription.trialEndsAt ? 
          Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0
      } : { isOnTrial: false };

      res.json({
        company: {
          id: company.id,
          name: company.name,
          subscriptionStatus: company.subscriptionStatus
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: plan ? {
            id: plan.id,
            name: plan.name,
            displayName: plan.displayName,
            monthlyPrice: plan.monthlyPrice
          } : null,
          limits: {
            maxTenants: plan?.maxTenants || 1,
            maxStaff: 50
          },
          usage: currentUsage,
          trial: trialInfo
        }
      });

    } catch (error) {
      console.error("Error fetching company subscription details:", error);
      res.status(500).json({ 
        message: "Failed to fetch subscription details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get billing usage and expenses for current month
  app.get("/api/superadmin/billing-usage", isSuperAdmin, async (req, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      // Simulate billing data - in production, integrate with Replit's billing API
      const mockBillingData = {
        currentMonth: currentMonth,
        monthlyBudget: 100.00, // User's set budget
        coreCredits: 25.00, // Monthly Core plan credits
        usedCredits: 23.50, // Credits consumed this month
        additionalCharges: 12.30, // Usage beyond credits
        totalSpent: 35.80, // Total spent this month
        remainingCredits: 1.50, // Credits left
        remainingBudget: 64.20, // Budget remaining
        usagePercentage: 35.8, // Percentage of budget used
        services: {
          deployments: 18.20,
          database: 4.10,
          storage: 2.50,
          ai: 1.60,
          other: 9.40
        },
        alerts: {
          threshold75Percent: 75.00,
          threshold90Percent: 90.00,
          isNear75: false,
          isNear90: false
        },
        projectedMonthEnd: 67.50 // Projected total for month
      };

      // Check alert thresholds
      mockBillingData.alerts.isNear75 = mockBillingData.usagePercentage >= 75;
      mockBillingData.alerts.isNear90 = mockBillingData.usagePercentage >= 90;

      res.json({
        success: true,
        billing: mockBillingData,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error fetching billing usage:", error);
      res.status(500).json({ 
        message: "Failed to fetch billing usage",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update billing budget and alert settings
  app.patch("/api/superadmin/billing-settings", isSuperAdmin, async (req, res) => {
    try {
      const { 
        monthlyBudget, 
        alertThreshold75, 
        alertThreshold90, 
        enableAlerts 
      } = req.body;

      // In production, store these settings in database
      const updatedSettings = {
        monthlyBudget: monthlyBudget || 100.00,
        alertThreshold75: alertThreshold75 || 75,
        alertThreshold90: alertThreshold90 || 90,
        enableAlerts: enableAlerts !== undefined ? enableAlerts : true,
        updatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        settings: updatedSettings,
        message: "Billing settings updated successfully"
      });

    } catch (error) {
      console.error("Error updating billing settings:", error);
      res.status(500).json({ 
        message: "Failed to update billing settings",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add credits to account (simulate credit purchase)
  app.post("/api/superadmin/add-credits", isSuperAdmin, async (req, res) => {
    try {
      const { amount, description = "Manual credit addition" } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          message: "Valid credit amount is required"
        });
      }

      // In production, integrate with Replit's billing system
      const creditTransaction = {
        id: `credit_${Date.now()}`,
        amount: parseFloat(amount),
        description: description,
        type: "credit_addition",
        timestamp: new Date().toISOString(),
        status: "completed"
      };

      res.json({
        success: true,
        transaction: creditTransaction,
        message: `Successfully added $${amount} in credits to your account`
      });

    } catch (error) {
      console.error("Error adding credits:", error);
      res.status(500).json({ 
        message: "Failed to add credits",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get billing history and transactions
  app.get("/api/superadmin/billing-history", isSuperAdmin, async (req, res) => {
    try {
      const { months = 3 } = req.query;
      
      // Mock billing history - in production, fetch from billing system
      const mockHistory = {
        transactions: [
          {
            id: "tx_001",
            date: "2025-08-01",
            type: "deployment",
            amount: -15.20,
            description: "Autoscale Deployment - Veterinary App",
            service: "deployment"
          },
          {
            id: "tx_002", 
            date: "2025-08-03",
            type: "database",
            amount: -2.50,
            description: "PostgreSQL Database Usage",
            service: "database"
          },
          {
            id: "tx_003",
            date: "2025-08-05",
            type: "credit",
            amount: 25.00,
            description: "Monthly Core Plan Credits",
            service: "credits"
          }
        ],
        monthlyTotals: [
          { month: "2025-08", spent: 35.80, budget: 100.00 },
          { month: "2025-07", spent: 67.20, budget: 100.00 },
          { month: "2025-06", spent: 89.10, budget: 100.00 }
        ]
      };

      res.json({
        success: true,
        history: mockHistory,
        period: `Last ${months} months`
      });

    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ 
        message: "Failed to fetch billing history",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Share initial credentials for mobile onboarding
  app.post("/api/mobile/share-credentials", isSuperAdmin, async (req, res) => {
    try {
      const { companyId, adminEmail, method = 'email' } = req.body;

      if (!companyId || !adminEmail) {
        return res.status(400).json({
          message: "Company ID and admin email are required"
        });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const loginUrl = `${req.protocol}://${req.get('host')}/api/login`;
      
      // In a real implementation, you would:
      // 1. Send email with credentials
      // 2. Send SMS if method is 'sms'
      // 3. Generate QR code with credentials
      
      const credentials = {
        companyName: company.name,
        adminEmail: adminEmail,
        tempPassword: tempPassword,
        loginUrl: loginUrl,
        setupSteps: [
          "1. Visit the login URL",
          "2. Enter your email and temporary password",
          "3. You'll be prompted to change your password",
          "4. Complete your company profile setup"
        ]
      };

      // For mobile display and sharing
      const shareableText = `
Welcome to VetGroom! 🐾

Company: ${company.name}
Email: ${adminEmail}
Temporary Password: ${tempPassword}
Login: ${loginUrl}

Setup Instructions:
${credentials.setupSteps.join('\n')}

This password expires in 24 hours.
      `.trim();

      res.json({
        success: true,
        method: method,
        credentials: credentials,
        shareableText: shareableText,
        qrData: JSON.stringify({
          company: company.name,
          email: adminEmail,
          password: tempPassword,
          url: loginUrl
        }),
        message: `Credentials prepared for ${method} sharing`
      });

    } catch (error) {
      console.error("Error sharing credentials:", error);
      res.status(500).json({ 
        message: "Failed to prepare credentials",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Deployment Configuration Management API Endpoints
  app.get("/api/superadmin/deployment-config", isSuperAdmin, async (req, res) => {
    try {
      // For now, return development tier configuration
      // In production, this would read from environment variables or database
      const deploymentTier = process.env.DEPLOYMENT_TIER || 'development';
      const { FeatureManager, DEPLOYMENT_CONFIGS } = await import('../shared/deploymentFeatures');
      
      const featureManager = new FeatureManager(deploymentTier as any);
      const config = featureManager.getCurrentTierInfo();
      
      res.json({
        success: true,
        config,
        availableFeatures: featureManager.getAvailableFeatures(),
        betaFeatures: featureManager.getBetaFeatures(),
        featuresRequiringConfig: featureManager.getFeaturesRequiringConfiguration()
      });
    } catch (error) {
      console.error("Error fetching deployment config:", error);
      res.status(500).json({ error: "Failed to fetch deployment configuration" });
    }
  });

  app.patch("/api/superadmin/deployment-tier", isSuperAdmin, async (req, res) => {
    try {
      const { tier } = req.body;
      
      if (!['basic', 'professional', 'enterprise', 'development'].includes(tier)) {
        return res.status(400).json({ error: "Invalid deployment tier" });
      }

      // In a real implementation, this would update environment variables
      // or a configuration database. For now, we'll simulate the change
      const { FeatureManager } = await import('../shared/deploymentFeatures');
      const featureManager = new FeatureManager(tier);
      const config = featureManager.getCurrentTierInfo();
      
      res.json({
        success: true,
        message: `Deployment tier updated to ${tier}`,
        config,
        availableFeatures: featureManager.getAvailableFeatures()
      });
    } catch (error) {
      console.error("Error updating deployment tier:", error);
      res.status(500).json({ error: "Failed to update deployment tier" });
    }
  });

  app.get("/api/superadmin/feature-availability/:featureId", isSuperAdmin, async (req, res) => {
    try {
      const { featureId } = req.params;
      const deploymentTier = process.env.DEPLOYMENT_TIER || 'development';
      
      const { FeatureManager } = await import('../shared/deploymentFeatures');
      const featureManager = new FeatureManager(deploymentTier as any);
      
      const isEnabled = featureManager.isFeatureEnabled(featureId);
      const features = featureManager.getAvailableFeatures();
      const feature = features.find(f => f.id === featureId);
      
      res.json({
        success: true,
        featureId,
        enabled: isEnabled,
        feature: feature || null,
        currentTier: deploymentTier
      });
    } catch (error) {
      console.error("Error checking feature availability:", error);
      res.status(500).json({ error: "Failed to check feature availability" });
    }
  });

  app.get("/api/superadmin/deployment-insights", isSuperAdmin, async (req, res) => {
    try {
      const deploymentTier = process.env.DEPLOYMENT_TIER || 'development';
      const { FeatureManager } = await import('../shared/deploymentFeatures');
      const featureManager = new FeatureManager(deploymentTier as any);
      
      const config = featureManager.getCurrentTierInfo();
      const recommendations = featureManager.getUpgradeRecommendations();
      
      // Get deployment statistics - simplified stats for now
      const stats = {
        totalTenants: 5,
        totalCompanies: 3,
        totalUsers: 15
      };
      
      const insights = {
        currentTier: deploymentTier,
        version: config.version,
        totalFeatures: config.features.length,
        enabledFeatures: config.features.filter(f => f.enabled).length,
        betaFeatures: config.features.filter(f => f.betaFeature).length,
        resourceUsage: {
          tenants: stats.totalCompanies,
          maxTenants: (config.maxTenants === -1 || !config.maxTenants) ? 'Unlimited' : config.maxTenants,
          utilizationPercentage: (config.maxTenants === -1 || !config.maxTenants) ? 0 : 
            Math.round((stats.totalCompanies / (config.maxTenants || 1)) * 100)
        },
        recommendations,
        featuresByCategory: {}
      };

      // Group features by category
      config.features.forEach((feature: any) => {
        if (!(insights.featuresByCategory as any)[feature.category]) {
          (insights.featuresByCategory as any)[feature.category] = [];
        }
        (insights.featuresByCategory as any)[feature.category].push(feature);
      });
      
      res.json({
        success: true,
        insights
      });
    } catch (error) {
      console.error("Error fetching deployment insights:", error);
      res.status(500).json({ error: "Failed to fetch deployment insights" });
    }
  });

  // ====================
  // DRIVER MOBILE ENDPOINTS
  // ====================

  // Driver mobile dashboard endpoint - mobile optimized
  app.get('/api/driver/dashboard/:driverId', async (req: any, res) => {
    try {
      const { driverId } = req.params;
      
      // Get driver info (assuming driver is a staff member)
      // Since we need to find the driver across all tenants, we'll implement a proper lookup
      let driver: any = null;
      
      // Get all tenants and search for the driver across them
      const allTenants = await storage.getAllTenants();
      for (const tenant of allTenants) {
        const staffMembers = await storage.getStaff(tenant.id);
        const foundDriver = staffMembers.find((s: any) => s.id === driverId);
        if (foundDriver) {
          driver = foundDriver;
          break;
        }
      }
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      // Get today's routes for the driver's tenant
      const today = new Date().toISOString().split('T')[0];
      const routes = await storage.getDeliveryRoutes(driver.tenantId);
      const activeRoutes = routes.filter((route: any) => route.driverId === driverId);
      
      // Get today's appointments for delivery/pickup
      const appointments = await storage.getAppointments(driver.tenantId, today);
      const driverAppointments = appointments.filter((apt: any) => 
        apt.logistics && (apt.logistics === 'pickup' || apt.logistics === 'delivery')
      );

      res.json({
        driver: {
          id: driver.id,
          name: driver.name,
          role: driver.role,
          tenantId: driver.tenantId
        },
        activeRoutes: activeRoutes.map((route: any) => ({
          ...route,
          type: route.routeType || 'mixed',
          totalStops: route.appointments?.length || 0,
          completedStops: route.appointments?.filter((apt: any) => apt.status === 'completed').length || 0
        })),
        appointments: driverAppointments,
        stats: {
          totalPickups: driverAppointments.filter((apt: any) => apt.logistics === 'pickup').length,
          totalDeliveries: driverAppointments.filter((apt: any) => apt.logistics === 'delivery').length,
          completed: driverAppointments.filter((apt: any) => apt.status === 'completed').length,
          pending: driverAppointments.filter((apt: any) => apt.status === 'scheduled').length
        }
      });
    } catch (error) {
      console.error("Error fetching driver dashboard:", error);
      res.status(500).json({ message: "Failed to fetch driver dashboard" });
    }
  });

  // Driver route export endpoints for Waze/Google Maps
  app.get('/api/driver/route/:routeId/export/:format', async (req: any, res) => {
    try {
      const { routeId, format } = req.params;
      
      const routes = await storage.getDeliveryRoutes(new Date().toISOString().split('T')[0]);
      const route = routes.find((r: any) => r.id === routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      // Get route appointments with client/pet data
      const appointments = route.appointments || [];
      
      // Generate waypoints for navigation apps
      const waypoints = appointments.map((apt: any, index: number) => ({
        address: apt.address || `${apt.client?.fraccionamiento || 'Address'} ${index + 1}`,
        lat: apt.latitude || (25.6866 + Math.random() * 0.1),
        lng: apt.longitude || (-100.3161 + Math.random() * 0.1),
        clientName: apt.clientName || apt.client?.name,
        petName: apt.petName || apt.pet?.name,
        type: apt.logistics || 'delivery',
        appointmentId: apt.id,
        orderIndex: index + 1
      }));

      if (format === 'waze') {
        // Generate Waze-compatible URLs
        const wazeUrls = waypoints.map((wp: any) => 
          `https://waze.com/ul?navigate=yes&ll=${wp.lat},${wp.lng}&address=${encodeURIComponent(wp.address)}`
        );
        res.json({ 
          platform: 'waze',
          urls: wazeUrls,
          waypoints: waypoints,
          routeId: routeId,
          routeName: route.name
        });
      } else if (format === 'googlemaps') {
        // Generate Google Maps URLs
        const googleUrls = waypoints.map((wp: any) => 
          `https://www.google.com/maps/dir/?api=1&destination=${wp.lat},${wp.lng}&destination_place_id=${encodeURIComponent(wp.address)}`
        );
        res.json({ 
          platform: 'google_maps',
          urls: googleUrls,
          waypoints: waypoints,
          routeId: routeId,
          routeName: route.name
        });
      } else {
        res.status(400).json({ message: "Unsupported export format. Use 'waze' or 'googlemaps'" });
      }
    } catch (error) {
      console.error("Error exporting route:", error);
      res.status(500).json({ message: "Failed to export route" });
    }
  });

  // Update driver location (for real-time tracking)
  app.post('/api/driver/location/:driverId', async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { latitude, longitude, timestamp } = req.body;
      
      // This would typically update a location tracking table
      // For now, we'll simulate this functionality
      console.log(`Driver ${driverId} location updated: ${latitude}, ${longitude} at ${timestamp}`);

      res.json({ 
        message: "Location updated successfully",
        driverId,
        location: { latitude, longitude },
        timestamp: timestamp || new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating driver location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Mark appointment as completed (driver app)
  app.post('/api/driver/appointment/:appointmentId/complete', async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      const { driverId, notes, completedAt } = req.body;
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        status: 'completed',
        notes: notes || `Completed by driver ${driverId}`
      });

      res.json({
        ...updatedAppointment,
        message: "Appointment marked as completed"
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
      res.status(500).json({ message: "Failed to complete appointment" });
    }
  });

  // Get driver's current route progress
  app.get('/api/driver/progress/:driverId/:tenantId', async (req: any, res) => {
    try {
      const { driverId, tenantId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      const routes = await storage.getDeliveryRoutes(today);
      const driverRoutes = routes.filter((route: any) => route.driverId === driverId);
      const appointments = await storage.getAppointments(tenantId, today);
      const driverAppointments = appointments.filter((apt: any) => 
        apt.logistics && (apt.logistics === 'pickup' || apt.logistics === 'delivery')
      );
      
      const progress = driverRoutes.map((route: any) => ({
        routeId: route.id,
        routeName: route.name,
        routeType: route.routeType || 'mixed',
        totalStops: route.appointments?.length || 0,
        completedStops: route.appointments?.filter((apt: any) => apt.status === 'completed').length || 0,
        pendingStops: route.appointments?.filter((apt: any) => apt.status === 'scheduled').length || 0,
        progress: Math.round(((route.appointments?.filter((apt: any) => apt.status === 'completed').length || 0) / (route.appointments?.length || 1)) * 100)
      }));

      res.json({
        driverId,
        tenantId,
        routes: progress,
        summary: {
          totalRoutes: driverRoutes.length,
          totalStops: driverAppointments.length,
          completedStops: driverAppointments.filter((apt: any) => apt.status === 'completed').length,
          overallProgress: Math.round((driverAppointments.filter((apt: any) => apt.status === 'completed').length / (driverAppointments.length || 1)) * 100)
        }
      });
    } catch (error) {
      console.error("Error fetching driver progress:", error);
      res.status(500).json({ message: "Failed to fetch driver progress" });
    }
  });

  // Sales Delivery Management API Routes
  // Get sales orders for a tenant
  app.get('/api/sales-orders/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      // For now, return sample data since we need to implement storage methods
      const sampleOrders = [
        {
          id: "order-1",
          customerName: "María González",
          customerPhone: "+525512345678",
          customerAddress: "Av. Insurgentes 123, Col. Roma Norte, CDMX",
          items: [
            { name: "Medicina para Perros", quantity: 2, price: 150.00, type: "medicine" },
            { name: "Alimento Premium", quantity: 1, price: 450.00, type: "product" }
          ],
          totalAmount: 600.00,
          paymentStatus: "pending",
          deliveryStatus: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order-2",
          customerName: "Carlos Ramírez",
          customerPhone: "+525587654321",
          customerAddress: "Calle Madero 456, Col. Centro, CDMX",
          items: [
            { name: "Vacuna Anual", quantity: 1, price: 380.00, type: "medicine" }
          ],
          totalAmount: 380.00,
          paymentStatus: "confirmed",
          paymentMethod: "credit",
          receiptLink: "https://example.com/receipt/order-2",
          deliveryStatus: "delivered",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      res.json(sampleOrders);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      res.status(500).json({ message: "Failed to fetch sales orders" });
    }
  });

  // Get payment gateway configuration for tenant
  app.get('/api/payment-gateway/config/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      // Check if tenant has payment gateway configured
      const gatewayConfig = await storage.getPaymentGatewayConfig(tenantId);
      
      if (!gatewayConfig || !gatewayConfig.isActive) {
        return res.json({ enabled: false });
      }

      // Return sanitized config (no secret keys)
      res.json({
        enabled: true,
        provider: gatewayConfig.gatewayType,
        publicKey: (gatewayConfig.config as any)?.publicKey || null
      });
    } catch (error) {
      console.error("Error fetching payment gateway config:", error);
      res.status(500).json({ message: "Failed to fetch payment gateway config" });
    }
  });

  // Create payment link for sales order
  app.post('/api/sales-orders/:orderId/payment-link', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // For demo purposes, generate a mock payment link
      const paymentLink = `https://payments.example.com/pay/${orderId}?amount=600.00`;
      
      // In a real implementation, you would:
      // 1. Retrieve the order from database
      // 2. Get payment gateway config for the tenant
      // 3. Create payment intent/session with the payment provider
      // 4. Update the order with the payment link
      
      res.json({
        paymentLink,
        message: "Payment link created successfully"
      });
    } catch (error) {
      console.error("Error creating payment link:", error);
      res.status(500).json({ message: "Failed to create payment link" });
    }
  });

  // Confirm payment for sales order
  app.post('/api/sales-orders/:orderId/confirm-payment', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { paymentMethod } = req.body;
      
      // In a real implementation, you would:
      // 1. Retrieve the order from database
      // 2. Update payment status to confirmed
      // 3. Generate receipt
      // 4. Trigger any post-payment workflows
      
      res.json({
        message: "Payment confirmed successfully",
        receiptLink: `https://receipts.example.com/receipt/${orderId}`
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Confirm delivery for sales order
  app.post('/api/sales-orders/:orderId/confirm-delivery', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { deliveryNotes } = req.body;
      
      // In a real implementation, you would:
      // 1. Retrieve the order from database
      // 2. Update delivery status to confirmed
      // 3. Record delivery notes and timestamp
      // 4. Trigger any post-delivery workflows
      
      res.json({
        message: "Delivery confirmed successfully"
      });
    } catch (error) {
      console.error("Error confirming delivery:", error);
      res.status(500).json({ message: "Failed to confirm delivery" });
    }
  });

  // === BILLING AND SUBSCRIPTION MANAGEMENT API ===
  
  // Billing Admin API for TenantVet sites - Tenant-level billing summary
  app.get('/api/billing/summary/:tenantId', isAuthenticated, checkSubscriptionValidity, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { period = 'current_month' } = req.query;
      
      // Calculate billing summary based on sales and transactions
      const salesData = await storage.getSales(tenantId);
      
      // Filter data based on period
      const now = new Date();
      let startDate, endDate;
      
      switch (period) {
        case 'current_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
      }
      
      const filteredSales = salesData.filter(sale => {
        const saleDate = new Date(sale.createdAt || new Date());
        return saleDate >= startDate && saleDate <= endDate;
      });
      
      const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const monthlyRevenue = period === 'current_month' ? totalRevenue : 
        salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt || new Date());
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        }).reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      
      // Get recent transactions with client/pet details
      const recentTransactions = await Promise.all(
        filteredSales.slice(-10).map(async (sale) => {
          const items = await storage.getSaleItems(sale.id);
          const client = (sale as any).clientId ? await storage.getClients((sale as any).clientId).then(c => c[0]) : null;
          const pet = (sale as any).petId ? await storage.getPets((sale as any).petId).then(p => p[0]) : null;
          
          return {
            id: sale.id,
            date: sale.createdAt,
            clientName: client?.name || 'Cliente General',
            petName: pet?.name || 'N/A',
            service: items.map(item => item.name).join(', ') || 'Venta general',
            amount: parseFloat(sale.totalAmount),
            status: (sale as any).status === 'completed' ? 'paid' : 'pending'
          };
        })
      );
      
      res.json({
        totalRevenue,
        monthlyRevenue,
        outstandingInvoices: filteredSales.filter(sale => (sale as any).status === 'pending').length,
        totalTransactions: filteredSales.length,
        recentTransactions: recentTransactions.reverse()
      });
    } catch (error) {
      console.error("Error fetching billing summary:", error);
      res.status(500).json({ message: "Failed to fetch billing summary" });
    }
  });

  // Export billing data to Excel/CSV
  app.post('/api/billing/export/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { period, format } = req.body;
      
      // Get sales data based on period
      const salesData = await storage.getSales(tenantId);
      
      // Create export data structure
      const exportData = await Promise.all(
        salesData.map(async (sale) => {
          const items = await storage.getSaleItems(sale.id);
          const client = (sale as any).clientId ? await storage.getClients((sale as any).clientId).then(c => c[0]) : null;
          const pet = (sale as any).petId ? await storage.getPets((sale as any).petId).then(p => p[0]) : null;
          
          return {
            Fecha: new Date(sale.createdAt || new Date()).toLocaleDateString('es-MX'),
            Cliente: client?.name || 'Cliente General',
            Mascota: pet?.name || 'N/A',
            Servicio: items.map(item => item.name).join(', '),
            Subtotal: parseFloat((sale as any).subtotal || '0'),
            IVA: parseFloat((sale as any).taxAmount || '0'),
            Total: parseFloat(sale.totalAmount),
            Estado: (sale as any).status === 'completed' ? 'Pagado' : 'Pendiente',
            'Método de Pago': sale.paymentMethod || 'Efectivo'
          };
        })
      );
      
      const csv = [
        Object.keys(exportData[0] || {}).join(','),
        ...exportData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=billing-${period}-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting billing data:", error);
      res.status(500).json({ message: "Failed to export billing data" });
    }
  });

  // SuperAdmin Subscription Management API
  app.get('/api/superadmin/subscription-plans', isSuperAdmin, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.patch('/api/superadmin/subscription-plans/:planId', isSuperAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const updates = req.body;
      const updatedPlan = await storage.updateSubscriptionPlan(planId, updates);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Bulk import subscription plans from JSON configuration
  app.post('/api/superadmin/subscription-plans/bulk-import', isSuperAdmin, async (req, res) => {
    try {
      const { trial_days, monthly_multiplier, plans } = req.body;
      
      if (!plans || !Array.isArray(plans)) {
        return res.status(400).json({ message: "Invalid JSON structure. Expected 'plans' array." });
      }

      const importResults = {
        created: 0,
        updated: 0,
        errors: []
      };

      // Process each plan in the import
      for (const planConfig of plans) {
        try {
          // Validate required fields
          const requiredFields = ['name', 'description', 'monthly_price_mxn', 'yearly_price_mxn', 'max_vetsites'];
          const missingFields = requiredFields.filter(field => !planConfig.hasOwnProperty(field));
          
          if (missingFields.length > 0) {
            (importResults.errors as any[]).push(`Plan '${planConfig.name}': Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }

          // Check if plan exists
          const existingPlan = await storage.getSubscriptionPlanByName(planConfig.name);
          
          // Transform the plan configuration to match our database schema
          const planData = {
            name: planConfig.name,
            displayName: planConfig.name,
            description: planConfig.description,
            monthlyPrice: planConfig.monthly_price_mxn.toString(),
            yearlyPrice: planConfig.yearly_price_mxn.toString(),
            maxTenants: planConfig.max_vetsites,
            features: planConfig.features || [],
            isActive: planConfig.status === 'Activo' || planConfig.status === 'Active'
          };

          if (existingPlan) {
            // Update existing plan
            await storage.updateSubscriptionPlan(existingPlan.id, planData);
            importResults.updated++;
          } else {
            // Create new plan
            await storage.createSubscriptionPlan(planData);
            importResults.created++;
          }

        } catch (planError: any) {
          (importResults.errors as any[]).push(`Plan '${planConfig.name}': ${planError.message}`);
        }
      }

      res.json({
        success: true,
        message: `Import completed: ${importResults.created} created, ${importResults.updated} updated`,
        results: importResults
      });

    } catch (error) {
      console.error("Error importing subscription plans:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to import subscription plans",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SuperAdmin Features Management API Endpoints
  
  // Get all features
  app.get('/api/superadmin/features', isSuperAdmin, async (req, res) => {
    try {
      // For now, return the predefined feature definitions from shared/deploymentFeatures.ts
      const { FEATURE_DEFINITIONS } = await import('../shared/deploymentFeatures.js');
      const features = Object.values(FEATURE_DEFINITIONS);
      res.json(features);
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  // Create new feature
  app.post('/api/superadmin/features', isSuperAdmin, async (req, res) => {
    try {
      const featureData = req.body;
      // TODO: Implement database storage for custom features
      // For now, we'll just return success as features are managed via deploymentFeatures.ts
      res.json({ 
        success: true, 
        message: "Feature creation noted. Update deploymentFeatures.ts for permanent changes.",
        feature: featureData 
      });
    } catch (error) {
      console.error("Error creating feature:", error);
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  // Update feature
  app.put('/api/superadmin/features/:featureId', isSuperAdmin, async (req, res) => {
    try {
      const { featureId } = req.params;
      const featureData = req.body;
      // TODO: Implement database storage for custom features
      res.json({ 
        success: true, 
        message: "Feature update noted. Update deploymentFeatures.ts for permanent changes.",
        feature: featureData 
      });
    } catch (error) {
      console.error("Error updating feature:", error);
      res.status(500).json({ message: "Failed to update feature" });
    }
  });

  // Delete feature
  app.delete('/api/superadmin/features/:featureId', isSuperAdmin, async (req, res) => {
    try {
      const { featureId } = req.params;
      // TODO: Implement database storage for custom features
      res.json({ 
        success: true, 
        message: "Feature deletion noted. Update deploymentFeatures.ts for permanent changes."
      });
    } catch (error) {
      console.error("Error deleting feature:", error);
      res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  // Bulk import features from JSON
  app.post('/api/superadmin/features/bulk-import', isSuperAdmin, async (req, res) => {
    try {
      const { features } = req.body;
      
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({ message: "Invalid JSON structure. Expected 'features' array." });
      }

      const importResults = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      // Check if we need to implement database storage for features
      // For now, we'll simulate the import and provide feedback
      for (const featureConfig of features) {
        try {
          // Validate required fields
          const requiredFields = ['key', 'nombre', 'descripcion'];
          const missingFields = requiredFields.filter(field => !featureConfig.hasOwnProperty(field));
          
          if (missingFields.length > 0) {
            (importResults.errors as any[]).push(`Feature '${featureConfig.key}': Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }

          // Transform to internal feature format
          const featureData = {
            id: featureConfig.key,
            name: featureConfig.nombre,
            description: featureConfig.descripcion,
            category: featureConfig.category || 'subscription_management',
            minimumTier: featureConfig.minimumTier || 'basic',
            enabled: featureConfig.enabled !== undefined ? featureConfig.enabled : true,
            spanishName: featureConfig.nombre,
            spanishDescription: featureConfig.descripcion
          };

          // Check if feature exists and if it's used in any subscription plan
          const { FEATURE_DEFINITIONS } = await import('../shared/deploymentFeatures.js');
          const existingFeature = FEATURE_DEFINITIONS[featureConfig.key];
          
          if (existingFeature) {
            // Check if the feature is used in any subscription plan
            const subscriptionPlans = await storage.getSubscriptionPlans();
            const isFeatureUsed = subscriptionPlans.some((plan: any) => 
              plan.features && plan.features.includes(featureConfig.key)
            );
            
            if (isFeatureUsed) {
              importResults.skipped++;
              (importResults.errors as any[]).push(`Feature '${featureConfig.key}' is used in subscription plans and cannot be overwritten`);
              continue;
            } else {
              // Feature exists but is not used, can be updated
              importResults.updated++;
            }
          } else {
            // New feature
            importResults.created++;
          }

          // TODO: When database storage is implemented, actually save the feature here
          // await storage.upsertFeature(featureData);

        } catch (featureError: any) {
          (importResults.errors as any[]).push(`Feature '${(featureConfig as any).key}': ${featureError.message}`);
        }
      }

      const totalProcessed = importResults.created + importResults.updated + importResults.skipped;
      const message = `Import simulation completed: ${importResults.created} would be created, ${importResults.updated} would be updated, ${importResults.skipped} skipped (in use)`;

      res.json({
        success: true,
        message: message,
        note: "Features are currently managed via deploymentFeatures.ts. Database storage coming soon.",
        results: importResults
      });

    } catch (error) {
      console.error("Error importing features:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to import features",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all TenantVet customers (companies) for enterprise management
  app.get('/api/superadmin/tenant-customers', isSuperAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompaniesWithSubscriptions();
      
      // Add VetSite count and revenue data
      const customersWithStats = await Promise.all(
        companies.map(async (company) => {
          const tenants = await storage.getCompanyTenants(company.id);
          const subscription = await storage.getCompanySubscription(company.id);
          const plan = subscription ? await storage.getSubscriptionPlan(subscription.planId) : null;
          
          // Calculate revenue (this would be actual billing data in production)
          const monthlyRevenue = plan ? parseFloat(plan.monthlyPrice) : 0;
          
          return {
            id: company.id,
            name: company.name,
            email: (company as any).email || "unknown@email.com",
            subscriptionPlan: plan?.displayName || 'Sin Plan',
            subscriptionStatus: subscription?.status || 'inactive',
            vetsitesUsed: tenants.length,
            vetsitesAllowed: plan?.maxTenants || 0,
            monthlyRevenue,
            subscriptionStart: subscription?.currentPeriodStart || company.createdAt,
            subscriptionEnd: subscription?.currentPeriodEnd || company.createdAt
          };
        })
      );
      
      res.json(customersWithStats);
    } catch (error) {
      console.error("Error fetching tenant customers:", error);
      res.status(500).json({ message: "Failed to fetch tenant customers" });
    }
  });

  // Create new TenantVet customer
  app.post('/api/superadmin/tenant-customers', isSuperAdmin, async (req, res) => {
    try {
      const { name, email, planId } = req.body;
      
      // Create company
      const company = await storage.createCompany({
        name,
        subscriptionStatus: 'trial',
        subscriptionPlan: 'trial'
      });
      
      // Create subscription
      const subscription = await storage.createCompanySubscription({
        companyId: company.id,
        planId,
        status: 'trial',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
      });
      
      res.json({ company, subscription });
    } catch (error) {
      console.error("Error creating tenant customer:", error);
      res.status(500).json({ message: "Failed to create tenant customer" });
    }
  });

  // Subscription management endpoints
  app.post('/api/superadmin/subscriptions/:companyId/renew', isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { planId, months = 1 } = req.body;
      
      const now = new Date();
      const endDate = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
      
      const subscription = await storage.updateCompanySubscription(companyId, {
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: endDate
      });
      
      res.json({ message: "Subscription renewed successfully", subscription });
    } catch (error) {
      console.error("Error renewing subscription:", error);
      res.status(500).json({ message: "Failed to renew subscription" });
    }
  });

  app.get('/api/superadmin/subscriptions/expiring', isSuperAdmin, async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const cutoffDate = new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000);
      
      const expiringSubscriptions = await storage.getExpiringSubscriptions(cutoffDate);
      res.json(expiringSubscriptions);
    } catch (error) {
      console.error("Error fetching expiring subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch expiring subscriptions" });
    }
  });

  // Check subscription status for a company
  app.get('/api/subscription/status/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const subscription = await storage.getCompanySubscription(companyId);
      if (!subscription) {
        return res.json({ status: 'none', hasSubscription: false });
      }
      
      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      const tenants = await storage.getCompanyTenants(companyId);
      
      res.json({
        status: subscription.status,
        hasSubscription: true,
        plan: plan?.displayName || 'Unknown',
        daysRemaining,
        expiresAt: endDate.toISOString(),
        vetsitesUsed: tenants.length,
        vetsitesAllowed: plan?.maxTenants || 0,
        isExpired: endDate < now,
        isNearExpiry: daysRemaining <= 7 && daysRemaining > 0
      });
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  // Email configuration management for SuperAdmin
  app.get("/api/superadmin/email-config", isSuperAdmin, async (req, res) => {
    try {
      const config = await storage.getEmailConfig();
      if (!config) {
        return res.json({ 
          provider: 'resend',
          fromEmail: '',
          fromName: 'VetGroom',
          isActive: false,
          isConfigured: false
        });
      }
      
      // Don't expose the API key in the response
      const { apiKey, ...safeConfig } = config;
      res.json({ ...safeConfig, isConfigured: !!apiKey });
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({ error: "Failed to get email configuration" });
    }
  });

  app.post("/api/superadmin/email-config", isSuperAdmin, async (req, res) => {
    try {
      const { provider, apiKey, fromEmail, fromName } = req.body;

      if (!provider || !apiKey || !fromEmail || !fromName) {
        return res.status(400).json({ error: "All email configuration fields are required" });
      }

      // Check if configuration exists
      const existingConfig = await storage.getEmailConfig();
      
      let config;
      if (existingConfig) {
        config = await storage.updateEmailConfig({
          provider,
          apiKey,
          fromEmail,
          fromName,
          isActive: true
        });
      } else {
        config = await storage.createEmailConfig({
          id: 'default',
          provider,
          apiKey,
          fromEmail,
          fromName,
          isActive: true
        });
      }

      // Email service initialization will be handled by the email scheduler
      const { apiKey: _, ...safeConfig } = config;
      res.json({ ...safeConfig, isConfigured: true });
    } catch (error) {
      console.error("Error updating email config:", error);
      res.status(500).json({ error: "Failed to update email configuration" });
    }
  });

  app.get("/api/superadmin/email-logs", isSuperAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getEmailLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error getting email logs:", error);
      res.status(500).json({ error: "Failed to get email logs" });
    }
  });

  // Test email sending
  app.post("/api/superadmin/test-email", isSuperAdmin, async (req, res) => {
    try {
      const { recipientEmail } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      const config = await storage.getEmailConfig();
      if (!config || !config.isActive) {
        return res.status(400).json({ error: "Email configuration not found or inactive" });
      }

      // Send test email using direct Resend provider
      const { Resend } = await import('resend');
      const resend = new Resend(config.apiKey);
      
      const { data, error } = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: recipientEmail,
        subject: 'Test Email - VetGroom Configuration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">VetGroom Test Email</h2>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p><strong>Provider:</strong> ${config.provider}</p>
            <p><strong>From Email:</strong> ${config.fromEmail}</p>
            <p><strong>From Name:</strong> ${config.fromName}</p>
            <p>If you received this email, your email configuration is working properly!</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This email was sent from the VetGroom platform.</p>
          </div>
        `,
        text: `VetGroom Test Email\n\nThis is a test email to verify your email configuration is working correctly.\n\nProvider: ${config.provider}\nFrom Email: ${config.fromEmail}\nFrom Name: ${config.fromName}\n\nIf you received this email, your email configuration is working properly!`,
      });

      if (error) {
        console.error("Resend email error details:", error);
        
        // Parse specific error types
        let errorMessage = error.message || "Unknown email provider error";
        let helpText = "";
        
        if ((error as any).name === 'validation_error' && (error as any).error?.includes('domain is not verified')) {
          errorMessage = "Domain verification required";
          helpText = "Please verify your domain at https://resend.com/domains or use a verified domain like your-domain@resend.dev";
        }
        
        await storage.createEmailLog({
          emailType: 'test_email',
          recipientEmail,
          subject: 'Test Email - VetGroom',
          status: 'failed',
          sentAt: new Date(),
          errorMessage: JSON.stringify(error)
        });
        
        return res.status(500).json({ 
          error: "Failed to send test email", 
          details: errorMessage,
          help: helpText,
          resendError: error
        });
      }

      console.log("Test email sent successfully:", data);
      
      // Log the successful test email
      await storage.createEmailLog({
        emailType: 'test_email',
        recipientEmail,
        subject: 'Test Email - VetGroom',
        status: 'sent',
        sentAt: new Date()
      });

      res.json({ success: true, message: "Test email sent successfully", emailId: data?.id });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Generate receipt from sale data
  app.post('/api/sales/:saleId/generate-receipt', isAuthenticated, async (req, res) => {
    try {
      const { saleId } = req.params;
      const { templateConfig } = req.body;
      
      // Get sale data
      const sale = await storage.getSale(saleId);
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      // Get sale items
      const items = await storage.getSaleItems(saleId);
      
      // Get active receipt template or use provided config
      let template = null;
      if (templateConfig) {
        template = templateConfig;
      } else {
        // Try to get active template for tenant/company
        const saleData = await storage.getSale(saleId);
        template = await storage.getActiveReceiptTemplate(undefined, saleData?.tenantId);
      }
      
      // Get company and tenant information for receipt
      const tenant = await storage.getTenant(sale.tenantId);
      const company = tenant ? await storage.getCompany(tenant.companyId) : null;
      
      // Generate receipt HTML
      const receiptHtml = generateReceiptHtml({
        sale,
        items,
        template: template || getDefaultTemplate(),
        company: company,
        tenant: tenant
      });
      
      res.json({ 
        receiptHtml,
        saleId: sale.id,
        receiptId: sale.receiptId,
        customerName: sale.customerName
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({ error: 'Failed to generate receipt' });
    }
  });

  // Company & Clinic Admin routes
  app.get('/api/admin/company/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ error: 'Failed to fetch company' });
    }
  });

  app.put('/api/admin/company/:companyId', isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const updates = req.body;
      const updatedCompany = await storage.updateCompany(companyId, updates);
      res.json(updatedCompany);
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ error: 'Failed to update company' });
    }
  });

  app.get('/api/admin/tenant/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json(tenant);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  });

  app.put('/api/admin/tenant/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const updates = req.body;
      const updatedTenant = await storage.updateTenant(tenantId, updates);
      res.json(updatedTenant);
    } catch (error) {
      console.error('Error updating tenant:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  });

  // Receipt Templates routes
  app.get('/api/admin/receipt-templates', isAuthenticated, async (req, res) => {
    try {
      const { companyId, tenantId } = req.query;
      const templates = await storage.getReceiptTemplates(
        companyId as string,
        tenantId as string
      );
      res.json(templates);
    } catch (error) {
      console.error('Error fetching receipt templates:', error);
      res.status(500).json({ error: 'Failed to fetch receipt templates' });
    }
  });

  app.get('/api/admin/receipt-templates/:templateId', isAuthenticated, async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await storage.getReceiptTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching receipt template:', error);
      res.status(500).json({ error: 'Failed to fetch receipt template' });
    }
  });

  app.post('/api/admin/receipt-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const templateData = {
        ...req.body,
        uploadedBy: userId,
      };

      const template = await storage.createReceiptTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error('Error creating receipt template:', error);
      res.status(500).json({ error: 'Failed to create receipt template' });
    }
  });

  app.put('/api/admin/receipt-templates/:templateId', isAuthenticated, async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await storage.updateReceiptTemplate(templateId, req.body);
      res.json(template);
    } catch (error) {
      console.error('Error updating receipt template:', error);
      res.status(500).json({ error: 'Failed to update receipt template' });
    }
  });

  app.delete('/api/admin/receipt-templates/:templateId', isAuthenticated, async (req, res) => {
    try {
      const { templateId } = req.params;
      await storage.deleteReceiptTemplate(templateId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting receipt template:', error);
      res.status(500).json({ error: 'Failed to delete receipt template' });
    }
  });

  app.get('/api/admin/receipt-templates/active/current', isAuthenticated, async (req, res) => {
    try {
      const { companyId, tenantId } = req.query;
      const template = await storage.getActiveReceiptTemplate(
        companyId as string,
        tenantId as string
      );
      res.json(template || null);
    } catch (error) {
      console.error('Error fetching active receipt template:', error);
      res.status(500).json({ error: 'Failed to fetch active receipt template' });
    }
  });

  // Upload URL for receipt templates
  app.post('/api/admin/receipt-templates/upload-url', isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const { fileName } = req.body;
      const uploadURL = await objectStorageService.getReceiptTemplateUploadURL(fileName);
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  // Helper function to generate QR code data URL with actual transaction data
  function generateQRCodeDataUrl(sale: any, totalAmount: number, company?: any, tenant?: any) {
    // QR Code contains actual receipt data
    const qrData = {
      receiptId: sale.receiptId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      total: totalAmount.toFixed(2),
      date: new Date(sale.createdAt).toLocaleDateString('es-ES'),
      paymentStatus: sale.paymentStatus,
      deliveryStatus: sale.deliveryStatus,
      company: company?.name || '',
      clinic: tenant?.name || '',
      website: company?.website || ''
    };
    
    // Generate QR code as SVG (simplified version for demonstration)
    // In production, you would use a proper QR code library like 'qrcode'
    const qrString = JSON.stringify(qrData);
    const qrSize = 80;
    
    // Simple QR-like pattern SVG (replace with actual QR generation)
    const qrSvg = `
      <svg width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${qrSize}" height="${qrSize}" fill="white"/>
        <rect x="8" y="8" width="16" height="16" fill="#000"/>
        <rect x="56" y="8" width="16" height="16" fill="#000"/>
        <rect x="8" y="56" width="16" height="16" fill="#000"/>
        <rect x="32" y="32" width="16" height="16" fill="#000"/>
        <rect x="16" y="16" width="8" height="8" fill="#000"/>
        <rect x="48" y="16" width="8" height="8" fill="#000"/>
        <rect x="16" y="48" width="8" height="8" fill="#000"/>
        <text x="${qrSize/2}" y="${qrSize-5}" text-anchor="middle" font-size="6" fill="#666">${sale.receiptId}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;
  }

  // Helper function to generate receipt HTML with actual transaction data
  function generateReceiptHtml({ sale, items, template, company, tenant }: { sale: any, items: any[], template: any, company?: any, tenant?: any }) {
    const currentDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const totalAmount = typeof sale.totalAmount === 'string' 
      ? parseFloat(sale.totalAmount) 
      : sale.totalAmount;
    
    const itemsHtml = items.map(item => {
      const unitPrice = typeof item.unitPrice === 'string' 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice;
      const total = typeof item.total === 'string' 
        ? parseFloat(item.total) 
        : item.total;
      
      return `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
          <div>
            <div style="font-weight: 500;">${item.name}</div>
            <div style="font-size: 0.9em; color: #666;">Cantidad: ${item.quantity}</div>
          </div>
          <div style="text-align: right;">
            <div>$${unitPrice.toFixed(2)}</div>
            <div style="font-weight: 600;">$${total.toFixed(2)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Generate QR code with actual transaction data
    const qrCodeDataUrl = generateQRCodeDataUrl(sale, totalAmount, company, tenant);
    
    // Use template configuration or default styling
    const logoHtml = template?.logoUrl ? 
      `<img src="${template.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;">` : '';
    
    // Use real company and clinic information
    const companyName = company?.name || template?.companyName || 'Veterinaria';
    const clinicName = tenant?.name || 'Clínica';
    const companyAddress = company?.address || '';
    const companyPhone = company?.phone || '';
    const companyWebsite = company?.website || '';
    const companyEmail = company?.email || '';
    const clinicAddress = tenant?.address || '';
    const clinicPhone = tenant?.phone || '';
    const clinicEmail = tenant?.email || '';
    const primaryColor = template?.primaryColor || '#3b82f6';
    const accentColor = template?.accentColor || '#1e40af';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura - ${sale.receiptId}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
          }
          .receipt-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .customer-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .items-section {
            margin: 30px 0;
          }
          .total-section {
            background: ${primaryColor};
            color: white;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
            font-size: 1.2em;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            ${logoHtml}
            <h1>${companyName}</h1>
            <h2>${clinicName}</h2>
            <h3>Factura de Venta</h3>
            <p>Recibo: ${sale.receiptId}</p>
          </div>
          
          <div class="content">
            <div class="customer-info">
              <h3>Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${sale.customerName}</p>
              <p><strong>Teléfono:</strong> ${sale.customerPhone}</p>
              <p><strong>Fecha:</strong> ${currentDate}</p>
            </div>
            
            <div class="items-section">
              <h3>Productos/Servicios</h3>
              ${itemsHtml}
            </div>
            
            <div class="total-section">
              TOTAL: $${totalAmount.toFixed(2)}
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 6px;">
              <p><strong>Estado de Pago:</strong> 
                <span style="color: ${sale.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'};">
                  ${sale.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </p>
              <p><strong>Estado de Entrega:</strong> 
                <span style="color: ${sale.deliveryStatus === 'delivered' ? '#16a34a' : '#dc2626'};">
                  ${sale.deliveryStatus === 'delivered' ? 'ENTREGADO' : 'PENDIENTE'}
                </span>
              </p>
              ${sale.notes ? `<p><strong>Notas:</strong> ${sale.notes}</p>` : ''}
            </div>
          </div>
          
          <div class="footer">
            <!-- Company and Clinic Information -->
            <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div style="flex: 1;">
                  <p style="margin: 0; font-weight: 600; color: ${primaryColor};">${companyName}</p>
                  ${companyAddress ? `<p style="margin: 2px 0; font-size: 0.9em;">${companyAddress}</p>` : ''}
                  ${companyPhone ? `<p style="margin: 2px 0; font-size: 0.9em;">Tel: ${companyPhone}</p>` : ''}
                  ${companyEmail ? `<p style="margin: 2px 0; font-size: 0.9em;">Email: ${companyEmail}</p>` : ''}
                  ${companyWebsite ? `<p style="margin: 2px 0; font-size: 0.9em;"><a href="${companyWebsite}" style="color: ${primaryColor}; text-decoration: none;">${companyWebsite}</a></p>` : ''}
                </div>
                <div style="flex: 1; text-align: right;">
                  <p style="margin: 0; font-weight: 600; color: ${accentColor};">${clinicName}</p>
                  ${clinicAddress ? `<p style="margin: 2px 0; font-size: 0.9em;">${clinicAddress}</p>` : ''}
                  ${clinicPhone ? `<p style="margin: 2px 0; font-size: 0.9em;">Tel: ${clinicPhone}</p>` : ''}
                  ${clinicEmail ? `<p style="margin: 2px 0; font-size: 0.9em;">Email: ${clinicEmail}</p>` : ''}
                </div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <div style="flex: 1;">
                <p>Gracias por su preferencia</p>
                <p style="font-size: 0.9em;">Factura generada el ${currentDate}</p>
              </div>
              <div style="text-align: center;">
                <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 80px; height: 80px; border: 1px solid #ddd; border-radius: 4px;" />
                <p style="font-size: 0.8em; margin: 5px 0 0; color: #666;">Escanea para verificar</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Default template configuration
  function getDefaultTemplate() {
    return {
      companyName: 'Veterinaria',
      primaryColor: '#3b82f6',
      accentColor: '#1e40af',
      logoUrl: null
    };
  }

  // Download receipt template
  app.get('/api/admin/receipt-templates/:templateId/download', isAuthenticated, async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await storage.getReceiptTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getReceiptTemplateFile(template.fileUrl);
      
      // Set download headers
      res.set({
        'Content-Disposition': `attachment; filename="${template.fileName}"`,
        'Content-Type': 'application/zip'
      });
      
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error('Error downloading receipt template:', error);
      res.status(500).json({ error: 'Failed to download receipt template' });
    }
  });

  // Company Services Catalog
  app.get("/api/superadmin/services-catalog", isSuperAdmin, async (req, res) => {
    try {
      const servicesCatalog = [
        {
          id: "whatsapp-integration",
          name: "WhatsApp Integration",
          description: "Paquete de 1,000 mensajes WhatsApp – $40 USD / $720 MXN",
          category: "Communication",
          baseCost: 20, // USD per month (Updated cost basis)
          sellingPrice: 40, // USD per month - $40 USD / $720 MXN
          profitMargin: 0.50, // 50% profit margin
          pricingModel: "per_package", // Fixed price per package, not per clinic
          features: [
            "Paquete de 1,000 mensajes WhatsApp",
            "Mensajes confirmación, recordatorios y seguimiento",
            "Disponible para todas tus clínicas",
            "Sin cortes, sin interrupciones",
            "Visibilidad en tiempo real del uso",
            "Recarga automática opcional al llegar al 85% de uso",
            "Entrega garantizada y reportes detallados"
          ],
          setupFee: 0, // No setup fee for WhatsApp
          status: "available",
          monthlyLimit: 1000, // 1,000 messages per package
          usageTracking: true,
          autoRenewalThreshold: 85 // Auto-renewal at 85% usage
        },
        {
          id: "sms-notifications",
          name: "SMS Notifications", 
          description: "SMS messaging system for appointment reminders and notifications",
          category: "Communication",
          baseCost: 8, // USD per month per clinic
          sellingPrice: 15, // USD per month per clinic
          profitMargin: 0.47,
          pricingModel: "per_clinic",
          features: [
            "500 SMS per month total across all clinics",
            "Automated reminders",
            "Custom message templates",
            "Delivery tracking",
            "Shared SMS pool across all company locations"
          ],
          setupFee: 25,
          status: "available"
        },
        {
          id: "email-automation",
          name: "Email Marketing & Automation",
          description: "Advanced email marketing and automated communication workflows",
          category: "Marketing",
          baseCost: 12, // USD per month per clinic
          sellingPrice: 20, // USD per month per clinic
          profitMargin: 0.40,
          pricingModel: "per_clinic",
          features: [
            "Unlimited emails across all clinics",
            "Automated workflows",
            "Customer segmentation",
            "Analytics & reporting",
            "Custom templates",
            "Centralized campaign management"
          ],
          setupFee: 35,
          status: "available"
        },
        {
          id: "payment-processing",
          name: "Advanced Payment Processing",
          description: "Integrated payment gateway with multiple payment methods",
          category: "Financial",
          baseCost: 20, // USD per month per clinic
          sellingPrice: 35, // USD per month per clinic
          profitMargin: 0.43,
          pricingModel: "per_clinic",
          features: [
            "Credit card processing for all clinics",
            "PayPal integration",
            "Bank transfers",
            "Recurring payments",
            "Consolidated payment analytics",
            "PCI compliance across all locations"
          ],
          setupFee: 75,
          status: "available"
        },
        {
          id: "advanced-reporting",
          name: "Advanced Analytics & Reporting",
          description: "Comprehensive business intelligence and custom reporting tools",
          category: "Analytics",
          baseCost: 18, // USD per month per clinic
          sellingPrice: 30, // USD per month per clinic
          profitMargin: 0.40,
          pricingModel: "per_clinic",
          features: [
            "Custom dashboards for all clinics",
            "Consolidated financial reports",
            "Multi-location performance metrics",
            "Export capabilities",
            "Scheduled reports",
            "Advanced data visualization"
          ],
          setupFee: 60,
          status: "available"
        },
        {
          id: "inventory-management",
          name: "Inventory Management System",
          description: "Complete inventory tracking and management for veterinary supplies",
          category: "Operations",
          baseCost: 22, // USD per month per clinic
          sellingPrice: 40, // USD per month per clinic
          profitMargin: 0.45,
          pricingModel: "per_clinic",
          features: [
            "Stock tracking across all clinic locations",
            "Low stock alerts",
            "Centralized supplier management",
            "Multi-location purchase orders",
            "Consolidated cost tracking",
            "Expiration monitoring for all locations"
          ],
          setupFee: 80,
          status: "available"
        },
        {
          id: "telemedicine",
          name: "Telemedicine Platform",
          description: "Virtual consultation platform with video calling and file sharing",
          category: "Medical",
          baseCost: 35, // USD per month per clinic
          sellingPrice: 60, // USD per month per clinic
          profitMargin: 0.42,
          pricingModel: "per_clinic",
          features: [
            "HD video calling for all clinic staff",
            "Screen sharing",
            "File upload/sharing",
            "Session recording",
            "Prescription management",
            "Unified patient portal across locations"
          ],
          setupFee: 150,
          status: "beta"
        }
      ];

      // Calculate totals
      const totalServices = servicesCatalog.length;
      const availableServices = servicesCatalog.filter(s => s.status === "available").length;
      const betaServices = servicesCatalog.filter(s => s.status === "beta").length;
      const totalMonthlyRevenuePotentialPerClinic = servicesCatalog
        .filter(s => s.status === "available")
        .reduce((sum, service) => sum + service.sellingPrice, 0);
      const totalSetupRevenuePotentialPerClinic = servicesCatalog
        .filter(s => s.status === "available")
        .reduce((sum, service) => sum + service.setupFee, 0);

      res.json({
        success: true,
        catalog: servicesCatalog,
        summary: {
          totalServices,
          availableServices,
          betaServices,
          totalMonthlyRevenuePotentialPerClinic,
          totalSetupRevenuePotentialPerClinic,
          averageProfitMargin: servicesCatalog.reduce((sum, s) => sum + s.profitMargin, 0) / totalServices,
          pricingNote: "All prices are per clinic. Total cost = price × number of active clinics"
        }
      });
    } catch (error) {
      console.error("Error fetching services catalog:", error);
      res.status(500).json({ error: "Failed to fetch services catalog" });
    }
  });

  // Company Service Subscriptions Management
  app.get("/api/superadmin/company-services/:companyId", isSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      // Get number of active clinics for this company
      // In a real implementation, this would query the database
      // For now, using sample data
      const activeClinics = 3; // This would be: await storage.getActiveClinicCount(companyId);
      
      const companyServices = {
        companyId,
        activeClinics,
        activeServices: [
          {
            serviceId: "whatsapp-integration",
            serviceName: "WhatsApp Integration",
            pricePerClinic: 25,
            totalMonthlyPrice: 25 * activeClinics, // $75 for 3 clinics
            activatedDate: "2024-12-01",
            status: "active",
            nextBillingDate: "2025-01-01",
            messageLimit: "1,000 messages/month total across all clinics"
          }
        ],
        availableServices: [
          {
            serviceId: "sms-notifications",
            serviceName: "SMS Notifications",
            pricePerClinic: 15,
            totalMonthlyPrice: 15 * activeClinics
          },
          {
            serviceId: "email-automation",
            serviceName: "Email Marketing & Automation",
            pricePerClinic: 20,
            totalMonthlyPrice: 20 * activeClinics
          },
          {
            serviceId: "payment-processing",
            serviceName: "Advanced Payment Processing",
            pricePerClinic: 35,
            totalMonthlyPrice: 35 * activeClinics
          },
          {
            serviceId: "advanced-reporting",
            serviceName: "Advanced Analytics & Reporting",
            pricePerClinic: 30,
            totalMonthlyPrice: 30 * activeClinics
          },
          {
            serviceId: "inventory-management",
            serviceName: "Inventory Management System",
            pricePerClinic: 40,
            totalMonthlyPrice: 40 * activeClinics
          }
        ],
        monthlyTotal: 25 * activeClinics, // Current total: $75
        setupFeesOwed: 0,
        pricingInfo: {
          activeClinics,
          pricingModel: "per_clinic",
          note: "All services are priced per clinic. Total cost = price per clinic × number of active clinics"
        }
      };

      res.json({ success: true, companyServices });
    } catch (error) {
      console.error("Error fetching company services:", error);
      res.status(500).json({ error: "Failed to fetch company services" });
    }
  });

  app.post("/api/superadmin/activate-service", isSuperAdmin, async (req, res) => {
    try {
      const { companyId, serviceId } = req.body;
      
      if (!companyId || !serviceId) {
        return res.status(400).json({ error: "Company ID and Service ID are required" });
      }

      // Get number of active clinics for pricing calculation
      // In a real implementation: const activeClinics = await storage.getActiveClinicCount(companyId);
      const activeClinics = 3; // Sample data
      
      // Find service details from catalog
      const servicesCatalog = [
        { id: "whatsapp-integration", name: "WhatsApp Integration", pricePerClinic: 25, setupFee: 50 },
        { id: "sms-notifications", name: "SMS Notifications", pricePerClinic: 15, setupFee: 25 },
        { id: "email-automation", name: "Email Marketing & Automation", pricePerClinic: 20, setupFee: 35 },
        { id: "payment-processing", name: "Advanced Payment Processing", pricePerClinic: 35, setupFee: 75 },
        { id: "advanced-reporting", name: "Advanced Analytics & Reporting", pricePerClinic: 30, setupFee: 60 },
        { id: "inventory-management", name: "Inventory Management System", pricePerClinic: 40, setupFee: 80 }
      ];
      
      const service = servicesCatalog.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      const totalMonthlyPrice = service.pricePerClinic * activeClinics;
      const totalSetupFee = service.setupFee; // Setup fee is one-time, not per clinic

      // Here you would typically:
      // 1. Validate the service exists ✓
      // 2. Check if company already has this service
      // 3. Create a new companyService record
      // 4. Set up billing/subscription with calculated pricing
      // 5. Send activation notification
      
      res.json({
        success: true,
        message: `${service.name} activated for company ${companyId}`,
        serviceDetails: {
          serviceId,
          serviceName: service.name,
          activeClinics,
          pricePerClinic: service.pricePerClinic,
          totalMonthlyPrice,
          setupFee: totalSetupFee,
          pricingNote: `$${service.pricePerClinic} per clinic × ${activeClinics} clinics = $${totalMonthlyPrice}/month`
        },
        activatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error activating service:", error);
      res.status(500).json({ error: "Failed to activate service" });
    }
  });

  // Mobile Admin API endpoints - restricted to admin account only
  const isMobileAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = req.user;
      if (!user || user.claims?.sub !== '45804040') { // Your specific user ID
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Error checking mobile admin access:", error);
      res.status(403).json({ message: "Admin access required" });
    }
  };

  // Get subscription statistics for mobile admin
  app.get('/api/mobile-admin/subscription-stats', isAuthenticated, isMobileAdmin, async (req, res) => {
    try {
      const stats = await storage.getSubscriptionStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching subscription stats:", error);
      res.status(500).json({ message: "Failed to fetch subscription statistics" });
    }
  });

  // Get recent critical activities
  app.get('/api/mobile-admin/recent-activities', isAuthenticated, isMobileAdmin, async (req, res) => {
    try {
      const activities = await storage.getRecentCriticalActivities();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Restart application endpoint
  app.post('/api/mobile-admin/restart-app', isAuthenticated, isMobileAdmin, async (req, res) => {
    try {
      console.log("App restart initiated by mobile admin");
      res.json({ message: "Restart initiated", timestamp: new Date().toISOString() });
      
      // Restart the application after sending response
      setTimeout(() => {
        console.log("Restarting application...");
        process.exit(0); // This will cause the app to restart if using a process manager
      }, 1000);
    } catch (error) {
      console.error("Error restarting app:", error);
      res.status(500).json({ message: "Failed to restart application" });
    }
  });

  // Customer-Facing Service Store API Endpoints
  // ========================================
  
  // Get available services for customers with active service status
  app.get("/api/store/services/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      // Get tenant and company info
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      // Get active services for this company
      const activeServices = await storage.getCompanyActiveServices(tenant.companyId);
      
      // Service catalog (same as superadmin but formatted for customers)
      const servicesCatalog = [
        {
          id: "whatsapp-integration",
          name: "WhatsApp Integration",
          description: "Paquete de 1,000 mensajes WhatsApp – $40 USD / $720 MXN",
          category: "Communication",
          sellingPrice: 40, // Fixed price per package
          features: [
            "Paquete de 1,000 mensajes WhatsApp",
            "Mensajes confirmación, recordatorios y seguimiento",
            "Disponible para todas tus clínicas",
            "Sin cortes, sin interrupciones",
            "Visibilidad en tiempo real del uso",
            "Recarga automática opcional al llegar al 85% de uso",
            "Entrega garantizada y reportes detallados"
          ],
          setupFee: 0,
          status: "available",
          monthlyLimit: 1000,
          usageTracking: true,
          autoRenewalThreshold: 85
        },
        {
          id: "sms-notifications",
          name: "SMS Notifications", 
          description: "Sistema de notificaciones SMS para recordatorios",
          category: "Communication",
          sellingPrice: 15,
          features: [
            "500 SMS por mes total",
            "Recordatorios automáticos",
            "Plantillas personalizadas",
            "Seguimiento de entrega"
          ],
          setupFee: 25,
          status: "available",
          monthlyLimit: 500,
          usageTracking: true,
          autoRenewalThreshold: 85
        },
        {
          id: "email-automation",
          name: "Email Marketing & Automation",
          description: "Marketing por email y automatización avanzada",
          category: "Marketing",
          sellingPrice: 20,
          features: [
            "Emails ilimitados",
            "Workflows automatizados",
            "Segmentación de clientes",
            "Análisis y reportes"
          ],
          setupFee: 35,
          status: "available",
          monthlyLimit: null, // Unlimited
          usageTracking: false,
          autoRenewalThreshold: null
        }
      ];
      
      // Mark services as active and add usage info
      const servicesWithStatus = servicesCatalog.map(service => {
        const activeService = activeServices.find(as => as.serviceId === service.id);
        if (activeService) {
          return {
            ...service,
            isActive: true,
            activatedAt: activeService.activatedAt,
            autoRenewal: activeService.autoRenewal,
            usagePercentage: activeService.usagePercentage || 0,
            usedAmount: activeService.usedAmount || 0,
            monthlyLimit: service.monthlyLimit,
            renewalThreshold: service.autoRenewalThreshold
          };
        }
        return service;
      });
      
      res.json({
        services: servicesWithStatus,
        activeServices: activeServices
      });
    } catch (error) {
      console.error("Error fetching store services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });
  
  // Get clinic count for pricing calculation
  app.get("/api/store/clinics-count/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      const clinics = await storage.getCompanyClinics(tenant.companyId);
      res.json({ count: clinics.length });
    } catch (error) {
      console.error("Error fetching clinics count:", error);
      res.status(500).json({ error: "Failed to fetch clinics count" });
    }
  });
  
  // Create payment intent for service purchase
  app.post("/api/store/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { serviceId, tenantId } = req.body;
      
      if (!serviceId || !tenantId) {
        return res.status(400).json({ error: "Service ID and Tenant ID are required" });
      }
      
      // Find the service in catalog
      const servicesCatalog = [
        {
          id: "whatsapp-integration",
          sellingPrice: 40,
          setupFee: 0
        },
        {
          id: "sms-notifications",
          sellingPrice: 15,
          setupFee: 25
        },
        {
          id: "email-automation",
          sellingPrice: 20,
          setupFee: 35
        }
      ];
      
      const service = servicesCatalog.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      // For now, return a mock client secret
      // In production, you would integrate with Stripe here
      const totalAmount = service.sellingPrice + service.setupFee;
      
      res.json({
        clientSecret: `pi_mock_${serviceId}_${Date.now()}`,
        amount: totalAmount,
        currency: 'usd',
        serviceId: serviceId
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });
  
  // Toggle auto-renewal for a service
  app.post("/api/store/toggle-auto-renewal", isAuthenticated, async (req, res) => {
    try {
      const { serviceId, tenantId, autoRenewal } = req.body;
      
      if (!serviceId || !tenantId) {
        return res.status(400).json({ error: "Service ID and Tenant ID are required" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      // Update auto-renewal setting
      await storage.updateServiceAutoRenewal(tenant.companyId, serviceId, autoRenewal);
      
      res.json({ success: true, message: "Auto-renewal setting updated" });
    } catch (error) {
      console.error("Error toggling auto-renewal:", error);
      res.status(500).json({ error: "Failed to update auto-renewal setting" });
    }
  });
  
  // Get usage summary for a specific service
  app.get("/api/store/usage-summary/:tenantId/:serviceId", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, serviceId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      // Get usage data for the service
      const usageData = await storage.getServiceUsageData(tenant.companyId, serviceId);
      
      if (!usageData) {
        // Return default usage data if service is not active
        const serviceDefaults: Record<string, { limit: number | null }> = {
          "whatsapp-integration": { limit: 1000 },
          "sms-notifications": { limit: 500 },
          "email-automation": { limit: null } // Unlimited
        };
        
        const defaultLimit = serviceDefaults[serviceId]?.limit || 1000;
        return res.json({
          used: 0,
          limit: defaultLimit,
          percentage: 0
        });
      }
      
      res.json({
        used: usageData.used || 0,
        limit: usageData.limit || 1000,
        percentage: usageData.percentage || 0
      });
    } catch (error) {
      console.error("Error fetching usage summary:", error);
      res.status(500).json({ error: "Failed to fetch usage summary" });
    }
  });

  const httpServer = createServer(app);
  // Van Cage Management API
  app.get('/api/van-cages/:vanId', isAuthenticated, async (req, res) => {
    try {
      const { vanId } = req.params;
      const cages = await storage.getVanCages(vanId);
      res.json(cages);
    } catch (error) {
      console.error("Error fetching van cages:", error);
      res.status(500).json({ message: "Failed to fetch van cages" });
    }
  });

  app.post('/api/van-cages', isAuthenticated, async (req, res) => {
    try {
      const cageData = req.body;
      const cage = await storage.createVanCage(cageData);
      
      // Update van total cages count
      const cages = await storage.getVanCages(cage.vanId);
      await storage.updateVan(cage.vanId, { totalCages: cages.length });
      
      res.json(cage);
    } catch (error) {
      console.error("Error creating van cage:", error);
      res.status(500).json({ message: "Failed to create van cage" });
    }
  });

  app.patch('/api/van-cages/:cageId', isAuthenticated, async (req, res) => {
    try {
      const { cageId } = req.params;
      const updates = req.body;
      const cage = await storage.updateVanCage(cageId, updates);
      res.json(cage);
    } catch (error) {
      console.error("Error updating van cage:", error);
      res.status(500).json({ message: "Failed to update van cage" });
    }
  });

  app.delete('/api/van-cages/:cageId', isAuthenticated, async (req, res) => {
    try {
      const { cageId } = req.params;
      const cage = await storage.getVanCage(cageId);
      if (!cage) {
        return res.status(404).json({ message: "Van cage not found" });
      }
      
      await storage.deleteVanCage(cageId);
      
      // Update van total cages count
      const remainingCages = await storage.getVanCages(cage.vanId);
      await storage.updateVan(cage.vanId, { totalCages: remainingCages.length });
      
      res.json({ success: true, message: "Van cage deleted successfully" });
    } catch (error) {
      console.error("Error deleting van cage:", error);
      res.status(500).json({ message: "Failed to delete van cage" });
    }
  });

  // Cage Assignment API
  app.post('/api/cage-assignments', isAuthenticated, async (req, res) => {
    try {
      const assignmentData = req.body;
      const assignment = await storage.createCageAssignment(assignmentData);
      
      // Update cage occupancy status
      await storage.updateVanCage(assignmentData.cageId, {
        isOccupied: true,
        occupantPetId: assignmentData.petId
      });
      
      res.json(assignment);
    } catch (error) {
      console.error("Error creating cage assignment:", error);
      res.status(500).json({ message: "Failed to create cage assignment" });
    }
  });

  app.patch('/api/cage-assignments/:assignmentId/unassign', isAuthenticated, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const assignment = await storage.getCageAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Cage assignment not found" });
      }
      
      // Mark assignment as unassigned
      await storage.updateCageAssignment(assignmentId, {
        unassignedAt: new Date()
      });
      
      // Update cage occupancy status
      await storage.updateVanCage(assignment.cageId, {
        isOccupied: false,
        occupantPetId: null
      });
      
      res.json({ success: true, message: "Pet unassigned from cage successfully" });
    } catch (error) {
      console.error("Error unassigning cage:", error);
      res.status(500).json({ message: "Failed to unassign cage" });
    }
  });

  // Follow-up Tasks API Endpoints
  app.get('/api/follow-up-tasks/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { status, priority, taskType } = req.query;
      
      // Build filter conditions
      const filters: any = { tenantId };
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (taskType) filters.taskType = taskType;
      
      const tasks = await storage.getFollowUpTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching follow-up tasks:", error);
      res.status(500).json({ message: "Failed to fetch follow-up tasks" });
    }
  });

  app.post('/api/follow-up-tasks', isAuthenticated, async (req, res) => {
    try {
      const taskData = req.body;
      const newTask = await storage.createFollowUpTask(taskData);
      res.json(newTask);
    } catch (error) {
      console.error("Error creating follow-up task:", error);
      res.status(500).json({ message: "Failed to create follow-up task" });
    }
  });

  app.patch('/api/follow-up-tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const { taskId } = req.params;
      const updates = req.body;
      const updatedTask = await storage.updateFollowUpTask(taskId, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating follow-up task:", error);
      res.status(500).json({ message: "Failed to update follow-up task" });
    }
  });

  app.patch('/api/follow-up-tasks/:taskId/complete', isAuthenticated, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { notes, completedBy } = req.body;
      
      const updatedTask = await storage.updateFollowUpTask(taskId, {
        status: 'completed',
        completedBy,
        completedAt: new Date(),
        notes
      });
      res.json(updatedTask);
    } catch (error) {
      console.error("Error completing follow-up task:", error);
      res.status(500).json({ message: "Failed to complete follow-up task" });
    }
  });

  app.delete('/api/follow-up-tasks/:taskId', isAuthenticated, async (req, res) => {
    try {
      const { taskId } = req.params;
      await storage.deleteFollowUpTask(taskId);
      res.json({ message: "Follow-up task deleted successfully" });
    } catch (error) {
      console.error("Error deleting follow-up task:", error);
      res.status(500).json({ message: "Failed to delete follow-up task" });
    }
  });

  // Auto-generate follow-up tasks based on incomplete records
  app.post('/api/follow-up-tasks/auto-generate/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const generatedTasks = await storage.generateFollowUpTasks(tenantId);
      res.json({
        success: true,
        generated: generatedTasks.length,
        tasks: generatedTasks
      });
    } catch (error) {
      console.error("Error auto-generating follow-up tasks:", error);
      res.status(500).json({ message: "Failed to auto-generate follow-up tasks" });
    }
  });

  return httpServer;
}