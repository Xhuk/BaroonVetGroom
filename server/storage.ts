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
  slotReservations,
  webhookErrorLogs,
  webhookMonitoring,
  vans,
  vanCages,
  cageAssignments,
  routeOptimizationConfig,
  savedRoutes,
  betaFeatureUsage,
  deliveryTracking,
  deliveryAlerts,
  driverCheckIns,
  medicalRecords,
  medicalAppointments,
  medicalDocuments,
  invoiceQueue,
  staffRoomAssignments,
  prescriptions,
  vaccinationRecords,
  groomingRecords,
  petHealthProfiles,
  billingInvoices,
  companyBillingConfig,
  deliverySchedule,
  paymentGatewayConfig,
  billingQueue,
  subscriptionPlans,
  companySubscriptions,
  subscriptionPromotions,
  emailConfig,
  emailLogs,
  companyOnboarding,
  taxConfiguration,
  pendingInvoices,
  invoiceLineItems,
  deliveryConfig,
  inventoryItems,
  serviceActivations,
  serviceUsage,
  serviceRenewals,
  inventoryTransactions,
  sales,
  saleItems,
  salesOrders,
  salesOrderItems,
  externalServiceSubscriptions,
  followUpTasks,
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
  type SlotReservation,
  type InsertSlotReservation,
  type WebhookErrorLog,
  type InsertWebhookErrorLog,
  type WebhookMonitoring,
  type InsertWebhookMonitoring,
  type Van,
  type InsertVan,
  type VanCage,
  type InsertVanCage,
  type CageAssignment,
  type InsertCageAssignment,
  type RouteOptimizationConfig,
  type InsertRouteOptimizationConfig,
  type DeliveryTracking,
  type InsertDeliveryTracking,
  type DeliveryAlert,
  type InsertDeliveryAlert,
  type DriverCheckIn,
  type InsertDriverCheckIn,
  type MedicalRecord,
  type InsertMedicalRecord,
  type MedicalAppointment,
  type InsertMedicalAppointment,
  type MedicalDocument,
  type InsertMedicalDocument,
  type InvoiceQueue,
  type InsertInvoiceQueue,
  type StaffRoomAssignment,
  type InsertStaffRoomAssignment,
  type Prescription,
  type InsertPrescription,
  type VaccinationRecord,
  type InsertVaccinationRecord,
  type GroomingRecord,
  type InsertGroomingRecord,
  type PetHealthProfile,
  type InsertPetHealthProfile,
  type BillingInvoice,
  type InsertBillingInvoice,
  type CompanyBillingConfig,
  type InsertCompanyBillingConfig,
  type DeliverySchedule,
  type InsertDeliverySchedule,
  type PaymentGatewayConfig,
  type InsertPaymentGatewayConfig,
  type BillingQueue,
  type InsertBillingQueue,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type CompanySubscription,
  type InsertCompanySubscription,
  type SubscriptionPromotion,
  type InsertSubscriptionPromotion,
  type TaxConfiguration,
  type InsertTaxConfiguration,
  type PendingInvoice,
  type InsertPendingInvoice,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type DeliveryConfig,
  type InsertDeliveryConfig,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type SalesOrder,
  type InsertSalesOrder,
  type SalesOrderItem,
  type InsertSalesOrderItem,
  webhookIntegrations,
  type WebhookIntegration,
  type InsertWebhookIntegration,
  webhookLogs,
  type WebhookLog,
  type InsertWebhookLog,
  type EmailConfig,
  type InsertEmailConfig,
  type EmailLog,
  type InsertEmailLog,
  receiptTemplates,
  type ReceiptTemplate,
  type InsertReceiptTemplate,
  type FollowUpTask,
  type InsertFollowUpTask,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, lt, gte, desc, asc, lte, inArray, or, isNull, count } from "drizzle-orm";
import { convertUserDateTimeToUTC, convertUTCToUserDateTime } from "@shared/timeUtils";

// CRITICAL: Set database session timezone to UTC for consistent storage
// All data must be stored in UTC, converted at application layer
db.execute(sql`SET timezone = 'UTC'`);

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
  
  // Inventory operations
  getInventoryItems(tenantId: string): Promise<InventoryItem[]>;
  getInventoryItemsByCategory(tenantId: string, category: string): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(itemId: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(itemId: string): Promise<void>;
  
  // Sales operations
  getSales(tenantId: string): Promise<Sale[]>;
  getSale(saleId: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(saleId: string, updates: Partial<InsertSale>): Promise<Sale>;
  getSaleItems(saleId: string): Promise<SaleItem[]>;
  createSaleItem(item: InsertSaleItem): Promise<SaleItem>;
  updateSaleItem(itemId: string, updates: Partial<InsertSaleItem>): Promise<SaleItem>;
  deleteSaleItem(itemId: string): Promise<void>;
  
  // Room operations
  getRooms(tenantId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(roomId: string, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;
  
  // Staff operations
  getStaff(tenantId: string): Promise<Staff[]>;
  getStaffByRole(tenantId: string, role: string): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(staffId: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(staffId: string): Promise<void>;
  reassignStaffAppointments(oldStaffId: string, newStaffId: string): Promise<void>;
  
  // Client operations
  getClients(tenantId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(clientId: string, updates: Partial<InsertClient>): Promise<Client>;
  updatePet(petId: string, updates: Partial<InsertPet>): Promise<Pet>;
  findCustomerByInfo(name: string, phone: string, email: string): Promise<any>;
  
  // Pet operations
  getPets(clientId: string): Promise<Pet[]>;
  getPetById(petId: string): Promise<Pet | undefined>;
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
  
  // Team member management
  getTeamMembers(): Promise<any[]>;
  createOrGetUser(userData: { email: string; firstName?: string; lastName?: string }): Promise<User>;
  removeSystemRole(userId: string, systemRoleId: string): Promise<void>;
  
  // Additional operations for system admin
  getAllTenantsWithCompany(): Promise<any[]>;
  hasSystemRole(userId: string): Promise<boolean>;
  
  // Webhook monitoring operations
  logWebhookError(errorLog: InsertWebhookErrorLog): Promise<WebhookErrorLog>;
  getWebhookErrorLogs(tenantId?: string, limit?: number): Promise<WebhookErrorLog[]>;
  updateWebhookErrorStatus(logId: string, status: string, resolvedAt?: Date): Promise<void>;
  getWebhookMonitoring(tenantId: string, webhookType: string): Promise<WebhookMonitoring | undefined>;
  upsertWebhookMonitoring(monitoring: InsertWebhookMonitoring): Promise<WebhookMonitoring>;
  updateWebhookMonitoringStatus(tenantId: string, webhookType: string, status: string, lastFailure?: Date): Promise<void>;
  getFailedWebhooksForRetry(): Promise<WebhookMonitoring[]>;
  incrementWebhookRetry(tenantId: string, webhookType: string): Promise<void>;
  
  // Medical Records operations
  getMedicalRecords(tenantId: string): Promise<MedicalRecord[]>;
  getMedicalRecord(recordId: string): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(recordId: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;
  
  // Medical Appointments operations
  getMedicalAppointments(tenantId: string): Promise<MedicalAppointment[]>;
  getMedicalAppointment(appointmentId: string): Promise<MedicalAppointment | undefined>;
  createMedicalAppointment(appointment: InsertMedicalAppointment): Promise<MedicalAppointment>;
  updateMedicalAppointment(appointmentId: string, appointment: Partial<InsertMedicalAppointment>): Promise<MedicalAppointment>;
  getFollowUpTasks(tenantId: string): Promise<any[]>;

  // Medical Documents
  createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument>;
  getMedicalDocuments(appointmentId: string): Promise<MedicalDocument[]>;
  
  // Invoice Queue operations
  createInvoiceQueueItem(item: InsertInvoiceQueue): Promise<InvoiceQueue>;
  getInvoiceQueueByTenant(tenantId: string): Promise<InvoiceQueue[]>;
  
  // Grooming Records operations
  getGroomingRecords(tenantId: string): Promise<GroomingRecord[]>;
  getGroomingRecord(recordId: string): Promise<GroomingRecord | undefined>;
  createGroomingRecord(record: InsertGroomingRecord): Promise<GroomingRecord>;
  updateGroomingRecord(recordId: string, record: Partial<InsertGroomingRecord>): Promise<GroomingRecord>;
  
  // Billing operations
  createInvoice(invoice: InsertBillingInvoice): Promise<BillingInvoice>;
  getInvoicesByTenant(tenantId: string): Promise<BillingInvoice[]>;
  updateInvoiceStatus(invoiceId: string, status: string): Promise<BillingInvoice>;
  
  // Company billing configuration
  getCompanyBillingConfig(companyId: string): Promise<CompanyBillingConfig | undefined>;
  upsertCompanyBillingConfig(config: InsertCompanyBillingConfig): Promise<CompanyBillingConfig>;
  
  // Delivery scheduling operations
  createDeliverySchedule(schedule: InsertDeliverySchedule): Promise<DeliverySchedule>;
  getDeliverySchedulesByTenant(tenantId: string): Promise<DeliverySchedule[]>;
  updateDeliveryStatus(scheduleId: string, status: string): Promise<DeliverySchedule>;

  // Payment gateway configuration operations
  getPaymentGatewayConfigs(companyId?: string, tenantId?: string): Promise<PaymentGatewayConfig[]>;
  createPaymentGatewayConfig(config: InsertPaymentGatewayConfig): Promise<PaymentGatewayConfig>;
  updatePaymentGatewayConfig(id: string, config: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig>;
  deletePaymentGatewayConfig(id: string): Promise<void>;

  // Billing queue operations
  getBillingQueue(tenantId: string): Promise<BillingQueue[]>;
  createBillingQueueItem(item: InsertBillingQueue): Promise<BillingQueue>;
  updateBillingQueueItem(id: string, updates: Partial<InsertBillingQueue>): Promise<BillingQueue>;

  // Subscription operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getCompanySubscription(companyId: string): Promise<CompanySubscription | undefined>;
  createCompanySubscription(subscription: InsertCompanySubscription): Promise<CompanySubscription>;
  updateCompanySubscription(companyId: string, updates: Partial<InsertCompanySubscription>): Promise<CompanySubscription>;

  // Subscription promotions
  getActivePromotions(): Promise<SubscriptionPromotion[]>;
  validatePromotionCode(code: string): Promise<SubscriptionPromotion | undefined>;

  // Follow-up notification operations
  getFollowUpCount(tenantId: string): Promise<number>;
  getCompanyFollowUpConfig(companyId: string): Promise<any>;
  updateCompanyFollowUpConfig(companyId: string, config: any): Promise<any>;

  // Tax configuration operations
  getTaxConfiguration(tenantId?: string, companyId?: string): Promise<TaxConfiguration | undefined>;
  upsertTaxConfiguration(config: InsertTaxConfiguration): Promise<TaxConfiguration>;
  updateTaxConfiguration(id: string, config: Partial<InsertTaxConfiguration>): Promise<TaxConfiguration>;

  // Pending invoices operations
  getPendingInvoices(tenantId: string): Promise<PendingInvoice[]>;
  getPendingInvoice(invoiceId: string): Promise<PendingInvoice | undefined>;
  createPendingInvoice(invoice: InsertPendingInvoice): Promise<PendingInvoice>;
  updatePendingInvoice(invoiceId: string, invoice: Partial<InsertPendingInvoice>): Promise<PendingInvoice>;
  generateInvoiceNumber(tenantId: string): Promise<string>;

  // Invoice line items operations
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(lineItemId: string, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem>;
  deleteInvoiceLineItem(lineItemId: string): Promise<void>;

  // External Services operations
  getExternalServiceSubscriptions(companyId: string): Promise<any[]>;
  createExternalServiceSubscription(subscription: any): Promise<any>;
  addExternalServiceCredits(subscriptionId: string, creditsToAdd: number, blocksPurchased: number): Promise<any>;
  getWhatsAppUsageStats(companyId: string, startDate?: string, endDate?: string): Promise<any>;
  recordWhatsAppUsage(usage: any): Promise<any>;
  getExternalServiceSubscriptionByType(companyId: string, serviceType: string): Promise<any>;

  // Delivery Configuration operations
  getDeliveryConfig(tenantId: string): Promise<DeliveryConfig | undefined>;
  updateDeliveryConfig(tenantId: string, config: Partial<InsertDeliveryConfig>): Promise<DeliveryConfig>;
  
  // Missing methods used in routes
  getAppointmentsByDate(tenantId: string, date: string): Promise<Appointment[]>;
  getFraccionamientos(): Promise<any[]>;
  getDeliveryRoutes(tenantId: string): Promise<any[]>;
  createUser(userData: any): Promise<User>;
  createUserCompany(userId: string, companyId: string): Promise<any>;
  getCompany(companyId: string): Promise<Company | undefined>;
  updateCompany(companyId: string, updates: Partial<InsertCompany>): Promise<Company>;
  updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  getTenantsByCompany(companyId: string): Promise<Tenant[]>;
  getStaffByCompany(companyId: string): Promise<Staff[]>;
  
  // Receipt Templates operations
  getReceiptTemplates(companyId?: string, tenantId?: string): Promise<ReceiptTemplate[]>;
  getReceiptTemplate(templateId: string): Promise<ReceiptTemplate | undefined>;
  createReceiptTemplate(template: InsertReceiptTemplate): Promise<ReceiptTemplate>;
  updateReceiptTemplate(templateId: string, template: Partial<InsertReceiptTemplate>): Promise<ReceiptTemplate>;
  deleteReceiptTemplate(templateId: string): Promise<void>;
  getActiveReceiptTemplate(companyId?: string, tenantId?: string): Promise<ReceiptTemplate | undefined>;
  
  // Receipt numbering operations
  generateReceiptNumber(tenantId: string): Promise<string>;
  
  // Follow-up Tasks operations
  getFollowUpTasks(filters: any): Promise<FollowUpTask[]>;
  createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask>;
  updateFollowUpTask(taskId: string, updates: Partial<InsertFollowUpTask>): Promise<FollowUpTask>;
  deleteFollowUpTask(taskId: string): Promise<void>;
  generateFollowUpTasks(tenantId: string): Promise<FollowUpTask[]>;
  getFollowUpConfigurations(): Promise<any[]>;
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

  async updateCompanySettings(companyId: string, settings: any): Promise<void> {
    await db.update(companies)
      .set({ 
        settings: settings,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId));
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

  async getPetsByTenant(tenantId: string): Promise<Pet[]> {
    const results = await db.select()
      .from(pets)
      .innerJoin(clients, eq(pets.clientId, clients.id))
      .where(eq(clients.tenantId, tenantId));
    
    // Extract just the pets data from the joined results
    return results.map(result => result.pets);
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const [newPet] = await db.insert(pets).values(pet).returning();
    return newPet;
  }

  async updateClient(clientId: string, updates: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, clientId))
      .returning();
    return updatedClient;
  }

  async updatePet(petId: string, updates: Partial<InsertPet>): Promise<Pet> {
    const [updatedPet] = await db
      .update(pets)
      .set(updates)
      .where(eq(pets.id, petId))
      .returning();
    return updatedPet;
  }

  async getPetById(petId: string): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
    return pet;
  }

  async getClientById(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    return client;
  }

  // Appointment operations
  async getAppointments(tenantId: string, date?: string): Promise<any[]> {
    // Use proper JOIN queries instead of N+1 pattern
    let appointmentsQuery = db
      .select({
        // Appointment fields
        id: appointments.id,
        tenantId: appointments.tenantId,
        clientId: appointments.clientId,
        petId: appointments.petId,
        staffId: appointments.staffId,
        roomId: appointments.roomId,
        serviceId: appointments.serviceId,
        scheduledDate: appointments.scheduledDate,
        scheduledTime: appointments.scheduledTime,
        duration: appointments.duration,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        totalCost: appointments.totalCost,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Client fields
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        // Pet fields
        petName: pets.name,
        petSpecies: pets.species,
        petBreed: pets.breed,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(pets, eq(appointments.petId, pets.id))
      .where(
        date 
          ? and(eq(appointments.tenantId, tenantId), eq(appointments.scheduledDate, date))
          : eq(appointments.tenantId, tenantId)
      );

    const results = await appointmentsQuery;

    // Transform to match expected format and convert UTC to user timezone
    return results.map(row => {
      // CRITICAL: Convert UTC from database to user timezone for display
      let displayDate = row.scheduledDate;
      let displayTime = row.scheduledTime;
      
      if (row.scheduledDate && row.scheduledTime) {
        const { localDate, localTime } = convertUTCToUserDateTime(
          row.scheduledDate,
          row.scheduledTime
        );
        displayDate = localDate;
        displayTime = localTime;
        
        console.log(`Storage UTC Display: UTC ${row.scheduledDate} ${row.scheduledTime} → User ${localDate} ${localTime}`);
      }
      
      return {
        id: row.id,
        tenantId: row.tenantId,
        clientId: row.clientId,
        petId: row.petId,
        staffId: row.staffId,
        roomId: row.roomId,
        serviceId: row.serviceId,
        scheduledDate: displayDate,
        scheduledTime: displayTime,
        duration: row.duration,
        status: row.status,
        type: row.type,
        notes: row.notes,
        totalCost: row.totalCost,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        client: row.clientName ? {
          id: row.clientId,
          name: row.clientName,
          phone: row.clientPhone,
          email: row.clientEmail,
        } : null,
        pet: row.petName ? {
          id: row.petId,
          name: row.petName,
          species: row.petSpecies,
          breed: row.petBreed,
        } : null,
      };
    });
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    // CRITICAL: Convert user input to UTC for database storage
    let appointmentData = { ...appointment };
    
    if (appointment.scheduledDate && appointment.scheduledTime) {
      const { utcDate, utcTime } = convertUserDateTimeToUTC(
        appointment.scheduledDate,
        appointment.scheduledTime
      );
      appointmentData.scheduledDate = utcDate;
      appointmentData.scheduledTime = utcTime;
      
      console.log(`Storage UTC Conversion: User ${appointment.scheduledDate} ${appointment.scheduledTime} → UTC ${utcDate} ${utcTime}`);
    }
    
    const [newAppointment] = await db.insert(appointments).values(appointmentData).returning();
    return newAppointment;
  }

  async updateAppointment(appointmentId: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    // CRITICAL: Convert user input to UTC for database storage
    let appointmentData = { ...appointment };
    
    if (appointment.scheduledDate && appointment.scheduledTime) {
      const { utcDate, utcTime } = convertUserDateTimeToUTC(
        appointment.scheduledDate,
        appointment.scheduledTime
      );
      appointmentData.scheduledDate = utcDate;
      appointmentData.scheduledTime = utcTime;
      
      console.log(`Storage UTC Update: User ${appointment.scheduledDate} ${appointment.scheduledTime} → UTC ${utcDate} ${utcTime}`);
    }
    
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointmentData)
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

    // CRITICAL: Convert user date to UTC for database comparison
    // Note: Input date is in user's timezone, need to check against UTC stored appointments
    const { utcDate } = convertUserDateTimeToUTC(date, "00:00");

    // Get existing appointments for the UTC date
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.scheduledDate, utcDate)
      ));

    console.log(`getAvailableSlots: User date ${date} → UTC ${utcDate}, found ${existingAppointments.length} appointments`);

    // Generate time slots from 8:00 AM to 6:00 PM (in user timezone)
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    // Filter out slots that conflict with existing appointments
    const availableSlots = slots.filter(slot => {
      // Convert user slot time to UTC for comparison
      const { utcDate: slotUTCDate, utcTime: slotUTCTime } = convertUserDateTimeToUTC(date, slot);
      const slotTimeUTC = new Date(`${slotUTCDate}T${slotUTCTime}:00Z`);
      const slotEndTimeUTC = new Date(slotTimeUTC.getTime() + service.duration * 60000);

      return !existingAppointments.some(apt => {
        // Appointments are already stored in UTC, compare directly
        const aptTimeUTC = new Date(`${apt.scheduledDate}T${apt.scheduledTime}:00Z`);
        const aptEndTimeUTC = new Date(aptTimeUTC.getTime() + (apt.duration || 30) * 60000);

        // Check for time overlap in UTC
        return slotTimeUTC < aptEndTimeUTC && slotEndTimeUTC > aptTimeUTC;
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
    
    // CRITICAL: Convert user input to UTC for database storage
    let reservationData = { ...reservation };
    
    if (reservation.scheduledDate && reservation.scheduledTime) {
      const { utcDate, utcTime } = convertUserDateTimeToUTC(
        reservation.scheduledDate,
        reservation.scheduledTime
      );
      reservationData.scheduledDate = utcDate;
      reservationData.scheduledTime = utcTime;
      
      console.log(`Storage UTC Reservation: User ${reservation.scheduledDate} ${reservation.scheduledTime} → UTC ${utcDate} ${utcTime}`);
    }
    
    // Clean up expired reservations first
    await db.delete(tempSlotReservations)
      .where(sql`expires_at < ${new Date()}`);
    
    // Create new reservation
    const [newReservation] = await db
      .insert(tempSlotReservations)
      .values({
        ...reservationData,
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



  async releaseSlot(reservationId: string): Promise<void> {
    await db.delete(tempSlotReservations).where(eq(tempSlotReservations.id, reservationId));
  }

  async cleanupExpiredReservations(): Promise<void> {
    const now = new Date();
    await db.delete(tempSlotReservations).where(lt(tempSlotReservations.expiresAt, now));
  }

  // Enhanced inventory operations with automatic deduction
  // TODO: Implement inventory tables in schema.ts
  // async getInventoryItem(itemId: string): Promise<InventoryItem | undefined> {
  //   const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  //   return item;
  // }

  // async updateInventoryStock(itemId: string, quantityChange: number, transactionType: 'purchase' | 'sale' | 'adjustment' | 'expired' | 'used', notes?: string): Promise<void> {
  //   const item = await this.getInventoryItem(itemId);
  //   if (!item) throw new Error("Inventory item not found");

  //   const newStock = Math.max(0, item.currentStock + quantityChange);
    
  //   await db.update(inventoryItems)
  //     .set({ 
  //       currentStock: newStock,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(inventoryItems.id, itemId));

  //   // Create transaction record
  //   await db.insert(inventoryTransactions).values({
  //     itemId,
  //     tenantId: item.tenantId,
  //     type: transactionType,
  //     quantity: quantityChange,
  //     unitPrice: item.unitPrice,
  //     totalAmount: Math.abs(quantityChange) * parseFloat(item.unitPrice.toString()),
  //     notes: notes || `Auto ${transactionType} via billing system`,
  //     createdAt: new Date()
  //   });
  // }

  // TODO: Implement inventory processing when inventory tables are added
  // async processInventoryForInvoice(invoiceId: string): Promise<void> {
  //   const [invoice] = await db.select().from(pendingInvoices).where(eq(pendingInvoices.id, invoiceId));
  //   if (!invoice || invoice.inventoryProcessed) return;

  //   const inventoryUsed = invoice.inventoryUsed as any[];
  //   if (!inventoryUsed || inventoryUsed.length === 0) return;

  //   for (const item of inventoryUsed) {
  //     await this.updateInventoryStock(
  //       item.itemId, 
  //       -item.quantity, // Negative to reduce stock
  //       'used',
  //       `Used in invoice ${invoice.invoiceNumber} - ${invoice.serviceName}`
  //     );
  //   }

  //   // Mark inventory as processed
  //   await db.update(pendingInvoices)
  //     .set({ inventoryProcessed: true })
  //     .where(eq(pendingInvoices.id, invoiceId));
  // }

  // TODO: Re-enable when inventory tables are implemented
  // async processInventoryForPayment(billingQueueId: string): Promise<void> {
  //   // Get billing queue item and related invoice
  //   const [billingItem] = await db.select().from(billingQueue).where(eq(billingQueue.id, billingQueueId));
  //   if (!billingItem) return;

  //   // Process inventory if there's an associated invoice
  //   if (billingItem.invoiceId) {
  //     await this.processInventoryForInvoice(billingItem.invoiceId);
  //   }
  // }

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
      return await db
        .select()
        .from(webhookErrorLogs)
        .where(eq(webhookErrorLogs.tenantId, tenantId))
        .orderBy(sql`${webhookErrorLogs.createdAt} DESC`)
        .limit(limit);
    }
    
    return await db
      .select()
      .from(webhookErrorLogs)
      .orderBy(sql`${webhookErrorLogs.createdAt} DESC`)
      .limit(limit);
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

  // Inventory operations
  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    const items = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId))
      .orderBy(inventoryItems.name);
    return items;
  }

  async getInventoryItemsByCategory(tenantId: string, category: string): Promise<InventoryItem[]> {
    const items = await db
      .select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.category, category),
        eq(inventoryItems.isActive, true)
      ))
      .orderBy(inventoryItems.name);
    return items;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItems)
      .values({
        ...item,
        id: undefined, // Let DB generate ID
      })
      .returning();
    return newItem;
  }

  async updateInventoryItem(itemId: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(itemId: string): Promise<void> {
    await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, itemId));
  }

  // Sales operations
  async getSales(tenantId: string): Promise<Sale[]> {
    const salesData = await db
      .select()
      .from(sales)
      .where(eq(sales.tenantId, tenantId))
      .orderBy(desc(sales.createdAt));
    return salesData;
  }

  async getSale(saleId: string): Promise<Sale | undefined> {
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId));
    return sale;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    // Generate receipt number if not provided
    let receiptId = sale.receiptId;
    if (!receiptId && sale.tenantId) {
      receiptId = await this.generateReceiptNumber(sale.tenantId);
    }
    
    const [newSale] = await db
      .insert(sales)
      .values({
        ...sale,
        receiptId,
        id: undefined, // Let DB generate ID
      })
      .returning();
    return newSale;
  }

  async updateSale(saleId: string, updates: Partial<InsertSale>): Promise<Sale> {
    const [updatedSale] = await db
      .update(sales)
      .set(updates)
      .where(eq(sales.id, saleId))
      .returning();
    return updatedSale;
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId))
      .orderBy(saleItems.createdAt);
    return items;
  }

  async createSaleItem(item: InsertSaleItem): Promise<SaleItem> {
    const [newItem] = await db
      .insert(saleItems)
      .values({
        ...item,
        id: undefined, // Let DB generate ID
      })
      .returning();
    return newItem;
  }

  async updateSaleItem(itemId: string, updates: Partial<InsertSaleItem>): Promise<SaleItem> {
    const [updatedItem] = await db
      .update(saleItems)
      .set(updates)
      .where(eq(saleItems.id, itemId))
      .returning();
    return updatedItem;
  }

  async deleteSaleItem(itemId: string): Promise<void> {
    await db
      .delete(saleItems)
      .where(eq(saleItems.id, itemId));
  }

  // Route optimization caching
  async getSavedRoute(tenantId: string, date: string, appointmentIds: string[]): Promise<any> {
    const routeHash = this.generateRouteHash(appointmentIds);
    const [savedRoute] = await db
      .select()
      .from(savedRoutes)
      .where(and(
        eq(savedRoutes.tenantId, tenantId),
        eq(savedRoutes.date, date),
        eq(savedRoutes.routeHash, routeHash)
      ));
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

  // Team member management operations
  async getTeamMembers(): Promise<any[]> {
    // Get all users with their system roles and company assignments
    const usersWithRoles = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        systemRoleId: userSystemRoles.systemRoleId,
        systemRoleName: systemRoles.name,
        systemRoleDisplayName: systemRoles.displayName,
        systemRoleDescription: systemRoles.description,
        isSystemRoleActive: userSystemRoles.isActive,
      })
      .from(users)
      .leftJoin(userSystemRoles, and(
        eq(users.id, userSystemRoles.userId),
        eq(userSystemRoles.isActive, true)
      ))
      .leftJoin(systemRoles, eq(userSystemRoles.systemRoleId, systemRoles.id))
      .orderBy(users.email);

    // Get company assignments for all users
    const companyAssignments = await db
      .select({
        userId: userCompanies.userId,
        companyId: userCompanies.companyId,
        companyName: companies.name,
        roleName: roles.name,
        isSupertenant: userCompanies.isSupertenant,
        isActive: userCompanies.isActive,
      })
      .from(userCompanies)
      .leftJoin(companies, eq(userCompanies.companyId, companies.id))
      .leftJoin(roles, eq(userCompanies.roleId, roles.id))
      .where(eq(userCompanies.isActive, true));

    // Group users and their roles
    const teamMembersMap = new Map();
    
    usersWithRoles.forEach(user => {
      if (!teamMembersMap.has(user.id)) {
        teamMembersMap.set(user.id, {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          systemRoles: [],
          companyRoles: [],
        });
      }

      const member = teamMembersMap.get(user.id);
      
      // Add system role if it exists and not already added
      if (user.systemRoleId && !member.systemRoles.some((r: any) => r.id === user.systemRoleId)) {
        member.systemRoles.push({
          id: user.systemRoleId,
          name: user.systemRoleName,
          displayName: user.systemRoleDisplayName,
          description: user.systemRoleDescription,
        });
      }
    });

    // Add company assignments
    companyAssignments.forEach(assignment => {
      const member = teamMembersMap.get(assignment.userId);
      if (member) {
        member.companyRoles.push({
          id: assignment.companyId,
          companyId: assignment.companyId,
          companyName: assignment.companyName,
          roleName: assignment.roleName || 'Sin rol',
          isSupertenant: assignment.isSupertenant,
        });
      }
    });

    return Array.from(teamMembersMap.values());
  }

  async createOrGetUser(userData: { email: string; firstName?: string; lastName?: string }): Promise<User> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      // Update user data if provided
      if (userData.firstName || userData.lastName) {
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName || existingUser[0].firstName,
            lastName: userData.lastName || existingUser[0].lastName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id))
          .returning();
        return updatedUser;
      }
      return existingUser[0];
    }

    // Create new user
    const [newUser] = await db.insert(users).values({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    }).returning();

    return newUser;
  }

  async removeSystemRole(userId: string, systemRoleId: string): Promise<void> {
    await db
      .update(userSystemRoles)
      .set({ 
        isActive: false
      })
      .where(
        and(
          eq(userSystemRoles.userId, userId),
          eq(userSystemRoles.systemRoleId, systemRoleId)
        )
      );
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

  async getUserSystemRoles(userId: string): Promise<any[]> {
    return await db
      .select({
        roleId: systemRoles.id,
        roleName: systemRoles.name,
        roleDescription: systemRoles.description,
        systemLevel: systemRoles.systemLevel,
        isActive: userSystemRoles.isActive
      })
      .from(userSystemRoles)
      .innerJoin(systemRoles, eq(userSystemRoles.systemRoleId, systemRoles.id))
      .where(
        and(
          eq(userSystemRoles.userId, userId),
          eq(userSystemRoles.isActive, true)
        )
      );
  }

  async hasDebugRole(userId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(userSystemRoles)
      .innerJoin(systemRoles, eq(userSystemRoles.systemRoleId, systemRoles.id))
      .where(
        and(
          eq(userSystemRoles.userId, userId),
          eq(userSystemRoles.isActive, true),
          eq(systemRoles.name, 'debug')
        )
      );
    
    return parseInt(result[0].count as string) > 0;
  }

  // Staff by role operations
  async getStaffByRole(tenantId: string, role: string): Promise<Staff[]> {
    const staffList = await db.select().from(staff)
      .where(and(eq(staff.tenantId, tenantId), eq(staff.role, role)));
    return staffList;
  }

  // Medical Records operations
  async getMedicalRecords(tenantId: string): Promise<MedicalRecord[]> {
    const records = await db.select().from(medicalRecords)
      .where(eq(medicalRecords.tenantId, tenantId))
      .orderBy(desc(medicalRecords.visitDate));
    return records;
  }

  async getMedicalRecord(recordId: string): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords)
      .where(eq(medicalRecords.id, recordId));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateMedicalRecord(recordId: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const [updatedRecord] = await db.update(medicalRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(medicalRecords.id, recordId))
      .returning();
    return updatedRecord;
  }

  // Medical Appointments operations
  async getMedicalAppointments(tenantId: string): Promise<MedicalAppointment[]> {
    const appointments = await db.select().from(medicalAppointments)
      .where(eq(medicalAppointments.tenantId, tenantId))
      .orderBy(desc(medicalAppointments.visitDate));
    return appointments;
  }

  async getMedicalAppointment(appointmentId: string): Promise<MedicalAppointment | undefined> {
    const [appointment] = await db.select().from(medicalAppointments)
      .where(eq(medicalAppointments.id, appointmentId));
    return appointment;
  }

  async createMedicalAppointment(appointment: InsertMedicalAppointment): Promise<MedicalAppointment> {
    const [newAppointment] = await db.insert(medicalAppointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateMedicalAppointment(appointmentId: string, appointment: Partial<InsertMedicalAppointment>): Promise<MedicalAppointment> {
    const [updatedAppointment] = await db.update(medicalAppointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(medicalAppointments.id, appointmentId))
      .returning();
    return updatedAppointment;
  }

  // Invoice Queue operations
  async createInvoiceQueueItem(item: InsertInvoiceQueue): Promise<InvoiceQueue> {
    const [newItem] = await db.insert(invoiceQueue)
      .values(item)
      .returning();
    return newItem;
  }

  async getInvoiceQueueByTenant(tenantId: string): Promise<InvoiceQueue[]> {
    const items = await db.select().from(invoiceQueue)
      .where(eq(invoiceQueue.tenantId, tenantId))
      .orderBy(desc(invoiceQueue.createdAt));
    return items;
  }

  // Grooming Records operations
  async getGroomingRecords(tenantId: string): Promise<GroomingRecord[]> {
    const records = await db.select().from(groomingRecords)
      .where(eq(groomingRecords.tenantId, tenantId))
      .orderBy(desc(groomingRecords.groomingDate));
    return records;
  }

  async getGroomingRecord(recordId: string): Promise<GroomingRecord | undefined> {
    const [record] = await db.select().from(groomingRecords)
      .where(eq(groomingRecords.id, recordId));
    return record;
  }

  async createGroomingRecord(record: InsertGroomingRecord): Promise<GroomingRecord> {
    const [newRecord] = await db.insert(groomingRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateGroomingRecord(recordId: string, record: Partial<InsertGroomingRecord>): Promise<GroomingRecord> {
    const [updatedRecord] = await db.update(groomingRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(groomingRecords.id, recordId))
      .returning();
    return updatedRecord;
  }

  // Billing operations
  async createInvoice(invoice: InsertBillingInvoice): Promise<BillingInvoice> {
    const [newInvoice] = await db.insert(billingInvoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async getInvoicesByTenant(tenantId: string): Promise<BillingInvoice[]> {
    const invoices = await db.select().from(billingInvoices)
      .where(eq(billingInvoices.tenantId, tenantId))
      .orderBy(desc(billingInvoices.createdAt));
    return invoices;
  }

  async updateInvoiceStatus(invoiceId: string, status: string): Promise<BillingInvoice> {
    const [updatedInvoice] = await db.update(billingInvoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(billingInvoices.id, invoiceId))
      .returning();
    return updatedInvoice;
  }

  // Company billing configuration
  async getCompanyBillingConfig(companyId: string): Promise<CompanyBillingConfig | undefined> {
    const [config] = await db.select().from(companyBillingConfig)
      .where(eq(companyBillingConfig.companyId, companyId));
    return config;
  }

  async upsertCompanyBillingConfig(config: InsertCompanyBillingConfig): Promise<CompanyBillingConfig> {
    const [newConfig] = await db.insert(companyBillingConfig)
      .values(config)
      .onConflictDoUpdate({
        target: companyBillingConfig.companyId,
        set: { ...config, updatedAt: new Date() }
      })
      .returning();
    return newConfig;
  }

  // Delivery scheduling operations
  async createDeliverySchedule(schedule: InsertDeliverySchedule): Promise<DeliverySchedule> {
    const [newSchedule] = await db.insert(deliverySchedule)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async getDeliverySchedulesByTenant(tenantId: string): Promise<DeliverySchedule[]> {
    const schedules = await db.select().from(deliverySchedule)
      .where(eq(deliverySchedule.tenantId, tenantId))
      .orderBy(desc(deliverySchedule.deliveryDate));
    return schedules;
  }

  async updateDeliveryStatus(scheduleId: string, status: string): Promise<DeliverySchedule> {
    const [updatedSchedule] = await db.update(deliverySchedule)
      .set({ status, updatedAt: new Date() })
      .where(eq(deliverySchedule.id, scheduleId))
      .returning();
    return updatedSchedule;
  }

  // Medical Documents operations
  async createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument> {
    const [newDocument] = await db.insert(medicalDocuments).values(document).returning();
    return newDocument;
  }

  async getMedicalDocuments(appointmentId: string): Promise<MedicalDocument[]> {
    return await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.appointmentId, appointmentId))
      .orderBy(desc(medicalDocuments.createdAt));
  }

  // Follow-up Tasks operations
  async getFollowUpTasks(tenantId: string): Promise<any[]> {
    const result = await db
      .select({
        id: medicalAppointments.id,
        visitDate: medicalAppointments.visitDate,
        followUpRequired: medicalAppointments.followUpRequired,
        followUpDate: medicalAppointments.followUpDate,
        isConfirmed: medicalAppointments.isConfirmed,
        confirmedAt: medicalAppointments.confirmedAt,
        client: {
          id: clients.id,
          name: clients.name,
          phone: clients.phone,
          email: clients.email,
        },
        pet: {
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
        },
        veterinarian: {
          id: staff.id,
          name: staff.name,
        }
      })
      .from(medicalAppointments)
      .leftJoin(clients, eq(medicalAppointments.clientId, clients.id))
      .leftJoin(pets, eq(medicalAppointments.petId, pets.id))
      .leftJoin(staff, eq(medicalAppointments.veterinarianId, staff.id))
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          eq(medicalAppointments.followUpRequired, true),
          or(
            eq(medicalAppointments.isConfirmed, false),
            isNull(medicalAppointments.isConfirmed)
          )
        )
      )
      .orderBy(asc(medicalAppointments.followUpDate), asc(medicalAppointments.visitDate));

    return result;
  }

  // Payment gateway configuration operations
  async getPaymentGatewayConfigs(companyId?: string, tenantId?: string): Promise<PaymentGatewayConfig[]> {
    if (companyId && tenantId) {
      return await db.select().from(paymentGatewayConfig).where(
        or(
          eq(paymentGatewayConfig.companyId, companyId),
          eq(paymentGatewayConfig.tenantId, tenantId)
        )
      );
    } else if (companyId) {
      return await db.select().from(paymentGatewayConfig).where(eq(paymentGatewayConfig.companyId, companyId));
    } else if (tenantId) {
      return await db.select().from(paymentGatewayConfig).where(eq(paymentGatewayConfig.tenantId, tenantId));
    }
    
    return await db.select().from(paymentGatewayConfig);
  }

  async createPaymentGatewayConfig(config: InsertPaymentGatewayConfig): Promise<PaymentGatewayConfig> {
    const [newConfig] = await db
      .insert(paymentGatewayConfig)
      .values(config)
      .returning();
    return newConfig;
  }

  async updatePaymentGatewayConfig(id: string, updates: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
    const [updatedConfig] = await db
      .update(paymentGatewayConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentGatewayConfig.id, id))
      .returning();
    return updatedConfig;
  }

  async deletePaymentGatewayConfig(id: string): Promise<void> {
    await db
      .delete(paymentGatewayConfig)
      .where(eq(paymentGatewayConfig.id, id));
  }

  // Billing queue operations
  async getBillingQueue(tenantId: string): Promise<BillingQueue[]> {
    return await db
      .select()
      .from(billingQueue)
      .where(eq(billingQueue.tenantId, tenantId))
      .orderBy(billingQueue.createdAt);
  }

  async createBillingQueueItem(item: InsertBillingQueue): Promise<BillingQueue> {
    const [newItem] = await db
      .insert(billingQueue)
      .values(item)
      .returning();
    return newItem;
  }

  async updateBillingQueueItem(id: string, updates: Partial<InsertBillingQueue>): Promise<BillingQueue> {
    const [updatedItem] = await db
      .update(billingQueue)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(billingQueue.id, id))
      .returning();
    return updatedItem;
  }

  // Subscription operations
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }

  async getCompanySubscription(companyId: string): Promise<CompanySubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(companySubscriptions)
      .where(eq(companySubscriptions.companyId, companyId));
    return subscription;
  }

  async createCompanySubscription(subscription: InsertCompanySubscription): Promise<CompanySubscription> {
    const [newSubscription] = await db
      .insert(companySubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateCompanySubscription(companyId: string, updates: Partial<InsertCompanySubscription>): Promise<CompanySubscription> {
    const [updatedSubscription] = await db
      .update(companySubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companySubscriptions.companyId, companyId))
      .returning();
    return updatedSubscription;
  }

  // Subscription promotions
  async getActivePromotions(): Promise<SubscriptionPromotion[]> {
    const now = new Date();
    return await db
      .select()
      .from(subscriptionPromotions)
      .where(
        and(
          eq(subscriptionPromotions.isActive, true),
          lte(subscriptionPromotions.validFrom, now),
          gte(subscriptionPromotions.validTo, now)
        )
      );
  }

  async validatePromotionCode(code: string): Promise<SubscriptionPromotion | undefined> {
    const now = new Date();
    const [promotion] = await db
      .select()
      .from(subscriptionPromotions)
      .where(
        and(
          eq(subscriptionPromotions.code, code),
          eq(subscriptionPromotions.isActive, true),
          lte(subscriptionPromotions.validFrom, now),
          gte(subscriptionPromotions.validTo, now)
        )
      );
    return promotion;
  }

  // New billing and subscription management methods
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));
    return plan;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, name));
    return plan;
  }

  async createSubscriptionPlan(planData: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values(planData)
      .returning();
    return newPlan;
  }

  async updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId))
      .returning();
    return updatedPlan;
  }

  async getAllCompaniesWithSubscriptions(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .orderBy(companies.createdAt);
  }

  async getCompanyTenants(companyId: string): Promise<Tenant[]> {
    return await db
      .select()
      .from(tenants)
      .where(eq(tenants.companyId, companyId));
  }

  async getExpiringSubscriptions(cutoffDate: Date): Promise<any[]> {
    return await db
      .select({
        companyId: companySubscriptions.companyId,
        companyName: companies.name,
        companyEmail: sql`COALESCE(${companies.settings}->>'contactEmail', 'no-email@example.com')`,
        planId: companySubscriptions.planId,
        status: companySubscriptions.status,
        currentPeriodEnd: companySubscriptions.currentPeriodEnd,
        planDisplayName: subscriptionPlans.displayName
      })
      .from(companySubscriptions)
      .leftJoin(companies, eq(companySubscriptions.companyId, companies.id))
      .leftJoin(subscriptionPlans, eq(companySubscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          lte(companySubscriptions.currentPeriodEnd, cutoffDate),
          eq(companySubscriptions.status, 'active')
        )
      )
      .orderBy(companySubscriptions.currentPeriodEnd);
  }

  // Email configuration management
  async getEmailConfig(): Promise<EmailConfig | null> {
    const results = await db
      .select()
      .from(emailConfig)
      .where(eq(emailConfig.id, 'default'))
      .limit(1);
    return results[0] || null;
  }

  async createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig> {
    const results = await db
      .insert(emailConfig)
      .values(config)
      .returning();
    return results[0];
  }

  async updateEmailConfig(updates: Partial<InsertEmailConfig>): Promise<EmailConfig> {
    const results = await db
      .update(emailConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailConfig.id, 'default'))
      .returning();
    return results[0];
  }

  // Email logging
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const results = await db
      .insert(emailLogs)
      .values(log)
      .returning();
    return results[0];
  }

  async getEmailLogs(limit: number = 50): Promise<EmailLog[]> {
    return await db
      .select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit);
  }

  // Follow-up notification operations
  async getFollowUpCount(tenantId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(medicalAppointments)
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          eq(medicalAppointments.followUpRequired, true),
          lte(medicalAppointments.followUpDate, new Date())
        )
      );
    return result[0]?.count || 0;
  }

  async getCompanyFollowUpConfig(companyId: string): Promise<any> {
    const [company] = await db
      .select({
        followUpNormalThreshold: companyBillingConfig.followUpNormalThreshold,
        followUpUrgentThreshold: companyBillingConfig.followUpUrgentThreshold,
        followUpHeartBeatEnabled: companyBillingConfig.followUpHeartBeatEnabled,
        followUpShowCount: companyBillingConfig.followUpShowCount,
        followUpAutoGenerationInterval: companyBillingConfig.followUpAutoGenerationInterval,
      })
      .from(companyBillingConfig)
      .where(eq(companyBillingConfig.companyId, companyId));
    return company;
  }

  async getFollowUpConfigurations(): Promise<any[]> {
    const configs = await db
      .select({
        companyId: companyBillingConfig.companyId,
        followUpNormalThreshold: companyBillingConfig.followUpNormalThreshold,
        followUpUrgentThreshold: companyBillingConfig.followUpUrgentThreshold,
        followUpHeartBeatEnabled: companyBillingConfig.followUpHeartBeatEnabled,
        followUpShowCount: companyBillingConfig.followUpShowCount,
        followUpAutoGenerationInterval: companyBillingConfig.followUpAutoGenerationInterval,
      })
      .from(companyBillingConfig);
    return configs;
  }

  async getCompanyAutoStatusConfig(companyId: string): Promise<any> {
    const [company] = await db
      .select({
        autoStatusUpdateEnabled: companies.autoStatusUpdateEnabled,
        autoStatusUpdateInterval: companies.autoStatusUpdateInterval,
        autoStatusUpdateLastRun: companies.autoStatusUpdateLastRun
      })
      .from(companies)
      .where(eq(companies.id, companyId));
    return company;
  }

  async updateCompanyAutoStatusConfig(companyId: string, config: any): Promise<any> {
    const [company] = await db
      .update(companies)
      .set({
        autoStatusUpdateEnabled: config.autoStatusUpdateEnabled,
        autoStatusUpdateInterval: config.autoStatusUpdateInterval,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning({
        autoStatusUpdateEnabled: companies.autoStatusUpdateEnabled,
        autoStatusUpdateInterval: companies.autoStatusUpdateInterval,
        autoStatusUpdateLastRun: companies.autoStatusUpdateLastRun
      });
    return company;
  }

  async updateCompanyFollowUpConfig(companyId: string, config: any): Promise<any> {
    const [updatedConfig] = await db
      .update(companyBillingConfig)
      .set({
        followUpNormalThreshold: config.followUpNormalThreshold,
        followUpUrgentThreshold: config.followUpUrgentThreshold,
        followUpHeartBeatEnabled: config.followUpHeartBeatEnabled,
        followUpShowCount: config.followUpShowCount,
        followUpAutoGenerationInterval: config.followUpAutoGenerationInterval,
        updatedAt: new Date(),
      })
      .where(eq(companyBillingConfig.companyId, companyId))
      .returning({
        followUpNormalThreshold: companyBillingConfig.followUpNormalThreshold,
        followUpUrgentThreshold: companyBillingConfig.followUpUrgentThreshold,
        followUpHeartBeatEnabled: companyBillingConfig.followUpHeartBeatEnabled,
        followUpShowCount: companyBillingConfig.followUpShowCount,
        followUpAutoGenerationInterval: companyBillingConfig.followUpAutoGenerationInterval,
      });
    return updatedConfig;
  }

  // Tax configuration operations
  async getTaxConfiguration(tenantId?: string, companyId?: string): Promise<TaxConfiguration | undefined> {
    if (tenantId) {
      const [config] = await db
        .select()
        .from(taxConfiguration)
        .where(eq(taxConfiguration.tenantId, tenantId));
      return config;
    } else if (companyId) {
      const [config] = await db
        .select()
        .from(taxConfiguration)
        .where(eq(taxConfiguration.companyId, companyId));
      return config;
    }
    
    return undefined;
  }

  async upsertTaxConfiguration(config: InsertTaxConfiguration): Promise<TaxConfiguration> {
    const [newConfig] = await db
      .insert(taxConfiguration)
      .values(config)
      .onConflictDoUpdate({
        target: config.tenantId ? taxConfiguration.tenantId : taxConfiguration.companyId,
        set: {
          ...config,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newConfig;
  }

  async updateTaxConfiguration(id: string, config: Partial<InsertTaxConfiguration>): Promise<TaxConfiguration> {
    const [updatedConfig] = await db
      .update(taxConfiguration)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(taxConfiguration.id, id))
      .returning();
    return updatedConfig;
  }

  // Pending invoices operations
  async getPendingInvoices(tenantId: string): Promise<PendingInvoice[]> {
    return await db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.tenantId, tenantId))
      .orderBy(desc(pendingInvoices.createdAt));
  }

  async getPendingInvoice(invoiceId: string): Promise<PendingInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.id, invoiceId));
    return invoice;
  }

  async createPendingInvoice(invoice: InsertPendingInvoice): Promise<PendingInvoice> {
    const [newInvoice] = await db
      .insert(pendingInvoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async updatePendingInvoice(invoiceId: string, invoice: Partial<InsertPendingInvoice>): Promise<PendingInvoice> {
    const [updatedInvoice] = await db
      .update(pendingInvoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(pendingInvoices.id, invoiceId))
      .returning();
    return updatedInvoice;
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    // Get tax configuration for the tenant to get prefix and counter
    const [config] = await db
      .select()
      .from(taxConfiguration)
      .where(eq(taxConfiguration.tenantId, tenantId));
    
    const prefix = config?.invoiceNumberPrefix || "FAC";
    const counter = config?.invoiceNumberCounter || 1;
    
    // Update counter
    if (config) {
      await db
        .update(taxConfiguration)
        .set({ 
          invoiceNumberCounter: counter + 1,
          updatedAt: new Date()
        })
        .where(eq(taxConfiguration.id, config.id));
    }
    
    return `${prefix}-${counter.toString().padStart(6, '0')}`;
  }

  // Invoice line items operations
  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(invoiceLineItems.sortOrder);
  }

  async createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [newLineItem] = await db
      .insert(invoiceLineItems)
      .values(lineItem)
      .returning();
    return newLineItem;
  }

  async updateInvoiceLineItem(lineItemId: string, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem> {
    const [updatedLineItem] = await db
      .update(invoiceLineItems)
      .set(lineItem)
      .where(eq(invoiceLineItems.id, lineItemId))
      .returning();
    return updatedLineItem;
  }

  async deleteInvoiceLineItem(lineItemId: string): Promise<void> {
    await db
      .delete(invoiceLineItems)
      .where(eq(invoiceLineItems.id, lineItemId));
  }

  // LateNode Webhook Integration Methods
  async getWebhookIntegrations(companyId: string): Promise<WebhookIntegration[]> {
    return await db
      .select()
      .from(webhookIntegrations)
      .where(eq(webhookIntegrations.companyId, companyId))
      .orderBy(webhookIntegrations.createdAt);
  }

  async getWebhookIntegrationsByType(companyId: string, webhookType: string): Promise<WebhookIntegration[]> {
    return await db
      .select()
      .from(webhookIntegrations)
      .where(
        and(
          eq(webhookIntegrations.companyId, companyId),
          eq(webhookIntegrations.webhookType, webhookType),
          eq(webhookIntegrations.isActive, true)
        )
      );
  }

  async getWebhookIntegration(integrationId: string): Promise<WebhookIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(webhookIntegrations)
      .where(eq(webhookIntegrations.id, integrationId));
    return integration;
  }

  async createWebhookIntegration(integration: InsertWebhookIntegration): Promise<WebhookIntegration> {
    const [newIntegration] = await db
      .insert(webhookIntegrations)
      .values(integration)
      .returning();
    return newIntegration;
  }

  async updateWebhookIntegration(integrationId: string, integration: Partial<InsertWebhookIntegration>): Promise<WebhookIntegration> {
    const [updatedIntegration] = await db
      .update(webhookIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(webhookIntegrations.id, integrationId))
      .returning();
    return updatedIntegration;
  }

  async deleteWebhookIntegration(integrationId: string): Promise<void> {
    await db
      .delete(webhookIntegrations)
      .where(eq(webhookIntegrations.id, integrationId));
  }

  async updateWebhookLastUsed(integrationId: string): Promise<void> {
    await db
      .update(webhookIntegrations)
      .set({ lastUsed: new Date() })
      .where(eq(webhookIntegrations.id, integrationId));
  }

  // Webhook Logs Methods
  async getWebhookLogs(integrationId: string, limit = 50): Promise<WebhookLog[]> {
    return await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookIntegrationId, integrationId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async getWebhookLogsByTenant(tenantId: string, limit = 50): Promise<WebhookLog[]> {
    return await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.tenantId, tenantId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [newLog] = await db
      .insert(webhookLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getWebhookStats(companyId: string, days = 7): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTime: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db
      .select({
        totalExecutions: count(),
        successfulExecutions: sql<number>`sum(case when success = true then 1 else 0 end)`,
        failedExecutions: sql<number>`sum(case when success = false then 1 else 0 end)`,
        averageResponseTime: sql<number>`avg(execution_time_ms)`
      })
      .from(webhookLogs)
      .innerJoin(webhookIntegrations, eq(webhookLogs.webhookIntegrationId, webhookIntegrations.id))
      .where(
        and(
          eq(webhookIntegrations.companyId, companyId),
          gte(webhookLogs.createdAt, startDate)
        )
      );

    return stats[0] || { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTime: 0 };
  }

  // External Services Methods
  async getExternalServiceSubscriptions(companyId: string): Promise<any[]> {
    const subscriptions = await db.execute(sql`
      SELECT * FROM external_service_subscriptions 
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `);
    return subscriptions.rows;
  }

  async createExternalServiceSubscription(subscription: any): Promise<any> {
    const { companyId, serviceName, serviceType, creditsTotal, pricePerBlock, blockSize, settings } = subscription;
    
    const result = await db.execute(sql`
      INSERT INTO external_service_subscriptions 
      (company_id, service_name, service_type, subscription_status, credits_remaining, credits_total, 
       price_per_block, block_size, settings, last_refill_date)
      VALUES (${companyId}, ${serviceName}, ${serviceType}, 'active', ${creditsTotal}, ${creditsTotal}, 
              ${pricePerBlock}, ${blockSize}, ${JSON.stringify(settings || {})}, NOW())
      RETURNING *
    `);
    
    return result.rows[0];
  }

  async addExternalServiceCredits(subscriptionId: string, creditsToAdd: number, blocksPurchased: number): Promise<any> {
    const result = await db.execute(sql`
      UPDATE external_service_subscriptions 
      SET credits_remaining = credits_remaining + ${creditsToAdd},
          credits_total = credits_total + ${creditsToAdd},
          last_refill_date = NOW(),
          updated_at = NOW()
      WHERE id = ${subscriptionId}
      RETURNING *
    `);
    
    return result.rows[0];
  }

  async getWhatsAppUsageStats(companyId: string, startDate?: string, endDate?: string): Promise<any> {
    let dateCondition = sql`usage_date >= NOW() - INTERVAL '30 days'`; // Default to last 30 days
    if (startDate && endDate) {
      dateCondition = sql`usage_date BETWEEN ${startDate} AND ${endDate}`;
    } else if (startDate) {
      dateCondition = sql`usage_date >= ${startDate}`;
    }

    const usage = await db.execute(sql`
      SELECT 
        SUM(message_count) as total_messages,
        SUM(total_cost) as total_cost,
        COUNT(DISTINCT usage_date) as active_days,
        message_type,
        business_hours
      FROM whatsapp_message_usage 
      WHERE company_id = ${companyId} AND ${dateCondition}
      GROUP BY message_type, business_hours
      ORDER BY total_messages DESC
    `);

    return usage.rows;
  }

  async recordWhatsAppUsage(usage: any): Promise<any> {
    const { companyId, tenantId, messageType, messageCount, triggerType, businessHours } = usage;
    const costPerMessage = 0.0299; // Based on LateNode pricing
    const totalCost = messageCount * costPerMessage;

    const result = await db.execute(sql`
      INSERT INTO whatsapp_message_usage 
      (company_id, tenant_id, message_type, message_count, trigger_type, 
       cost_per_message, total_cost, business_hours)
      VALUES (${companyId}, ${tenantId}, ${messageType}, ${messageCount}, ${triggerType},
              ${costPerMessage}, ${totalCost}, ${businessHours})
      RETURNING *
    `);

    // Deduct credits from subscription
    if (businessHours) {
      await db.execute(sql`
        UPDATE external_service_subscriptions 
        SET credits_remaining = credits_remaining - ${messageCount},
            usage_this_period = usage_this_period + ${messageCount},
            updated_at = NOW()
        WHERE company_id = ${companyId} 
        AND service_type = 'whatsapp' 
        AND subscription_status = 'active'
      `);
    }

    return result.rows[0];
  }

  async getExternalServiceSubscriptionByType(companyId: string, serviceType: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM external_service_subscriptions 
      WHERE company_id = ${companyId} AND service_type = ${serviceType}
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    return result.rows[0];
  }

  // Delivery Configuration operations
  async getDeliveryConfig(tenantId: string): Promise<DeliveryConfig | undefined> {
    const [config] = await db
      .select()
      .from(deliveryConfig)
      .where(eq(deliveryConfig.tenantId, tenantId));
    
    // Return default configuration if none exists
    if (!config) {
      return {
        id: '',
        tenantId,
        mode: 'wave',
        totalWaves: 5,
        pickupVans: 2,
        deliveryVans: 3,
        pickupStartTime: '08:00',
        pickupEndTime: '12:00',
        deliveryStartTime: '13:00',
        deliveryEndTime: '17:00',
        freeStartTime: '08:00',
        freeEndTime: '20:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return config;
  }

  async updateDeliveryConfig(tenantId: string, config: Partial<InsertDeliveryConfig>): Promise<DeliveryConfig> {
    const [updatedConfig] = await db
      .insert(deliveryConfig)
      .values({
        tenantId,
        ...config,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: deliveryConfig.tenantId,
        set: {
          ...config,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return updatedConfig;
  }

  // Payment Gateway Configuration
  async getPaymentGatewayConfig(tenantId: string): Promise<PaymentGatewayConfig | undefined> {
    const [config] = await db.select()
      .from(paymentGatewayConfig)
      .where(eq(paymentGatewayConfig.tenantId, tenantId));
    return config;
  }

  // Missing method implementations
  async getAppointmentsByDate(tenantId: string, date: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.scheduledDate, date)
      ))
      .orderBy(asc(appointments.scheduledTime));
  }

  async getFraccionamientos(): Promise<any[]> {
    // Return empty array for now - this seems to be a specific business logic feature
    return [];
  }

  async getDeliveryRoutes(tenantId: string): Promise<any[]> {
    // Return empty array for now - delivery routes functionality
    return [];
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createUserCompany(userId: string, companyId: string): Promise<any> {
    const [userCompany] = await db.insert(userCompanies).values({
      userId,
      companyId,
      createdAt: new Date()
    }).returning();
    return userCompany;
  }

  async getCompany(companyId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    return company;
  }

  async updateCompany(companyId: string, updates: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return updatedCompany;
  }

  async updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return updatedTenant;
  }

  async getTenantsByCompany(companyId: string): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.companyId, companyId));
  }

  async getStaffByCompany(companyId: string): Promise<Staff[]> {
    const tenantsInCompany = await this.getTenantsByCompany(companyId);
    const tenantIds = tenantsInCompany.map(t => t.id);
    
    if (tenantIds.length === 0) return [];
    
    return await db.select().from(staff).where(inArray(staff.tenantId, tenantIds));
  }

  // Receipt Templates operations
  async getReceiptTemplates(companyId?: string, tenantId?: string): Promise<ReceiptTemplate[]> {
    if (tenantId) {
      const results = await db
        .select()
        .from(receiptTemplates)
        .where(eq(receiptTemplates.tenantId, tenantId));
      return results.filter(template => template.isActive);
    } else if (companyId) {
      const results = await db
        .select()
        .from(receiptTemplates)
        .where(and(
          eq(receiptTemplates.companyId, companyId),
          isNull(receiptTemplates.tenantId)
        ));
      return results.filter(template => template.isActive);
    }
    
    const results = await db.select().from(receiptTemplates);
    return results.filter(template => template.isActive);
  }

  async getReceiptTemplate(templateId: string): Promise<ReceiptTemplate | undefined> {
    const [template] = await db.select().from(receiptTemplates).where(eq(receiptTemplates.id, templateId));
    return template;
  }

  async createReceiptTemplate(template: InsertReceiptTemplate): Promise<ReceiptTemplate> {
    const [newTemplate] = await db.insert(receiptTemplates).values(template).returning();
    return newTemplate;
  }

  async updateReceiptTemplate(templateId: string, template: Partial<InsertReceiptTemplate>): Promise<ReceiptTemplate> {
    const [updatedTemplate] = await db
      .update(receiptTemplates)
      .set({
        ...template,
        updatedAt: new Date(),
      })
      .where(eq(receiptTemplates.id, templateId))
      .returning();
    return updatedTemplate;
  }

  async deleteReceiptTemplate(templateId: string): Promise<void> {
    await db.delete(receiptTemplates).where(eq(receiptTemplates.id, templateId));
  }

  // Generate receipt number with format: CompanyName-TenantCode-Year-SeqNumber
  async generateReceiptNumber(tenantId: string): Promise<string> {
    try {
      // Get tenant and company information
      const tenant = await this.getTenant(tenantId);
      if (!tenant) throw new Error('Tenant not found');
      
      const company = await this.getCompany(tenant.companyId);
      if (!company) throw new Error('Company not found');
      
      // Extract first 3 characters from company name (uppercase, alphanumeric only)
      const companyPrefix = company.name
        .replace(/[^A-Za-z0-9]/g, '') // Remove non-alphanumeric
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, 'X'); // Pad with X if less than 3 chars
      
      // Get next sequence number for this tenant for current year
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      
      const [result] = await db
        .select({ count: count() })
        .from(sales)
        .where(
          and(
            eq(sales.tenantId, tenantId),
            gte(sales.createdAt, new Date(startOfYear)),
            lte(sales.createdAt, new Date(endOfYear))
          )
        );
      
      const sequenceNumber = (result?.count || 0) + 1;
      const paddedSequence = sequenceNumber.toString().padStart(4, '0');
      
      // Format: COMPANY-TEN-YYYY-NNNN (e.g., VET-CLI-2025-0001)
      const tenantCode = tenantId.substring(0, 3).toUpperCase();
      const receiptNumber = `${companyPrefix}-${tenantCode}-${currentYear}-${paddedSequence}`;
      
      return receiptNumber;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      // Fallback to simple format
      const timestamp = Date.now().toString().slice(-6);
      return `REC-${tenantId.substring(0, 3).toUpperCase()}-${timestamp}`;
    }
  }

  async getActiveReceiptTemplate(companyId?: string, tenantId?: string): Promise<ReceiptTemplate | undefined> {
    // First try to get tenant-specific template
    if (tenantId) {
      const [tenantTemplate] = await db
        .select()
        .from(receiptTemplates)
        .where(and(
          eq(receiptTemplates.tenantId, tenantId),
          eq(receiptTemplates.isActive, true)
        ))
        .limit(1);
      if (tenantTemplate) return tenantTemplate;
    }
    
    // Fall back to company-wide template
    if (companyId) {
      const [companyTemplate] = await db
        .select()
        .from(receiptTemplates)
        .where(and(
          eq(receiptTemplates.companyId, companyId),
          isNull(receiptTemplates.tenantId),
          eq(receiptTemplates.isActive, true)
        ))
        .limit(1);
      return companyTemplate;
    }
    
    return undefined;
  }

  // Mobile Admin specific methods
  async getSubscriptionStatistics(): Promise<{
    active: number;
    trial: number;
    expired: number;
    inactive: number;
    total: number;
    recentlyActivated: number;
  }> {
    try {
      // Get all subscription counts
      const [active] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions)
        .where(eq(companySubscriptions.status, 'active'));
      
      const [trial] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions)
        .where(eq(companySubscriptions.status, 'trial'));
      
      const [expired] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions)
        .where(eq(companySubscriptions.status, 'cancelled'));
      
      const [inactive] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions)
        .where(eq(companySubscriptions.status, 'suspended'));
      
      const [total] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions);
      
      // Get recently activated (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentlyActivated] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companySubscriptions)
        .where(
          and(
            eq(companySubscriptions.status, 'active'),
            gte(companySubscriptions.createdAt, yesterday)
          )
        );
      
      return {
        active: active?.count || 0,
        trial: trial?.count || 0,
        expired: expired?.count || 0,
        inactive: inactive?.count || 0,
        total: total?.count || 0,
        recentlyActivated: recentlyActivated?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching subscription statistics:', error);
      return {
        active: 0,
        trial: 0,
        expired: 0,
        inactive: 0,
        total: 0,
        recentlyActivated: 0,
      };
    }
  }

  async getRecentCriticalActivities(): Promise<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>> {
    try {
      // Get recent subscription changes (last 48 hours)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const subscriptionActivities = await db
        .select({
          id: companySubscriptions.id,
          companyName: companies.name,
          status: companySubscriptions.status,
          createdAt: companySubscriptions.createdAt,
          updatedAt: companySubscriptions.updatedAt,
        })
        .from(companySubscriptions)
        .leftJoin(companies, eq(companySubscriptions.companyId, companies.id))
        .where(
          or(
            gte(companySubscriptions.createdAt, twoDaysAgo),
            gte(companySubscriptions.updatedAt, twoDaysAgo)
          )
        )
        .orderBy(desc(companySubscriptions.updatedAt))
        .limit(10);
      
      const activities = subscriptionActivities.map(sub => ({
        id: sub.id,
        type: 'subscription',
        description: `${sub.companyName || 'Unknown Company'} - Subscription ${sub.status}`,
        timestamp: (sub.updatedAt || sub.createdAt || new Date()).toISOString(),
        status: sub.status === 'active' ? 'success' as const :
                sub.status === 'cancelled' ? 'error' as const :
                'warning' as const,
      }));
      
      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  // Service Store Management Methods
  // ===============================
  
  async getCompanyActiveServices(companyId: string): Promise<Array<{
    serviceId: string;
    activatedAt: string;
    autoRenewal: boolean;
    usagePercentage: number;
    usedAmount: number;
    monthlyLimit: number;
  }>> {
    try {
      const result = await db
        .select({
          serviceId: externalServiceSubscriptions.serviceName,
          activatedAt: externalServiceSubscriptions.createdAt,
          autoRenewal: sql<boolean>`false`,
          usagePercentage: sql<number>`
            CASE 
              WHEN COALESCE(${externalServiceSubscriptions.creditsRemaining}, 0) > 0 
              THEN (COALESCE(${externalServiceSubscriptions.usageThisPeriod}, 0)::decimal / 100)
              ELSE 0 
            END
          `,
          usedAmount: sql<number>`COALESCE(${externalServiceSubscriptions.usageThisPeriod}, 0)`,
          monthlyLimit: sql<number>`100`,
        })
        .from(externalServiceSubscriptions)
        .where(
          and(
            eq(externalServiceSubscriptions.companyId, companyId),
            sql`${externalServiceSubscriptions.serviceName} IS NOT NULL`
          )
        );
      
      return result.map(item => ({
        serviceId: item.serviceId === 'whatsapp' ? 'whatsapp-integration' : 
                  item.serviceId === 'sms' ? 'sms-notifications' :
                  item.serviceId === 'email' ? 'email-automation' : item.serviceId,
        activatedAt: item.activatedAt?.toISOString() || new Date().toISOString(),
        autoRenewal: item.autoRenewal || false,
        usagePercentage: Number(item.usagePercentage) || 0,
        usedAmount: Number(item.usedAmount) || 0,
        monthlyLimit: item.monthlyLimit || 1000,
      }));
    } catch (error) {
      console.error('Error fetching company active services:', error);
      return [];
    }
  }
  
  async getCompanyClinics(companyId: string): Promise<Array<{
    id: string;
    name: string;
    location: string;
  }>> {
    try {
      const result = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          location: sql<string>`'No location specified'`,
        })
        .from(tenants)
        .where(eq(tenants.companyId, companyId));
      
      return result.map(clinic => ({
        id: clinic.id,
        name: clinic.name || 'Unnamed Clinic',
        location: clinic.location || 'No location specified',
      }));
    } catch (error) {
      console.error('Error fetching company clinics:', error);
      return [];
    }
  }

  // Van Cage Management Methods
  async getVanCages(vanId: string): Promise<VanCage[]> {
    try {
      const result = await db
        .select()
        .from(vanCages)
        .where(and(eq(vanCages.vanId, vanId), eq(vanCages.isActive, true)))
        .orderBy(asc(vanCages.cageNumber));
      return result;
    } catch (error) {
      console.error('Error fetching van cages:', error);
      throw error;
    }
  }

  async getVanCage(cageId: string): Promise<VanCage | null> {
    try {
      const [result] = await db
        .select()
        .from(vanCages)
        .where(eq(vanCages.id, cageId));
      return result || null;
    } catch (error) {
      console.error('Error fetching van cage:', error);
      throw error;
    }
  }

  async createVanCage(cageData: InsertVanCage): Promise<VanCage> {
    try {
      const [result] = await db
        .insert(vanCages)
        .values(cageData)
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating van cage:', error);
      throw error;
    }
  }

  async updateVanCage(cageId: string, updates: Partial<VanCage>): Promise<VanCage> {
    try {
      const [result] = await db
        .update(vanCages)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(vanCages.id, cageId))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating van cage:', error);
      throw error;
    }
  }

  async deleteVanCage(cageId: string): Promise<void> {
    try {
      await db
        .update(vanCages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(vanCages.id, cageId));
    } catch (error) {
      console.error('Error deleting van cage:', error);
      throw error;
    }
  }

  // Cage Assignment Methods
  async getCageAssignment(assignmentId: string): Promise<CageAssignment | null> {
    try {
      const [result] = await db
        .select()
        .from(cageAssignments)
        .where(eq(cageAssignments.id, assignmentId));
      return result || null;
    } catch (error) {
      console.error('Error fetching cage assignment:', error);
      throw error;
    }
  }

  async createCageAssignment(assignmentData: InsertCageAssignment): Promise<CageAssignment> {
    try {
      const [result] = await db
        .insert(cageAssignments)
        .values(assignmentData)
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating cage assignment:', error);
      throw error;
    }
  }

  async updateCageAssignment(assignmentId: string, updates: Partial<CageAssignment>): Promise<CageAssignment> {
    try {
      const [result] = await db
        .update(cageAssignments)
        .set(updates)
        .where(eq(cageAssignments.id, assignmentId))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating cage assignment:', error);
      throw error;
    }
  }

  async updateVan(vanId: string, updates: Partial<Van>): Promise<Van> {
    try {
      const [result] = await db
        .update(vans)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(vans.id, vanId))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating van:', error);
      throw error;
    }
  }
  
  async updateServiceAutoRenewal(companyId: string, serviceId: string, autoRenewal: boolean): Promise<void> {
    try {
      // Convert service ID to internal service name
      const serviceNameMap: Record<string, string> = {
        'whatsapp-integration': 'whatsapp',
        'sms-notifications': 'sms',
        'email-automation': 'email'
      };
      
      const serviceName = serviceNameMap[serviceId] || serviceId;
      
      await db
        .update(externalServiceSubscriptions)
        .set({
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(externalServiceSubscriptions.companyId, companyId),
            eq(externalServiceSubscriptions.serviceName, serviceName)
          )
        );
    } catch (error) {
      console.error('Error updating service auto-renewal:', error);
      throw error;
    }
  }
  
  async getServiceUsageData(companyId: string, serviceId: string): Promise<{
    used: number;
    limit: number;
    percentage: number;
  } | null> {
    try {
      // Convert service ID to internal service name
      const serviceNameMap: Record<string, string> = {
        'whatsapp-integration': 'whatsapp',
        'sms-notifications': 'sms',
        'email-automation': 'email'
      };
      
      const serviceName = serviceNameMap[serviceId] || serviceId;
      
      const result = await db
        .select({
          creditsRemaining: externalServiceSubscriptions.creditsRemaining,
          usageThisPeriod: externalServiceSubscriptions.usageThisPeriod,
        })
        .from(externalServiceSubscriptions)
        .where(
          and(
            eq(externalServiceSubscriptions.companyId, companyId),
            eq(externalServiceSubscriptions.serviceName, serviceName),
            sql`${externalServiceSubscriptions.serviceName} = ${serviceName}`
          )
        )
        .limit(1);
      
      if (!result.length) {
        return null;
      }
      
      const { creditsRemaining, usageThisPeriod } = result[0];
      const used = usageThisPeriod || 0;
      const limit = 1000;
      const percentage = limit > 0 ? (used / limit) * 100 : 0;
      
      return {
        used: Math.max(0, used),
        limit,
        percentage: Math.min(100, Math.max(0, percentage)),
      };
    } catch (error) {
      console.error('Error fetching service usage data:', error);
      return null;
    }
  }

  // Follow-up Tasks operations
  async getFollowUpTasks(filters: any): Promise<FollowUpTask[]> {
    try {
      let query = db.select().from(followUpTasks);
      
      const conditions = [];
      if (filters.tenantId) {
        conditions.push(eq(followUpTasks.tenantId, filters.tenantId));
      }
      if (filters.status) {
        conditions.push(eq(followUpTasks.status, filters.status));
      }
      if (filters.priority) {
        conditions.push(eq(followUpTasks.priority, filters.priority));
      }
      if (filters.taskType) {
        conditions.push(eq(followUpTasks.taskType, filters.taskType));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(followUpTasks.createdAt));
    } catch (error) {
      console.error('Error fetching follow-up tasks:', error);
      return [];
    }
  }

  async createFollowUpTask(task: InsertFollowUpTask): Promise<FollowUpTask> {
    const [newTask] = await db.insert(followUpTasks).values(task).returning();
    return newTask;
  }

  async updateFollowUpTask(taskId: string, updates: Partial<InsertFollowUpTask>): Promise<FollowUpTask> {
    const [updatedTask] = await db
      .update(followUpTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(followUpTasks.id, taskId))
      .returning();
    return updatedTask;
  }

  async deleteFollowUpTask(taskId: string): Promise<void> {
    await db.delete(followUpTasks).where(eq(followUpTasks.id, taskId));
  }

  async getPendingFollowUpsByAppointment(tenantId: string, appointmentId: string): Promise<FollowUpTask[]> {
    try {
      return await db
        .select()
        .from(followUpTasks)
        .where(
          and(
            eq(followUpTasks.tenantId, tenantId),
            or(
              eq(followUpTasks.appointmentId, appointmentId),
              eq(followUpTasks.medicalAppointmentId, appointmentId),
              eq(followUpTasks.groomingRecordId, appointmentId)
            ),
            eq(followUpTasks.status, 'pending')
          )
        )
        .orderBy(desc(followUpTasks.createdAt));
    } catch (error) {
      console.error('Error fetching pending follow-ups by appointment:', error);
      return [];
    }
  }

  async autoGenerateFollowUpTasks(tenantId: string, appointmentType: string): Promise<FollowUpTask[]> {
    try {
      const generatedTasks: FollowUpTask[] = [];
      
      if (appointmentType === 'medical') {
        // Check for medical appointments missing diagnosis
        const medicalAppointmentsNoDiagnosis = await db
          .select()
          .from(medicalAppointments)
          .where(
            and(
              eq(medicalAppointments.tenantId, tenantId),
              eq(medicalAppointments.status, 'completed'),
              or(
                isNull(medicalAppointments.diagnosis),
                eq(medicalAppointments.diagnosis, '')
              )
            )
          );

        for (const appointment of medicalAppointmentsNoDiagnosis) {
          const taskData: InsertFollowUpTask = {
            tenantId,
            medicalAppointmentId: appointment.id,
            clientId: appointment.clientId,
            petId: appointment.petId,
            taskType: 'missing_diagnosis',
            priority: 'high',
            title: 'Diagnóstico faltante',
            description: `La cita médica completada requiere diagnóstico`,
            missingFields: ['diagnosis'],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };
          
          const newTask = await this.createFollowUpTask(taskData);
          generatedTasks.push(newTask);
        }
      }

      if (appointmentType === 'grooming') {
        // Check for grooming records missing prices
        const groomingRecordsNoPrice = await db
          .select({
            groomingRecord: groomingRecords,
            pet: pets
          })
          .from(groomingRecords)
          .leftJoin(pets, eq(groomingRecords.petId, pets.id))
          .where(
            and(
              eq(groomingRecords.tenantId, tenantId),
              eq(groomingRecords.status, 'completed'),
              or(
                isNull(groomingRecords.totalCost),
                eq(groomingRecords.totalCost, '0')
              )
            )
          );

        for (const { groomingRecord, pet } of groomingRecordsNoPrice) {
          if (pet) {
            const taskData: InsertFollowUpTask = {
              tenantId,
              groomingRecordId: groomingRecord.id,
              clientId: pet.clientId,
              petId: groomingRecord.petId,
              taskType: 'missing_price',
              priority: 'normal',
              title: 'Precio faltante',
              description: `El servicio de estética completado requiere precio`,
              missingFields: ['totalCost'],
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            const newTask = await this.createFollowUpTask(taskData);
            generatedTasks.push(newTask);
          }
        }
      }

      return generatedTasks;
    } catch (error) {
      console.error('Error auto-generating follow-up tasks:', error);
      return [];
    }
  }



}

export const storage = new DatabaseStorage();