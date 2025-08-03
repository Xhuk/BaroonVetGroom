import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies (top-tier)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  subscriptionStatus: varchar("subscription_status").default("active"), // active, expired, cancelled
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionPlan: varchar("subscription_plan").default("basic"), // basic, pro, enterprise
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants (second-tier under companies)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name").notNull(),
  subdomain: varchar("subdomain").notNull().unique(), // e.g., "VetGroom-1"
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Tenant relationships
export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  role: varchar("role").notNull().default("staff"), // staff, admin, owner
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rooms
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // medical, grooming, vaccination
  capacity: integer("capacity").default(1),
  isActive: boolean("is_active").default(true),
  equipment: jsonb("equipment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff members
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  role: varchar("role").notNull(), // veterinarian, groomer, technician, receptionist
  specialization: varchar("specialization"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  fraccionamiento: varchar("fraccionamiento"), // subdivision/neighborhood
  createdAt: timestamp("created_at").defaultNow(),
});

// Pets
export const pets = pgTable("pets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: varchar("name").notNull(),
  species: varchar("species").notNull(),
  breed: varchar("breed"),
  age: integer("age"),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  medicalHistory: jsonb("medical_history"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services Configuration
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // medical, grooming, vaccination
  duration: integer("duration").notNull(), // minutes
  price: decimal("price", { precision: 10, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  roomId: varchar("room_id").references(() => rooms.id),
  staffId: varchar("staff_id").references(() => staff.id),
  serviceId: varchar("service_id").references(() => services.id),
  type: varchar("type").notNull(), // medical, grooming, vaccination
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: time("scheduled_time").notNull(),
  duration: integer("duration").default(60), // minutes
  logistics: varchar("logistics").notNull(), // pickup, delivered
  notes: text("notes"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, refunded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fraccionamientos (subdivisions/neighborhoods)
export const fraccionamientos = pgTable("fraccionamientos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  zone: varchar("zone"),
  maxWeightCapacity: decimal("max_weight_capacity", { precision: 8, scale: 2 }),
  deliveryDays: jsonb("delivery_days"), // array of days
  coordinates: jsonb("coordinates"), // lat/lng for mapping
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery routes
export const deliveryRoutes = pgTable("delivery_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  driverId: varchar("driver_id").references(() => staff.id),
  status: varchar("status").default("planned"), // planned, in_progress, completed
  totalWeight: decimal("total_weight", { precision: 8, scale: 2 }),
  estimatedDuration: integer("estimated_duration"), // minutes
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery stops
export const deliveryStops = pgTable("delivery_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => deliveryRoutes.id),
  fraccionamientoId: varchar("fraccionamiento_id").notNull().references(() => fraccionamientos.id),
  stopOrder: integer("stop_order").notNull(),
  estimatedWeight: decimal("estimated_weight", { precision: 8, scale: 2 }),
  actualWeight: decimal("actual_weight", { precision: 8, scale: 2 }),
  estimatedTime: time("estimated_time"),
  actualTime: time("actual_time"),
  status: varchar("status").default("pending"), // pending, completed, failed
  notes: text("notes"),
});

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // medication, supplies, food, accessories
  sku: varchar("sku").unique(),
  description: text("description"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  currentStock: integer("current_stock").default(0),
  minStockLevel: integer("min_stock_level").default(5),
  maxStockLevel: integer("max_stock_level").default(100),
  unit: varchar("unit").default("pieces"), // pieces, kg, ml, etc
  supplier: varchar("supplier"),
  expirationDate: date("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Transactions
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  type: varchar("type").notNull(), // purchase, sale, adjustment, expired
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  reference: varchar("reference"), // appointment_id, purchase_order, etc
  notes: text("notes"),
  performedBy: varchar("performed_by").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Working Hours
export const workingHours = pgTable("working_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Shifts
export const staffShifts = pgTable("staff_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  shiftDate: date("shift_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: varchar("status").default("scheduled"), // scheduled, active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Pet Media (for QR code access and history)
export const petMedia = pgTable("pet_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  type: varchar("type").notNull(), // image, video, document
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => staff.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("MXN"),
  method: varchar("method").notNull(), // cash, card, transfer, stripe
  status: varchar("status").default("pending"), // pending, completed, failed, refunded
  stripePaymentId: varchar("stripe_payment_id"),
  paymentDate: timestamp("payment_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  tenants: many(tenants),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  company: one(companies, {
    fields: [tenants.companyId],
    references: [companies.id],
  }),
  userTenants: many(userTenants),
  rooms: many(rooms),
  staff: many(staff),
  clients: many(clients),
  appointments: many(appointments),
  fraccionamientos: many(fraccionamientos),
  deliveryRoutes: many(deliveryRoutes),
  services: many(services),
  inventoryItems: many(inventoryItems),
  inventoryTransactions: many(inventoryTransactions),
  workingHours: many(workingHours),
  staffShifts: many(staffShifts),
  petMedia: many(petMedia),
  payments: many(payments),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userTenants: many(userTenants),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rooms.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [staff.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  deliveryRoutes: many(deliveryRoutes),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  pets: many(pets),
  appointments: many(appointments),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  client: one(clients, {
    fields: [pets.clientId],
    references: [clients.id],
  }),
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  pet: one(pets, {
    fields: [appointments.petId],
    references: [pets.id],
  }),
  room: one(rooms, {
    fields: [appointments.roomId],
    references: [rooms.id],
  }),
  staff: one(staff, {
    fields: [appointments.staffId],
    references: [staff.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  payments: many(payments),
}));

export const fraccionamientosRelations = relations(fraccionamientos, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [fraccionamientos.tenantId],
    references: [tenants.id],
  }),
  deliveryStops: many(deliveryStops),
}));

export const deliveryRoutesRelations = relations(deliveryRoutes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deliveryRoutes.tenantId],
    references: [tenants.id],
  }),
  driver: one(staff, {
    fields: [deliveryRoutes.driverId],
    references: [staff.id],
  }),
  stops: many(deliveryStops),
}));

export const deliveryStopsRelations = relations(deliveryStops, ({ one }) => ({
  route: one(deliveryRoutes, {
    fields: [deliveryStops.routeId],
    references: [deliveryRoutes.id],
  }),
  fraccionamiento: one(fraccionamientos, {
    fields: [deliveryStops.fraccionamientoId],
    references: [fraccionamientos.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [inventoryItems.tenantId],
    references: [tenants.id],
  }),
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryTransactions.itemId],
    references: [inventoryItems.id],
  }),
  tenant: one(tenants, {
    fields: [inventoryTransactions.tenantId],
    references: [tenants.id],
  }),
  performedByStaff: one(staff, {
    fields: [inventoryTransactions.performedBy],
    references: [staff.id],
  }),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  tenant: one(tenants, {
    fields: [workingHours.tenantId],
    references: [tenants.id],
  }),
}));

export const staffShiftsRelations = relations(staffShifts, ({ one }) => ({
  staff: one(staff, {
    fields: [staffShifts.staffId],
    references: [staff.id],
  }),
  tenant: one(tenants, {
    fields: [staffShifts.tenantId],
    references: [tenants.id],
  }),
}));

export const petMediaRelations = relations(petMedia, ({ one }) => ({
  pet: one(pets, {
    fields: [petMedia.petId],
    references: [pets.id],
  }),
  tenant: one(tenants, {
    fields: [petMedia.tenantId],
    references: [tenants.id],
  }),
  uploadedByStaff: one(staff, {
    fields: [petMedia.uploadedBy],
    references: [staff.id],
  }),
  appointment: one(appointments, {
    fields: [petMedia.appointmentId],
    references: [appointments.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertPetSchema = createInsertSchema(pets).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFraccionamientoSchema = createInsertSchema(fraccionamientos).omit({
  id: true,
  createdAt: true,
});

export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutes).omit({
  id: true,
  createdAt: true,
});

export const insertDeliveryStopSchema = createInsertSchema(deliveryStops).omit({
  id: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertWorkingHoursSchema = createInsertSchema(workingHours).omit({
  id: true,
  createdAt: true,
});

export const insertStaffShiftSchema = createInsertSchema(staffShifts).omit({
  id: true,
  createdAt: true,
});

export const insertPetMediaSchema = createInsertSchema(petMedia).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type UserTenant = typeof userTenants.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Fraccionamiento = typeof fraccionamientos.$inferSelect;
export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type DeliveryStop = typeof deliveryStops.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type WorkingHours = typeof workingHours.$inferSelect;
export type StaffShift = typeof staffShifts.$inferSelect;
export type PetMedia = typeof petMedia.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertFraccionamiento = z.infer<typeof insertFraccionamientoSchema>;
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type InsertDeliveryStop = z.infer<typeof insertDeliveryStopSchema>;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type InsertWorkingHours = z.infer<typeof insertWorkingHoursSchema>;
export type InsertStaffShift = z.infer<typeof insertStaffShiftSchema>;
export type InsertPetMedia = z.infer<typeof insertPetMediaSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Dashboard Stats type
export interface DashboardStats {
  groomingAppointments: number;
  medicalAppointments: number;
  vaccinationAppointments: number;
  scheduledDeliveries: number;
  groomingRoomAvailability: number;
  medicalRoomAvailability: number;
  vaccinationRoomAvailability: number;
  totalDeliveryWeight: number;
  teamMembers: number;
  activeStaffToday: number;
  roomUtilization: number;
  totalRooms: number;
  currentDate: string;
}
