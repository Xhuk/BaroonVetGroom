import {
  users,
  companies,
  tenants,
  userTenants,
  rooms,
  staff,
  clients,
  pets,
  appointments,
  services,
  roles,
  systemRoles,
  userSystemRoles,
  userCompanies,
  tempSlotReservations,
  webhookErrorLogs,
  webhookMonitoring,
  vans,
  routeOptimizationConfig,
  savedRoutes,
  betaFeatureUsage,
  deliveryTracking,
  deliveryAlerts,
  driverCheckIns,
  type User,
  type UpsertUser,
  type Company,
  type Tenant,
  type UserTenant,
  type Room,
  type Staff,
  type Client,
  type Pet,
  type Appointment,
  type Service,
  type Role,
  type InsertCompany,
  type InsertTenant,
  type InsertRoom,
  type InsertStaff,
  type InsertClient,
  type InsertPet,
  type InsertAppointment,
  type InsertService,
  type InsertRole,
  type TempSlotReservation,
  type InsertTempSlotReservation,
  type WebhookErrorLog,
  type InsertWebhookErrorLog,
  type WebhookMonitoring,
  type InsertWebhookMonitoring,
  type Van,
  type InsertVan,
  type RouteOptimizationConfig,
  type InsertRouteOptimizationConfig,
  type DeliveryTracking,
  type InsertDeliveryTracking,
  type DeliveryAlert,
  type InsertDeliveryAlert,
  type DriverCheckIn,
  type InsertDriverCheckIn,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, lt, gte, desc, asc, lte, inArray, or, isNull, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Tenant operations
  getTenants(): Promise<Tenant[]>;
  getUserTenants(userId: string): Promise<UserTenant[]>;
  getTenant(tenantId: string): Promise<Tenant | undefined>;
  
  // Van operations
  getVan(vanId: string): Promise<Van | undefined>;
  getVansByTenant(tenantId: string): Promise<Van[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  // Room operations
  getRooms(tenantId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(roomId: string, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;
  
  // Staff operations
  getStaff(tenantId: string): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(staffId: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(staffId: string): Promise<void>;
  reassignStaffAppointments(oldStaffId: string, newStaffId: string): Promise<void>;
  
  // Client operations
  getClients(tenantId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  findCustomerByInfo(name: string, phone: string, email: string): Promise<any>;
  
  // Pet operations
  getPets(clientId: string): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Appointment operations
  getAppointments(tenantId: string, date?: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(appointmentId: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(appointmentId: string): Promise<void>;
  getAvailableSlots(tenantId: string, date: string, serviceId: string): Promise<string[]>;
  checkAvailability(tenantId: string, date: string, time: string, serviceId: string): Promise<{ available: boolean; alternativeSlots: string[] }>;
  reserveSlot(reservation: InsertTempSlotReservation): Promise<TempSlotReservation>;
  releaseSlot(reservationId: string): Promise<void>;
  cleanupExpiredReservations(): Promise<void>;
  getTenantReservationTimeout(tenantId: string): Promise<number>;
  getTenantBusinessHours(tenantId: string): Promise<{ openTime: string; closeTime: string; timeSlotDuration: number }>;
  updateTenantBusinessHours(tenantId: string, hours: { openTime: string; closeTime: string; timeSlotDuration: number; reservationTimeout: number }): Promise<Tenant>;
  getClientByPhone(tenantId: string, phone: string): Promise<Client | undefined>;
  
  // Service operations
  getServices(tenantId: string): Promise<Service[]>;
  getService(serviceId: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(serviceId: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(serviceId: string): Promise<void>;
  
  // Role operations
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(roleId: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;
  
  // RBAC operations
  getSystemRoles(): Promise<any[]>;
  getRolesByCompany(companyId: string): Promise<any[]>;
  getUsersByCompany(companyId: string): Promise<any[]>;
  getUserAssignments(companyId: string): Promise<any[]>;
  assignSystemRole(userId: string, systemRoleId: string): Promise<any>;
  
  // Webhook monitoring operations
  logWebhookError(errorLog: InsertWebhookErrorLog): Promise<WebhookErrorLog>;
  getWebhookErrorLogs(tenantId?: string, limit?: number): Promise<WebhookErrorLog[]>;
  updateWebhookErrorStatus(logId: string, status: string, resolvedAt?: Date): Promise<void>;
  getWebhookMonitoring(tenantId: string, webhookType: string): Promise<WebhookMonitoring | undefined>;
  upsertWebhookMonitoring(monitoring: InsertWebhookMonitoring): Promise<WebhookMonitoring>;
  updateWebhookMonitoringStatus(tenantId: string, webhookType: string, status: string, lastFailure?: Date): Promise<void>;
  getFailedWebhooksForRetry(): Promise<WebhookMonitoring[]>;
  incrementWebhookRetry(tenantId: string, webhookType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  // Tenant operations
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getUserTenants(userId: string): Promise<UserTenant[]> {
    const result = await db
      .select({
        id: userTenants.id,
        userId: userTenants.userId,
        tenantId: userTenants.tenantId,
        roleId: userTenants.roleId,
        isActive: userTenants.isActive,
        createdAt: userTenants.createdAt,
        tenant: {
          id: tenants.id,
          name: tenants.name,
          subdomain: tenants.subdomain
        }
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId));
    
    return result;
  }

  async getTenant(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  // Room operations
  async getRooms(tenantId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.tenantId, tenantId));
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(roomId: string, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db.update(rooms)
      .set(room)
      .where(eq(rooms.id, roomId))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, roomId));
  }

  // Staff operations
  async getStaff(tenantId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.tenantId, tenantId));
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffMember).returning();
    return newStaff;
  }

  async updateStaff(staffId: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set(staffData)
      .where(eq(staff.id, staffId))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(staffId: string): Promise<void> {
    try {
      await db.delete(staff).where(eq(staff.id, staffId));
    } catch (error: any) {
      if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error("APPOINTMENTS_ASSIGNED");
      }
      throw error;
    }
  }

  async reassignStaffAppointments(oldStaffId: string, newStaffId: string): Promise<void> {
    await db
      .update(appointments)
      .set({ staffId: newStaffId })
      .where(eq(appointments.staffId, oldStaffId));
  }

  // Client operations
  async getClients(tenantId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.tenantId, tenantId));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async findCustomerByInfo(name: string, phone: string, email: string): Promise<any> {
    // Search for existing customer/client with matching info
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(sql`LOWER(${clients.name}) = LOWER(${name}) OR ${clients.phone} = ${phone} OR LOWER(${clients.email}) = LOWER(${email})`);
    
    if (!existingClient) {
      return null;
    }

    // Get pets for this client
    const clientPets = await db
      .select()
      .from(pets)
      .where(eq(pets.clientId, existingClient.id));

    return {
      ...existingClient,
      pets: clientPets
    };
  }

  // Pet operations
  async getPets(clientId: string): Promise<Pet[]> {
    return await db.select().from(pets).where(eq(pets.clientId, clientId));
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const [newPet] = await db.insert(pets).values(pet).returning();
    return newPet;
  }

  // Appointment operations
  async getAppointments(tenantId: string, date?: string): Promise<any[]> {
    // First get basic appointments
    let appointmentsQuery = db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId));

    if (date) {
      appointmentsQuery = appointmentsQuery.where(and(eq(appointments.tenantId, tenantId), eq(appointments.scheduledDate, date)));
    }

    const appointmentResults = await appointmentsQuery;

    // Manually join client and pet data
    const enrichedAppointments = await Promise.all(
      appointmentResults.map(async (appointment) => {
        // Get client data
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, appointment.clientId));

        // Get pet data
        const [pet] = await db
          .select()
          .from(pets)
          .where(eq(pets.id, appointment.petId));

        return {
          ...appointment,
          client: client || null,
          pet: pet || null,
        };
      })
    );

    return enrichedAppointments;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(appointmentId: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointment)
      .where(eq(appointments.id, appointmentId))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, appointmentId));
  }

  async getAvailableSlots(tenantId: string, date: string, serviceId: string): Promise<string[]> {
    // Get the service duration
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) return [];

    // Get existing appointments for the date
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId));

    // Generate time slots from 8:00 AM to 6:00 PM
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    // Filter out slots that conflict with existing appointments
    const availableSlots = slots.filter(slot => {
      const slotTime = new Date(`${date}T${slot}:00`);
      const slotEndTime = new Date(slotTime.getTime() + service.duration * 60000);

      return !existingAppointments.some(apt => {
        if (apt.scheduledDate !== date) return false;
        
        const aptTime = new Date(`${apt.scheduledDate}T${apt.scheduledTime}:00`);
        const aptEndTime = new Date(aptTime.getTime() + (apt.duration || 30) * 60000);

        // Check for time overlap
        return slotTime < aptEndTime && slotEndTime > aptTime;
      });
    });

    return availableSlots;
  }

  async checkAvailability(tenantId: string, date: string, time: string, serviceId: string): Promise<{ available: boolean; alternativeSlots: string[] }> {
    // Get the service duration
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) return { available: false, alternativeSlots: [] };

    // Check if requested time is available
    const requestedSlot = time;
    const availableSlots = await this.getAvailableSlots(tenantId, date, serviceId);
    const isAvailable = availableSlots.includes(requestedSlot);

    return {
      available: isAvailable,
      alternativeSlots: isAvailable ? [requestedSlot] : availableSlots.slice(0, 6) // Show up to 6 alternatives
    };
  }

  async reserveSlot(reservation: any): Promise<any> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Clean up expired reservations first
    await db.delete(tempSlotReservations)
      .where(sql`expires_at < ${new Date()}`);
    
    // Create new reservation
    const [newReservation] = await db
      .insert(tempSlotReservations)
      .values({
        ...reservation,
        expiresAt
      })
      .returning();
      
    return newReservation;
  }

  async getClientByPhone(tenantId: string, phone: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(sql`${clients.tenantId} = ${tenantId} AND ${clients.phone} = ${phone}`);
    return client;
  }

  // Service operations
  async getServices(tenantId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.tenantId, tenantId));
  }

  async getService(serviceId: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(serviceId: string, service: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db.update(services)
      .set(service)
      .where(eq(services.id, serviceId))
      .returning();
    return updatedService;
  }

  async deleteService(serviceId: string): Promise<void> {
    await db.delete(services).where(eq(services.id, serviceId));
  }

  // Role operations
  async getRoles(): Promise<Role[]> {
    const result = await db.select().from(roles);
    return result;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(roleId: string, role: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db.update(roles)
      .set(role)
      .where(eq(roles.id, roleId))
      .returning();
    return updatedRole;
  }

  async deleteRole(roleId: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, roleId));
  }

  // Slot reservation operations
  async reserveSlot(reservation: InsertTempSlotReservation): Promise<TempSlotReservation> {
    const [newReservation] = await db.insert(tempSlotReservations).values(reservation).returning();
    return newReservation;
  }

  async releaseSlot(reservationId: string): Promise<void> {
    await db.delete(tempSlotReservations).where(eq(tempSlotReservations.id, reservationId));
  }

  async cleanupExpiredReservations(): Promise<void> {
    const now = new Date();
    await db.delete(tempSlotReservations).where(lt(tempSlotReservations.expiresAt, now));
  }

  async getTenantReservationTimeout(tenantId: string): Promise<number> {
    const tenant = await this.getTenant(tenantId);
    return tenant?.reservationTimeout ?? 5; // Default 5 minutes
  }

  async getTenantBusinessHours(tenantId: string): Promise<{ openTime: string; closeTime: string; timeSlotDuration: number }> {
    const tenant = await this.getTenant(tenantId);
    return {
      openTime: tenant?.openTime ?? "08:00",
      closeTime: tenant?.closeTime ?? "18:00", 
      timeSlotDuration: tenant?.timeSlotDuration ?? 30
    };
  }

  async updateTenantBusinessHours(tenantId: string, hours: { openTime: string; closeTime: string; timeSlotDuration: number; reservationTimeout: number }): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        timeSlotDuration: hours.timeSlotDuration,
        reservationTimeout: hours.reservationTimeout,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId))
      .returning();
    return tenant;
  }

  // Webhook monitoring operations
  async logWebhookError(errorLog: InsertWebhookErrorLog): Promise<WebhookErrorLog> {
    const [log] = await db.insert(webhookErrorLogs).values(errorLog).returning();
    return log;
  }

  async getWebhookErrorLogs(tenantId?: string, limit: number = 100): Promise<WebhookErrorLog[]> {
    let query = db.select().from(webhookErrorLogs);
    
    if (tenantId) {
      query = query.where(eq(webhookErrorLogs.tenantId, tenantId));
    }
    
    return query.orderBy(sql`${webhookErrorLogs.createdAt} DESC`).limit(limit);
  }

  async updateWebhookErrorStatus(logId: string, status: string, resolvedAt?: Date): Promise<void> {
    await db
      .update(webhookErrorLogs)
      .set({
        status,
        resolvedAt,
        updatedAt: new Date()
      })
      .where(eq(webhookErrorLogs.id, logId));
  }

  async getWebhookMonitoring(tenantId: string, webhookType: string): Promise<WebhookMonitoring | undefined> {
    const [monitoring] = await db
      .select()
      .from(webhookMonitoring)
      .where(and(
        eq(webhookMonitoring.tenantId, tenantId),
        eq(webhookMonitoring.webhookType, webhookType)
      ));
    return monitoring;
  }

  async upsertWebhookMonitoring(monitoring: InsertWebhookMonitoring): Promise<WebhookMonitoring> {
    const [result] = await db
      .insert(webhookMonitoring)
      .values(monitoring)
      .onConflictDoUpdate({
        target: [webhookMonitoring.tenantId, webhookMonitoring.webhookType],
        set: {
          ...monitoring,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  async updateWebhookMonitoringStatus(tenantId: string, webhookType: string, status: string, lastFailure?: Date): Promise<void> {
    const existing = await this.getWebhookMonitoring(tenantId, webhookType);
    
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'healthy') {
      updateData.lastSuccessAt = new Date();
      updateData.consecutiveFailures = 0;
      updateData.nextRetryAt = null;
    } else if (lastFailure) {
      updateData.lastFailureAt = lastFailure;
      updateData.consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;
      
      // Calculate next retry using exponential backoff
      const baseInterval = existing?.retryIntervalMinutes || 5;
      const maxInterval = existing?.maxRetryIntervalMinutes || 60;
      const nextInterval = Math.min(baseInterval * Math.pow(2, updateData.consecutiveFailures - 1), maxInterval);
      
      updateData.retryIntervalMinutes = nextInterval;
      updateData.nextRetryAt = new Date(Date.now() + nextInterval * 60 * 1000);
    }

    await db
      .update(webhookMonitoring)
      .set(updateData)
      .where(and(
        eq(webhookMonitoring.tenantId, tenantId),
        eq(webhookMonitoring.webhookType, webhookType)
      ));
  }

  async getFailedWebhooksForRetry(): Promise<WebhookMonitoring[]> {
    const now = new Date();
    return await db
      .select()
      .from(webhookMonitoring)
      .where(and(
        eq(webhookMonitoring.isAutoRetryEnabled, true),
        sql`${webhookMonitoring.status} IN ('degraded', 'down')`,
        lt(webhookMonitoring.nextRetryAt, now)
      ));
  }

  async incrementWebhookRetry(tenantId: string, webhookType: string): Promise<void> {
    await db
      .update(webhookMonitoring)
      .set({
        lastRetryAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(webhookMonitoring.tenantId, tenantId),
        eq(webhookMonitoring.webhookType, webhookType)
      ));
  }

  // Van management operations
  async getVans(tenantId: string): Promise<Van[]> {
    const results = await db
      .select()
      .from(vans)
      .where(eq(vans.tenantId, tenantId))
      .orderBy(vans.createdAt);
    return results;
  }

  async createVan(vanData: InsertVan): Promise<Van> {
    const [newVan] = await db
      .insert(vans)
      .values({
        ...vanData,
        id: undefined, // Let DB generate ID
      })
      .returning();
    return newVan;
  }

  async updateVan(vanId: string, updates: Partial<InsertVan>): Promise<Van> {
    const [updatedVan] = await db
      .update(vans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(vans.id, vanId))
      .returning();
    return updatedVan;
  }

  async deleteVan(vanId: string): Promise<void> {
    await db
      .delete(vans)
      .where(eq(vans.id, vanId));
  }

  // Route optimization configuration operations
  async getRouteOptimizationConfig(companyId: string): Promise<RouteOptimizationConfig | undefined> {
    const [config] = await db
      .select()
      .from(routeOptimizationConfig)
      .where(eq(routeOptimizationConfig.companyId, companyId));
    return config;
  }

  async createRouteOptimizationConfig(configData: InsertRouteOptimizationConfig): Promise<RouteOptimizationConfig> {
    const [newConfig] = await db
      .insert(routeOptimizationConfig)
      .values({
        ...configData,
        id: undefined, // Let DB generate ID
      })
      .onConflictDoUpdate({
        target: routeOptimizationConfig.companyId,
        set: {
          ...configData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newConfig;
  }

  async updateRouteOptimizationConfig(companyId: string, updates: Partial<InsertRouteOptimizationConfig>): Promise<RouteOptimizationConfig> {
    const [updatedConfig] = await db
      .update(routeOptimizationConfig)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(routeOptimizationConfig.companyId, companyId))
      .returning();
    return updatedConfig;
  }

  // Van operations
  async getVan(vanId: string): Promise<Van | undefined> {
    const [van] = await db.select().from(vans).where(eq(vans.id, vanId));
    return van;
  }

  async getVansByTenant(tenantId: string): Promise<Van[]> {
    const vansData = await db.select().from(vans).where(eq(vans.tenantId, tenantId));
    return vansData;
  }

  // Route optimization caching
  async getSavedRoute(tenantId: string, date: string, appointmentIds: string[]): Promise<any> {
    const routeHash = this.generateRouteHash(appointmentIds);
    const [savedRoute] = await db
      .select()
      .from(savedRoutes)
      .where(eq(savedRoutes.tenantId, tenantId))
      .where(eq(savedRoutes.date, date))
      .where(eq(savedRoutes.routeHash, routeHash));
    return savedRoute;
  }

  async saveOptimizedRoute(tenantId: string, date: string, appointmentIds: string[], optimizedRoute: any, stats: any): Promise<void> {
    const routeHash = this.generateRouteHash(appointmentIds);
    await db
      .insert(savedRoutes)
      .values({
        tenantId,
        date,
        appointmentIds,
        optimizedRoute,
        routeHash,
        distanceKm: stats.totalDistance?.toString(),
        estimatedDurationMinutes: stats.totalDuration,
      })
      .onConflictDoUpdate({
        target: [savedRoutes.tenantId, savedRoutes.date, savedRoutes.routeHash],
        set: {
          optimizedRoute,
          distanceKm: stats.totalDistance?.toString(),
          estimatedDurationMinutes: stats.totalDuration,
          updatedAt: new Date(),
        },
      });
  }

  private generateRouteHash(appointmentIds: string[]): string {
    return appointmentIds.sort().join('|');
  }

  // BETA feature tracking
  async trackBetaFeatureUsage(featureName: string, companyId: string, tenantId?: string, userId?: string, metadata?: any): Promise<void> {
    await db
      .insert(betaFeatureUsage)
      .values({
        featureName,
        companyId,
        tenantId,
        userId,
        metadata,
      })
      .onConflictDoUpdate({
        target: [betaFeatureUsage.featureName, betaFeatureUsage.companyId, betaFeatureUsage.tenantId],
        set: {
          usageCount: sql`${betaFeatureUsage.usageCount} + 1`,
          lastUsedAt: new Date(),
          metadata,
        },
      });
  }

  async getBetaFeatureStats(): Promise<any[]> {
    return await db
      .select({
        featureName: betaFeatureUsage.featureName,
        companyId: betaFeatureUsage.companyId,
        companyName: companies.name,
        totalUsage: sql<number>`sum(${betaFeatureUsage.usageCount})`,
        lastUsed: sql<Date>`max(${betaFeatureUsage.lastUsedAt})`,
        uniqueTenants: sql<number>`count(distinct ${betaFeatureUsage.tenantId})`,
        uniqueUsers: sql<number>`count(distinct ${betaFeatureUsage.userId})`,
      })
      .from(betaFeatureUsage)
      .leftJoin(companies, eq(betaFeatureUsage.companyId, companies.id))
      .groupBy(betaFeatureUsage.featureName, betaFeatureUsage.companyId, companies.name);
  }

  // Check if delivery tracking is enabled for company/tenant
  async isDeliveryTrackingEnabled(tenantId: string): Promise<boolean> {
    const [tenant] = await db
      .select({
        tenantEnabled: tenants.deliveryTrackingEnabled,
        companyEnabled: companies.deliveryTrackingEnabled,
      })
      .from(tenants)
      .leftJoin(companies, eq(tenants.companyId, companies.id))
      .where(eq(tenants.id, tenantId));

    return tenant?.tenantEnabled || tenant?.companyEnabled || false;
  }

  // Company delivery tracking management
  async updateCompanyDeliveryTracking(companyId: string, enabled: boolean): Promise<void> {
    await db
      .update(companies)
      .set({ deliveryTrackingEnabled: enabled, updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  }

  async updateTenantDeliveryTracking(tenantId: string, enabled: boolean): Promise<void> {
    await db
      .update(tenants)
      .set({ deliveryTrackingEnabled: enabled, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
  }

  // Delivery tracking operations
  async getActiveDeliveryTracking(tenantId: string): Promise<DeliveryTracking[]> {
    const baseWhere = sql`status IN ('preparing', 'en_route', 'delayed', 'emergency')`;
    
    // If tenantId is provided, filter by it
    if (tenantId) {
      const activeDeliveries = await db
        .select()
        .from(deliveryTracking)
        .where(and(eq(deliveryTracking.tenantId, tenantId), baseWhere));
      return activeDeliveries;
    } else {
      const activeDeliveries = await db
        .select()
        .from(deliveryTracking)
        .where(baseWhere);
      return activeDeliveries;
    }
  }

  async createDeliveryTracking(trackingData: InsertDeliveryTracking): Promise<DeliveryTracking> {
    const [newTracking] = await db
      .insert(deliveryTracking)
      .values(trackingData)
      .returning();
    return newTracking;
  }

  async updateDeliveryTracking(trackingId: string, updates: Partial<InsertDeliveryTracking>): Promise<DeliveryTracking> {
    const [updatedTracking] = await db
      .update(deliveryTracking)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deliveryTracking.id, trackingId))
      .returning();
    return updatedTracking;
  }

  // Delivery alerts operations
  async getDeliveryAlerts(tenantId: string): Promise<DeliveryAlert[]> {
    const alerts = await db
      .select()
      .from(deliveryAlerts)
      .where(eq(deliveryAlerts.tenantId, tenantId))
      .orderBy(sql`created_at DESC`);
    return alerts;
  }

  async createDeliveryAlert(alertData: InsertDeliveryAlert): Promise<DeliveryAlert> {
    const [newAlert] = await db
      .insert(deliveryAlerts)
      .values(alertData)
      .returning();
    return newAlert;
  }

  async updateDeliveryAlert(alertId: string, updates: Partial<InsertDeliveryAlert>): Promise<DeliveryAlert> {
    const [updatedAlert] = await db
      .update(deliveryAlerts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deliveryAlerts.id, alertId))
      .returning();
    return updatedAlert;
  }

  async resolveDeliveryAlert(alertId: string, resolvedBy: string): Promise<DeliveryAlert> {
    const [resolvedAlert] = await db
      .update(deliveryAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        updatedAt: new Date(),
      })
      .where(eq(deliveryAlerts.id, alertId))
      .returning();
    return resolvedAlert;
  }

  // Driver check-ins operations
  async createDriverCheckIn(checkInData: InsertDriverCheckIn): Promise<DriverCheckIn> {
    const [newCheckIn] = await db
      .insert(driverCheckIns)
      .values(checkInData)
      .returning();
    return newCheckIn;
  }

  async getDriverCheckIns(deliveryTrackingId: string): Promise<DriverCheckIn[]> {
    const checkIns = await db
      .select()
      .from(driverCheckIns)
      .where(eq(driverCheckIns.deliveryTrackingId, deliveryTrackingId))
      .orderBy(sql`created_at DESC`);
    return checkIns;
  }

  async getDeliveryTracking(trackingId: string): Promise<DeliveryTracking | undefined> {
    const [tracking] = await db
      .select()
      .from(deliveryTracking)
      .where(eq(deliveryTracking.id, trackingId));
    return tracking;
  }

  // RBAC operations
  async getSystemRoles(): Promise<any[]> {
    return await db.select().from(systemRoles);
  }

  async getRolesByCompany(companyId: string): Promise<any[]> {
    return await db.select().from(roles).where(eq(roles.companyId, companyId));
  }

  async getUsersByCompany(companyId: string): Promise<any[]> {
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    }).from(users)
      .innerJoin(userCompanies, eq(users.id, userCompanies.userId))
      .where(eq(userCompanies.companyId, companyId));
  }

  async getUserAssignments(companyId: string): Promise<any[]> {
    return await db.select().from(userCompanies).where(eq(userCompanies.companyId, companyId));
  }

  async assignSystemRole(userId: string, systemRoleId: string): Promise<any> {
    const [assignment] = await db.insert(userSystemRoles).values({
      userId,
      systemRoleId,
      isActive: true,
    }).returning();
    return assignment;
  }

  async getAllTenantsWithCompany(): Promise<any[]> {
    return await db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        address: tenants.address,
        phone: tenants.phone,
        email: tenants.email,
        openTime: tenants.openTime,
        closeTime: tenants.closeTime,
        deliveryTrackingEnabled: tenants.deliveryTrackingEnabled,
        companyId: tenants.companyId,
        companyName: companies.name,
      })
      .from(tenants)
      .leftJoin(companies, eq(tenants.companyId, companies.id))
      .orderBy(companies.name, tenants.name);
  }

  async hasSystemRole(userId: string): Promise<boolean> {
    console.log('Checking system role for user ID:', userId);
    
    const result = await db
      .select({ count: sql`count(*)` })
      .from(userSystemRoles)
      .innerJoin(systemRoles, eq(userSystemRoles.systemRoleId, systemRoles.id))
      .where(
        and(
          eq(userSystemRoles.userId, userId),
          eq(userSystemRoles.isActive, true),
          eq(systemRoles.systemLevel, true)
        )
      );
    
    const count = parseInt(result[0].count as string);
    console.log('System role count for user:', count);
    
    return count > 0;
  }
}

export const storage = new DatabaseStorage();