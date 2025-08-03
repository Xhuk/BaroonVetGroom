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
  fraccionamientos,
  deliveryRoutes,
  deliveryStops,
  services,
  inventoryItems,
  inventoryTransactions,
  payments,
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
  type Fraccionamiento,
  type DeliveryRoute,
  type DeliveryStop,
  type Service,
  type InventoryItem,
  type InventoryTransaction,
  type Payment,
  type InsertCompany,
  type InsertTenant,
  type InsertRoom,
  type InsertStaff,
  type InsertClient,
  type InsertPet,
  type InsertAppointment,
  type InsertFraccionamiento,
  type InsertDeliveryRoute,
  type InsertDeliveryStop,
  type InsertService,
  type InsertInventoryItem,
  type InsertInventoryTransaction,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  getTenantsForCompany(companyId: string): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  // User-Tenant operations
  getUserTenants(userId: string): Promise<UserTenant[]>;
  getUserTenantByTenant(userId: string, tenantId: string): Promise<UserTenant | undefined>;
  createUserTenant(userTenant: { userId: string; tenantId: string; role: string }): Promise<UserTenant>;
  
  // Room operations
  getRoomsForTenant(tenantId: string): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room>;
  
  // Staff operations
  getStaffForTenant(tenantId: string): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  
  // Client operations
  getClientsForTenant(tenantId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Pet operations
  getPetsForClient(clientId: string): Promise<Pet[]>;
  getPetsForTenant(tenantId: string): Promise<Pet[]>;
  getPet(id: string): Promise<Pet | undefined>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Appointment operations
  getAppointmentsForTenant(tenantId: string, startDate?: string, endDate?: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  
  // Service operations
  getServicesForTenant(tenantId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Inventory operations
  getInventoryItemsForTenant(tenantId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  
  getInventoryTransactionsForTenant(tenantId: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  
  // Payment operations
  getPaymentsForTenant(tenantId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Fraccionamiento operations
  getFraccionamientosForTenant(tenantId: string): Promise<Fraccionamiento[]>;
  getFraccionamiento(id: string): Promise<Fraccionamiento | undefined>;
  createFraccionamiento(fraccionamiento: InsertFraccionamiento): Promise<Fraccionamiento>;
  
  // Delivery operations
  getDeliveryRoutesForTenant(tenantId: string, startDate?: string, endDate?: string): Promise<DeliveryRoute[]>;
  getDeliveryRoute(id: string): Promise<DeliveryRoute | undefined>;
  createDeliveryRoute(route: InsertDeliveryRoute): Promise<DeliveryRoute>;
  updateDeliveryRoute(id: string, route: Partial<InsertDeliveryRoute>): Promise<DeliveryRoute>;
  
  getDeliveryStopsForRoute(routeId: string): Promise<DeliveryStop[]>;
  createDeliveryStop(stop: InsertDeliveryStop): Promise<DeliveryStop>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
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
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return tenant;
  }

  async getTenantsForCompany(companyId: string): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.companyId, companyId));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  // User-Tenant operations
  async getUserTenants(userId: string): Promise<UserTenant[]> {
    return await db.select().from(userTenants).where(eq(userTenants.userId, userId));
  }

  async getUserTenantByTenant(userId: string, tenantId: string): Promise<UserTenant | undefined> {
    const [userTenant] = await db
      .select()
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
    return userTenant;
  }

  async createUserTenant(userTenant: { userId: string; tenantId: string; role: string }): Promise<UserTenant> {
    const [newUserTenant] = await db.insert(userTenants).values(userTenant).returning();
    return newUserTenant;
  }

  // Room operations
  async getRoomsForTenant(tenantId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(and(eq(rooms.tenantId, tenantId), eq(rooms.isActive, true)));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db.update(rooms).set(room).where(eq(rooms.id, id)).returning();
    return updatedRoom;
  }

  // Staff operations
  async getStaffForTenant(tenantId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  // Client operations
  async getClientsForTenant(tenantId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.tenantId, tenantId));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  // Pet operations
  async getPetsForClient(clientId: string): Promise<Pet[]> {
    return await db.select().from(pets).where(eq(pets.clientId, clientId));
  }

  async getPet(id: string): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet;
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const [newPet] = await db.insert(pets).values(pet).returning();
    return newPet;
  }

  // Appointment operations
  async getAppointmentsForTenant(tenantId: string, startDate?: string, endDate?: string): Promise<Appointment[]> {
    if (startDate && endDate) {
      return await db.select().from(appointments).where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.scheduledDate, startDate),
          lte(appointments.scheduledDate, endDate)
        )
      ).orderBy(asc(appointments.scheduledDate), asc(appointments.scheduledTime));
    }
    
    return await db.select().from(appointments).where(eq(appointments.tenantId, tenantId))
      .orderBy(asc(appointments.scheduledDate), asc(appointments.scheduledTime));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Fraccionamiento operations
  async getFraccionamientosForTenant(tenantId: string): Promise<Fraccionamiento[]> {
    return await db.select().from(fraccionamientos).where(and(eq(fraccionamientos.tenantId, tenantId), eq(fraccionamientos.isActive, true)));
  }

  async getFraccionamiento(id: string): Promise<Fraccionamiento | undefined> {
    const [fraccionamiento] = await db.select().from(fraccionamientos).where(eq(fraccionamientos.id, id));
    return fraccionamiento;
  }

  async createFraccionamiento(fraccionamiento: InsertFraccionamiento): Promise<Fraccionamiento> {
    const [newFraccionamiento] = await db.insert(fraccionamientos).values(fraccionamiento).returning();
    return newFraccionamiento;
  }

  // Delivery operations
  async getDeliveryRoutesForTenant(tenantId: string, startDate?: string, endDate?: string): Promise<DeliveryRoute[]> {
    if (startDate && endDate) {
      return await db.select().from(deliveryRoutes).where(
        and(
          eq(deliveryRoutes.tenantId, tenantId),
          gte(deliveryRoutes.scheduledDate, startDate),
          lte(deliveryRoutes.scheduledDate, endDate)
        )
      ).orderBy(asc(deliveryRoutes.scheduledDate));
    }
    
    return await db.select().from(deliveryRoutes).where(eq(deliveryRoutes.tenantId, tenantId))
      .orderBy(asc(deliveryRoutes.scheduledDate));
  }

  async getDeliveryRoute(id: string): Promise<DeliveryRoute | undefined> {
    const [route] = await db.select().from(deliveryRoutes).where(eq(deliveryRoutes.id, id));
    return route;
  }

  async createDeliveryRoute(route: InsertDeliveryRoute): Promise<DeliveryRoute> {
    const [newRoute] = await db.insert(deliveryRoutes).values(route).returning();
    return newRoute;
  }

  async updateDeliveryRoute(id: string, route: Partial<InsertDeliveryRoute>): Promise<DeliveryRoute> {
    const [updatedRoute] = await db.update(deliveryRoutes).set(route).where(eq(deliveryRoutes.id, id)).returning();
    return updatedRoute;
  }

  async getDeliveryStopsForRoute(routeId: string): Promise<DeliveryStop[]> {
    return await db.select().from(deliveryStops).where(eq(deliveryStops.routeId, routeId)).orderBy(asc(deliveryStops.stopOrder));
  }

  async createDeliveryStop(stop: InsertDeliveryStop): Promise<DeliveryStop> {
    const [newStop] = await db.insert(deliveryStops).values(stop).returning();
    return newStop;
  }

  // Missing Pet operations
  async getPetsForTenant(tenantId: string): Promise<Pet[]> {
    return await db.select().from(pets).where(eq(pets.tenantId, tenantId));
  }

  // Service operations
  async getServicesForTenant(tenantId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.tenantId, tenantId));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  // Inventory operations
  async getInventoryItemsForTenant(tenantId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async getInventoryTransactionsForTenant(tenantId: string): Promise<InventoryTransaction[]> {
    return await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.tenantId, tenantId))
      .orderBy(desc(inventoryTransactions.createdAt));
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [newTransaction] = await db.insert(inventoryTransactions).values(transaction).returning();
    return newTransaction;
  }

  // Payment operations
  async getPaymentsForTenant(tenantId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }
}

export const storage = new DatabaseStorage();
