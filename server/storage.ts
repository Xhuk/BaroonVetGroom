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
  tempSlotReservations,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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
  reserveSlot(reservation: any): Promise<any>;
  getClientByPhone(tenantId: string, phone: string): Promise<Client | undefined>;
  
  // Service operations
  getServices(tenantId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(serviceId: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(serviceId: string): Promise<void>;
  
  // Role operations
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(roleId: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;
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
        role: userTenants.role,
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
  async getAppointments(tenantId: string, date?: string): Promise<Appointment[]> {
    if (date) {
      return await db
        .select()
        .from(appointments)
        .where(eq(appointments.tenantId, tenantId));
    }
    
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId));
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
}

export const storage = new DatabaseStorage();