import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  date,
  time,
} from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies (top-tier multi-tenant)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  domain: varchar("domain").unique(),
  settings: jsonb("settings"),
  subscriptionStatus: varchar("subscription_status").default("active"), // active, suspended, cancelled
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
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  postalCode: varchar("postal_code"),
  openTime: time("open_time").default("08:00"), // Default 8:00 AM
  closeTime: time("close_time").default("18:00"), // Default 6:00 PM
  timeSlotDuration: integer("time_slot_duration").default(30), // Minutes per slot
  reservationTimeout: integer("reservation_timeout").default(5), // Minutes before slot expires
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roles definition
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // recepcion, grooming, medical, admin, autoentregas
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  permissions: varchar("permissions").array().notNull(), // array of permissions like ['view_appointments', 'manage_clients']
  department: varchar("department").notNull(), // reception, grooming, medical, admin, delivery
  createdAt: timestamp("created_at").defaultNow(),
});

// User-Tenant relationships with roles
export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  role: varchar("role").notNull(), // admin, veterinarian, groomer, receptionist, delivery
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
  postalCode: varchar("postal_code", { length: 10 }),
  fraccionamiento: varchar("fraccionamiento"), // subdivision/neighborhood
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
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

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = typeof userTenants.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// Temporary slot reservations for booking flow
export const tempSlotReservations = pgTable("temp_slot_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  sessionId: varchar("session_id").notNull(), // browser session ID
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: time("scheduled_time").notNull(),
  serviceId: varchar("service_id").notNull(),
  roomId: varchar("room_id"),
  expiresAt: timestamp("expires_at").notNull(), // 10 minutes from creation
  createdAt: timestamp("created_at").defaultNow(),
});

export type TempSlotReservation = typeof tempSlotReservations.$inferSelect;
export type InsertTempSlotReservation = typeof tempSlotReservations.$inferInsert;

// Webhook Error Logs for Super Admin Monitoring
export const webhookErrorLogs = pgTable("webhook_error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  webhookType: varchar("webhook_type").notNull(), // whatsapp, email, sms
  endpoint: varchar("endpoint").notNull(),
  requestPayload: jsonb("request_payload"),
  errorMessage: text("error_message"),
  errorCode: varchar("error_code"),
  httpStatus: integer("http_status"),
  retryCount: integer("retry_count").default(0),
  status: varchar("status").default("failed"), // failed, retrying, resolved
  lastRetryAt: timestamp("last_retry_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Monitoring Status for Auto-Retry System
export const webhookMonitoring = pgTable("webhook_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  webhookType: varchar("webhook_type").notNull(),
  endpoint: varchar("endpoint").notNull(),
  status: varchar("status").default("healthy"), // healthy, degraded, down
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  consecutiveFailures: integer("consecutive_failures").default(0),
  isAutoRetryEnabled: boolean("is_auto_retry_enabled").default(true),
  retryIntervalMinutes: integer("retry_interval_minutes").default(5), // Start with 5 minutes
  maxRetryIntervalMinutes: integer("max_retry_interval_minutes").default(60), // Max 1 hour
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WebhookErrorLog = typeof webhookErrorLogs.$inferSelect;
export type InsertWebhookErrorLog = typeof webhookErrorLogs.$inferInsert;
export type WebhookMonitoring = typeof webhookMonitoring.$inferSelect;
export type InsertWebhookMonitoring = typeof webhookMonitoring.$inferInsert;