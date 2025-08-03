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
import { eq } from "drizzle-orm";

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
  
  // Pet operations
  getPets(clientId: string): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Appointment operations
  getAppointments(tenantId: string, date?: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  
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