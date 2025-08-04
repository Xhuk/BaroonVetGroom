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
  deliveryTrackingEnabled: boolean("delivery_tracking_enabled").default(false), // BETA feature control
  // Follow-up notification settings (configurable by super admin)
  followUpNormalThreshold: integer("follow_up_normal_threshold").default(10), // Slow heart beat when count >= this
  followUpUrgentThreshold: integer("follow_up_urgent_threshold").default(20), // Fast heart beat when count >= this
  followUpHeartBeatEnabled: boolean("follow_up_heart_beat_enabled").default(true), // Enable/disable beating heart
  followUpShowCount: boolean("follow_up_show_count").default(true), // Show count badge
  // WhatsApp External Service Settings
  whatsappEnabled: boolean("whatsapp_enabled").default(false), // WhatsApp service enabled
  whatsappMessageCredits: integer("whatsapp_message_credits").default(0), // Available message credits
  whatsappPricePerBlock: decimal("whatsapp_price_per_block", { precision: 10, scale: 2 }).default("29.99"), // Price per 1000 messages
  whatsappSubscriptionStatus: varchar("whatsapp_subscription_status").default("inactive"), // active, inactive, suspended
  whatsappLastRefill: timestamp("whatsapp_last_refill"),
  whatsappUsedMessages: integer("whatsapp_used_messages").default(0), // Messages used this period
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
  deliveryTrackingEnabled: boolean("delivery_tracking_enabled").default(false), // Per-tenant BETA override
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System roles for VetGroom platform
export const systemRoles = pgTable("system_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // developer, sysadmin
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  systemLevel: boolean("system_level").default(true), // true for system-wide access
  createdAt: timestamp("created_at").defaultNow(),
});

// User system role assignments (for VetGroom developers/sysadmins)
export const userSystemRoles = pgTable("user_system_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  systemRoleId: varchar("system_role_id").notNull().references(() => systemRoles.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Roles definition for tenant-level access
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id), // null for global roles
  name: varchar("name").notNull(), // recepcion, grooming, medical, admin, autoentregas
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  pageAccess: varchar("page_access").notNull().default("none"), // all, some, one, none
  allowedPages: varchar("allowed_pages").array().default(sql`ARRAY[]::varchar[]`), // specific pages when pageAccess is 'some' or 'one'
  permissions: varchar("permissions").array().notNull().default(sql`ARRAY[]::varchar[]`), // array of permissions like ['view_appointments', 'manage_clients']
  department: varchar("department").notNull(), // reception, grooming, medical, admin, delivery
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Company relationships for supertenant level access
export const userCompanies = pgTable("user_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  roleId: varchar("role_id").references(() => roles.id),
  isSupertenant: boolean("is_supertenant").default(false), // true for company-level admin
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-Tenant relationships with roles
export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  roleId: varchar("role_id").references(() => roles.id),
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
// Saved optimized routes to avoid recalculation
export const savedRoutes = pgTable("saved_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  date: date("date").notNull(),
  appointmentIds: varchar("appointment_ids").array().notNull(), // Array of appointment IDs
  optimizedRoute: jsonb("optimized_route").notNull(), // Cached route data
  routeHash: varchar("route_hash").notNull(), // Hash of appointment IDs for quick comparison
  distanceKm: decimal("distance_km", { precision: 8, scale: 2 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BETA feature usage tracking for super admin
export const betaFeatureUsage = pgTable("beta_feature_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  featureName: varchar("feature_name").notNull(), // 'delivery_tracking'
  companyId: varchar("company_id").notNull().references(() => companies.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  usageCount: integer("usage_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// New tables for billing and delivery integration
export const billingInvoices = pgTable("billing_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id),
  groomingRecordId: varchar("grooming_record_id").references(() => groomingRecords.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  invoiceDate: date("invoice_date").notNull().default(sql`CURRENT_DATE`),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  suppliesCost: decimal("supplies_cost", { precision: 10, scale: 2 }).default("0"),
  servicesCost: decimal("services_cost", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status").notNull().default("pending"), // pending, paid, overdue, cancelled
  paymentDate: date("payment_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyBillingConfig = pgTable("company_billing_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  autoGenerateMedicalInvoices: boolean("auto_generate_medical_invoices").default(false),
  autoGenerateGroomingInvoices: boolean("auto_generate_grooming_invoices").default(false),
  allowAdvanceScheduling: boolean("allow_advance_scheduling").default(true),
  autoScheduleDelivery: boolean("auto_schedule_delivery").default(false),
  deliverySchedulingRules: jsonb("delivery_scheduling_rules"), // Configuration for when to schedule delivery
  billingRules: jsonb("billing_rules"), // Configuration for billing automation
  groomingFollowUpDays: integer("grooming_follow_up_days").default(30), // Default days for next grooming appointment
  groomingFollowUpVariance: integer("grooming_follow_up_variance").default(7), // ± days for follow-up reminders
  enableGroomingFollowUp: boolean("enable_grooming_follow_up").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompany: index("unique_company_billing_config").on(table.companyId),
}));

export const deliverySchedule = pgTable("delivery_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  groomingRecordId: varchar("grooming_record_id").references(() => groomingRecords.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  pickupDate: date("pickup_date"),
  deliveryDate: date("delivery_date").notNull(),
  pickupTime: time("pickup_time"),
  deliveryTime: time("delivery_time"),
  status: varchar("status").notNull().default("scheduled"), // scheduled, in_transit, delivered, cancelled
  driverId: varchar("driver_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical records table is already defined above - just add appointmentId column via migration

// Type exports for new tables
export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;
export type CompanyBillingConfig = typeof companyBillingConfig.$inferSelect;
export type InsertCompanyBillingConfig = typeof companyBillingConfig.$inferInsert;
export type DeliverySchedule = typeof deliverySchedule.$inferSelect;
export type InsertDeliverySchedule = typeof deliverySchedule.$inferInsert;

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

// Van management for delivery routes
export const vans = pgTable("vans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  capacity: varchar("capacity", { length: 10 }).notNull().default("medium"), // small, medium, large
  maxPets: integer("max_pets").notNull().default(15),
  maxWeight: integer("max_weight").notNull().default(100), // kg
  dailyRoutes: integer("daily_routes").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical Appointments - comprehensive appointment-based workflow
export const medicalAppointments = pgTable("medical_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  veterinarianId: varchar("veterinarian_id").notNull().references(() => staff.id),
  roomId: varchar("room_id").references(() => rooms.id),
  visitDate: timestamp("visit_date").notNull(),
  visitType: varchar("visit_type").notNull(), // consultation, checkup, surgery, emergency, follow_up
  chiefComplaint: text("chief_complaint"),
  symptoms: text("symptoms").array().default(sql`ARRAY[]::text[]`),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  treatmentPlan: text("treatment_plan"),
  medicines: jsonb("medicines"), // Array of prescribed medicines with dosage
  followUpInstructions: text("follow_up_instructions"),
  notes: text("notes"),
  vitals: jsonb("vitals"), // temperature, weight, heart_rate, etc.
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  isConfirmed: boolean("is_confirmed").default(false),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by").references(() => staff.id),
  invoiceGenerated: boolean("invoice_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep medical records for compatibility
export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  veterinarianId: varchar("veterinarian_id").notNull().references(() => staff.id),
  visitDate: date("visit_date").notNull(),
  visitType: varchar("visit_type").notNull(), // consultation, checkup, surgery, emergency
  chiefComplaint: text("chief_complaint"), // main reason for visit
  symptoms: text("symptoms").array().default(sql`ARRAY[]::text[]`),
  diagnosis: text("diagnosis").notNull(),
  treatmentPlan: text("treatment_plan"),
  notes: text("notes"),
  vitals: jsonb("vitals"), // temperature, weight, heart_rate, etc.
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: date("follow_up_date"),
  status: varchar("status").default("active"), // active, resolved, ongoing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prescriptions - medications prescribed to pets
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  medicalRecordId: varchar("medical_record_id").notNull().references(() => medicalRecords.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  veterinarianId: varchar("veterinarian_id").notNull().references(() => staff.id),
  medicationName: varchar("medication_name").notNull(),
  dosage: varchar("dosage").notNull(),
  frequency: varchar("frequency").notNull(), // daily, twice_daily, weekly, etc.
  duration: varchar("duration").notNull(), // 7 days, 2 weeks, etc.
  instructions: text("instructions"),
  prescriptionDate: date("prescription_date").notNull(),
  status: varchar("status").default("active"), // active, completed, discontinued
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical Documents - files and images associated with medical appointments
export const medicalDocuments = pgTable("medical_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  appointmentId: varchar("appointment_id").notNull().references(() => medicalAppointments.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileType: varchar("file_type").notNull(), // image/jpeg, application/pdf, etc.
  fileSize: integer("file_size"), // in bytes
  documentType: varchar("document_type").notNull(), // x_ray, lab_result, prescription, photo, form, report, other
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vaccination Records - track pet vaccinations
export const vaccinationRecords = pgTable("vaccination_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  vaccineName: varchar("vaccine_name").notNull(),
  batchNumber: varchar("batch_number"),
  administeredBy: varchar("administered_by").notNull().references(() => staff.id),
  administeredDate: date("administered_date").notNull(),
  nextDueDate: date("next_due_date"),
  sideEffects: text("side_effects"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Grooming Records - detailed grooming history and preferences
export const groomingRecords = pgTable("grooming_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  groomerId: varchar("groomer_id").notNull().references(() => staff.id),
  groomingDate: date("grooming_date").notNull(),
  services: varchar("services").array().notNull(), // bath, haircut, nail_trim, ear_cleaning, etc.
  notes: text("notes"),
  beforePhotos: text("before_photos").array().default(sql`ARRAY[]::text[]`),
  afterPhotos: text("after_photos").array().default(sql`ARRAY[]::text[]`),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  status: varchar("status").notNull().default("in_progress"), // in_progress, completed, billed
  nextAppointmentRecommended: boolean("next_appointment_recommended").default(false),
  nextAppointmentDate: date("next_appointment_date"),
  completedAt: timestamp("completed_at"),
  billedAt: timestamp("billed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pet Health Profiles - comprehensive health information
export const petHealthProfiles = pgTable("pet_health_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  petId: varchar("pet_id").primaryKey().references(() => pets.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  allergies: text("allergies").array().default(sql`ARRAY[]::text[]`),
  chronicConditions: text("chronic_conditions").array().default(sql`ARRAY[]::text[]`),
  currentMedications: jsonb("current_medications"),
  dietaryRestrictions: text("dietary_restrictions"),
  emergencyContacts: jsonb("emergency_contacts"),
  microchipNumber: varchar("microchip_number"),
  insuranceProvider: varchar("insurance_provider"),
  insurancePolicyNumber: varchar("insurance_policy_number"),
  specialNeeds: text("special_needs"),
  behavioralNotes: text("behavioral_notes"),
  preferredVeterinarian: varchar("preferred_veterinarian").references(() => staff.id),
  preferredGroomer: varchar("preferred_groomer").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vansRelations = relations(vans, ({ one }) => ({
  tenant: one(tenants, {
    fields: [vans.tenantId],
    references: [tenants.id],
  }),
}));

export type InsertVan = typeof vans.$inferInsert;
export type Van = typeof vans.$inferSelect;

// Medical and grooming types
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

export type VaccinationRecord = typeof vaccinationRecords.$inferSelect;
export type InsertVaccinationRecord = typeof vaccinationRecords.$inferInsert;

export type GroomingRecord = typeof groomingRecords.$inferSelect;
export type InsertGroomingRecord = typeof groomingRecords.$inferInsert;

export type PetHealthProfile = typeof petHealthProfiles.$inferSelect;
export type InsertPetHealthProfile = typeof petHealthProfiles.$inferInsert;

export type MedicalDocument = typeof medicalDocuments.$inferSelect;
export type InsertMedicalDocument = typeof medicalDocuments.$inferInsert;

// Invoice queue for confirmed services
export const invoiceQueue = pgTable("invoice_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  serviceType: varchar("service_type", { enum: ["medical", "grooming", "product", "medicine"] }).notNull(),
  serviceId: varchar("service_id").notNull(), // ID of the service (medical appointment, grooming, etc.)
  serviceName: varchar("service_name").notNull(),
  serviceDescription: text("service_description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "invoiced", "paid", "cancelled"] }).default("pending"),
  confirmedBy: varchar("confirmed_by").references(() => staff.id),
  confirmedAt: timestamp("confirmed_at"),
  invoicedAt: timestamp("invoiced_at"),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { enum: ["cash", "card", "transfer", "advance"] }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff room assignments (for tracking room changes)
export const staffRoomAssignments = pgTable("staff_room_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => staff.id),
  shiftStart: timestamp("shift_start"),
  shiftEnd: timestamp("shift_end"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// New type exports
export type MedicalAppointment = typeof medicalAppointments.$inferSelect;
export type InsertMedicalAppointment = typeof medicalAppointments.$inferInsert;

export type InvoiceQueue = typeof invoiceQueue.$inferSelect;
export type InsertInvoiceQueue = typeof invoiceQueue.$inferInsert;

export type StaffRoomAssignment = typeof staffRoomAssignments.$inferSelect;
export type InsertStaffRoomAssignment = typeof staffRoomAssignments.$inferInsert;

// Route optimization configuration for companies
export const routeOptimizationConfig = pgTable("route_optimization_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  provider: varchar("provider", { enum: ["mapbox", "google", "here", "none"] }).default("none"),
  isEnabled: boolean("is_enabled").default(false),
  apiKey: varchar("api_key"), // Encrypted storage
  monthlyUsageLimit: integer("monthly_usage_limit").default(1000),
  currentUsage: integer("current_usage").default(0),
  pricePerRequest: decimal("price_per_request", { precision: 10, scale: 4 }).default("0.005"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RouteOptimizationConfig = typeof routeOptimizationConfig.$inferSelect;
export type InsertRouteOptimizationConfig = typeof routeOptimizationConfig.$inferInsert;

// Delivery tracking for real-time monitoring
export const deliveryTracking = pgTable("delivery_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  vanId: varchar("van_id").notNull().references(() => vans.id),
  driverId: varchar("driver_id").notNull().references(() => staff.id),
  routeId: varchar("route_id").notNull(),
  status: varchar("status", { enum: ["preparing", "en_route", "delayed", "completed", "emergency"] }).default("preparing"),
  departureTime: timestamp("departure_time"),
  estimatedReturnTime: timestamp("estimated_return_time"),
  actualReturnTime: timestamp("actual_return_time"),
  delayMinutes: integer("delay_minutes").default(0),
  currentLocation: jsonb("current_location"), // { lat, lng, timestamp }
  lastCheckIn: timestamp("last_check_in"),
  nextCheckInDue: timestamp("next_check_in_due"),
  alertsSent: integer("alerts_sent").default(0),
  emergencyContact: varchar("emergency_contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery alerts for admin, owner, and driver notifications
export const deliveryAlerts = pgTable("delivery_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  deliveryTrackingId: varchar("delivery_tracking_id").notNull().references(() => deliveryTracking.id),
  alertType: varchar("alert_type", { enum: ["delay_warning", "delay_critical", "missed_checkin", "emergency", "route_complete"] }).notNull(),
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  recipientType: varchar("recipient_type", { enum: ["admin", "owner", "driver", "backup_driver"] }).notNull(),
  recipientId: varchar("recipient_id").references(() => staff.id),
  message: text("message").notNull(),
  whatsappSent: boolean("whatsapp_sent").default(false),
  whatsappResponse: jsonb("whatsapp_response"),
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver check-ins for monitoring delivery progress
export const driverCheckIns = pgTable("driver_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryTrackingId: varchar("delivery_tracking_id").notNull().references(() => deliveryTracking.id),
  driverId: varchar("driver_id").notNull().references(() => staff.id),
  checkInType: varchar("check_in_type", { enum: ["departure", "pickup", "delivery", "break", "return", "emergency"] }).notNull(),
  location: jsonb("location"), // { lat, lng, address }
  notes: text("notes"),
  photoUrl: varchar("photo_url"), // Optional photo proof
  estimatedNextCheckIn: timestamp("estimated_next_check_in"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deliveryTracking.tenantId],
    references: [tenants.id],
  }),
  van: one(vans, {
    fields: [deliveryTracking.vanId],
    references: [vans.id],
  }),
  driver: one(staff, {
    fields: [deliveryTracking.driverId],
    references: [staff.id],
  }),
  // route: one(deliveryRoutes, {
  //   fields: [deliveryTracking.routeId],
  //   references: [deliveryRoutes.id],
  // }),
  alerts: many(deliveryAlerts),
  checkIns: many(driverCheckIns),
}));

export const deliveryAlertsRelations = relations(deliveryAlerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [deliveryAlerts.tenantId],
    references: [tenants.id],
  }),
  deliveryTracking: one(deliveryTracking, {
    fields: [deliveryAlerts.deliveryTrackingId],
    references: [deliveryTracking.id],
  }),
  recipient: one(staff, {
    fields: [deliveryAlerts.recipientId],
    references: [staff.id],
  }),
  resolvedBy: one(staff, {
    fields: [deliveryAlerts.resolvedBy],
    references: [staff.id],
  }),
}));

export const driverCheckInsRelations = relations(driverCheckIns, ({ one }) => ({
  deliveryTracking: one(deliveryTracking, {
    fields: [driverCheckIns.deliveryTrackingId],
    references: [deliveryTracking.id],
  }),
  driver: one(staff, {
    fields: [driverCheckIns.driverId],
    references: [staff.id],
  }),
}));

export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type InsertDeliveryTracking = typeof deliveryTracking.$inferInsert;

// Payment gateway configuration per company/tenant
export const paymentGatewayConfig = pgTable("payment_gateway_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  gatewayType: varchar("gateway_type", { enum: ["stripe", "mercadopago"] }).notNull(),
  isActive: boolean("is_active").default(true),
  config: jsonb("config").notNull(), // Stores encrypted API keys and settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing queue for staff payment processing
export const billingQueue = pgTable("billing_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  invoiceId: varchar("invoice_id").references(() => billingInvoices.id),
  groomingRecordId: varchar("grooming_record_id").references(() => groomingRecords.id),
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { enum: ["pending", "processing", "paid_cash", "paid_link", "cancelled"] }).default("pending"),
  paymentMethod: varchar("payment_method", { enum: ["cash", "payment_link"] }),
  paymentGateway: varchar("payment_gateway", { enum: ["stripe", "mercadopago"] }),
  paymentLinkUrl: text("payment_link_url"),
  paymentIntentId: varchar("payment_intent_id"),
  processedBy: varchar("processed_by").references(() => staff.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans for the SaaS platform
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // basic, small, medium, big, extra_big, enterprise, custom
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  maxTenants: integer("max_tenants").notNull(), // 1, 3, 6, 10, 20, 50, unlimited
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }),
  features: jsonb("features"), // Array of included features
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company subscriptions
export const companySubscriptions = pgTable("company_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status", { enum: ["active", "cancelled", "suspended", "trial"] }).default("trial"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promotional discounts for subscriptions
export const subscriptionPromotions = pgTable("subscription_promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  discountType: varchar("discount_type", { enum: ["percentage", "fixed_amount"] }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  applicablePlans: jsonb("applicable_plans"), // Array of plan IDs
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for new payment and subscription tables
export type PaymentGatewayConfig = typeof paymentGatewayConfig.$inferSelect;
export type InsertPaymentGatewayConfig = typeof paymentGatewayConfig.$inferInsert;

export type BillingQueue = typeof billingQueue.$inferSelect;
export type InsertBillingQueue = typeof billingQueue.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export type CompanySubscription = typeof companySubscriptions.$inferSelect;
export type InsertCompanySubscription = typeof companySubscriptions.$inferInsert;

export type SubscriptionPromotion = typeof subscriptionPromotions.$inferSelect;
export type InsertSubscriptionPromotion = typeof subscriptionPromotions.$inferInsert;
export type DeliveryAlert = typeof deliveryAlerts.$inferSelect;
export type InsertDeliveryAlert = typeof deliveryAlerts.$inferInsert;  
export type DriverCheckIn = typeof driverCheckIns.$inferSelect;
export type InsertDriverCheckIn = typeof driverCheckIns.$inferInsert;

// Tax configuration per company/tenant for international support
export const taxConfiguration = pgTable("tax_configuration", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  country: varchar("country").notNull().default("Mexico"), // Mexico, USA, Canada, etc.
  taxName: varchar("tax_name").notNull().default("IVA"), // IVA, VAT, GST, Sales Tax
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("16.00"), // 16% for Mexico IVA
  isActive: boolean("is_active").default(true),
  taxId: varchar("tax_id"), // RFC in Mexico, Tax ID in other countries
  businessName: varchar("business_name").notNull(),
  businessAddress: text("business_address").notNull(),
  invoiceNumberPrefix: varchar("invoice_number_prefix").default("FAC"), // FAC, INV, etc.
  invoiceNumberCounter: integer("invoice_number_counter").default(1),
  currencyCode: varchar("currency_code").default("MXN"), // MXN, USD, CAD
  currencySymbol: varchar("currency_symbol").default("$"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pending invoices system for formal veterinary invoicing
export const pendingInvoices = pgTable("pending_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").references(() => pets.id),
  serviceType: varchar("service_type", { enum: ["medical", "grooming", "surgery", "consultation", "vaccination", "emergency", "product"] }).notNull(),
  serviceId: varchar("service_id").notNull(), // Reference to medical appointment, grooming record, etc.
  serviceName: varchar("service_name").notNull(),
  serviceDescription: text("service_description"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  itemizedCosts: jsonb("itemized_costs"), // Array of { item, quantity, unitPrice, total }
  status: varchar("status", { enum: ["pending", "pdf_generated", "sent", "paid", "cancelled", "completed"] }).default("pending"),
  pdfUrl: varchar("pdf_url"), // URL to generated PDF invoice
  paymentLinkUrl: text("payment_link_url"), // Payment link for WhatsApp sharing
  paymentGateway: varchar("payment_gateway", { enum: ["stripe", "mercadopago", "cash"] }),
  whatsappMessage: text("whatsapp_message"), // Pre-formatted message for WhatsApp
  generatedBy: varchar("generated_by").notNull().references(() => staff.id),
  confirmedBy: varchar("confirmed_by").references(() => staff.id),
  paidAt: timestamp("paid_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice line items for detailed cost breakdown
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => pendingInvoices.id),
  itemType: varchar("item_type", { enum: ["service", "medicine", "supply", "consultation", "procedure"] }).notNull(),
  itemName: varchar("item_name").notNull(),
  itemDescription: text("item_description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for the new invoice tables
export const taxConfigurationRelations = relations(taxConfiguration, ({ one }) => ({
  company: one(companies, {
    fields: [taxConfiguration.companyId],
    references: [companies.id],
  }),
  tenant: one(tenants, {
    fields: [taxConfiguration.tenantId],
    references: [tenants.id],
  }),
}));

export const pendingInvoicesRelations = relations(pendingInvoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [pendingInvoices.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [pendingInvoices.clientId],
    references: [clients.id],
  }),
  pet: one(pets, {
    fields: [pendingInvoices.petId],
    references: [pets.id],
  }),
  generatedBy: one(staff, {
    fields: [pendingInvoices.generatedBy],
    references: [staff.id],
  }),
  confirmedBy: one(staff, {
    fields: [pendingInvoices.confirmedBy],
    references: [staff.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(pendingInvoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [pendingInvoices.id],
  }),
}));

// Type exports for invoice system
export type TaxConfiguration = typeof taxConfiguration.$inferSelect;
export type InsertTaxConfiguration = typeof taxConfiguration.$inferInsert;

export type PendingInvoice = typeof pendingInvoices.$inferSelect;
export type InsertPendingInvoice = typeof pendingInvoices.$inferInsert;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

// LateNode Webhook Integration Configuration
export const webhookIntegrations = pgTable("webhook_integrations", {
  id: varchar("id", { length: 50 }).primaryKey().$defaultFn(() => `whi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  companyId: varchar("company_id", { length: 50 }).references(() => companies.id),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Payment Reminders", "Delivery Notifications"
  description: text("description"),
  webhookType: varchar("webhook_type", { length: 50 }).notNull(), // 'payment_reminder', 'delivery_notification', 'pickup_confirmation', 'general'
  endpointUrl: varchar("endpoint_url", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 200 }), // Encrypted API key
  secretKey: varchar("secret_key", { length: 200 }), // Encrypted secret for webhook validation
  isActive: boolean("is_active").default(true),
  headers: jsonb("headers").$type<Record<string, string>>().default({}), // Additional headers
  retryAttempts: integer("retry_attempts").default(3),
  timeoutMs: integer("timeout_ms").default(30000),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const webhookIntegrationsRelations = relations(webhookIntegrations, ({ one }) => ({
  company: one(companies, {
    fields: [webhookIntegrations.companyId],
    references: [companies.id],
  }),
}));

// Webhook execution logs for monitoring
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id", { length: 50 }).primaryKey().$defaultFn(() => `whl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  webhookIntegrationId: varchar("webhook_integration_id", { length: 50 }).references(() => webhookIntegrations.id),
  tenantId: varchar("tenant_id", { length: 50 }).references(() => tenants.id),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'payment_reminder', 'delivery_update', etc.
  triggerData: jsonb("trigger_data").$type<Record<string, any>>().default({}),
  requestPayload: jsonb("request_payload").$type<Record<string, any>>().default({}),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  success: boolean("success").default(false),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  webhookIntegration: one(webhookIntegrations, {
    fields: [webhookLogs.webhookIntegrationId],
    references: [webhookIntegrations.id],
  }),
  tenant: one(tenants, {
    fields: [webhookLogs.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports for webhook system
export type WebhookIntegration = typeof webhookIntegrations.$inferSelect;
export type InsertWebhookIntegration = typeof webhookIntegrations.$inferInsert;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

// WhatsApp message usage tracking
export const whatsappMessageUsage = pgTable("whatsapp_message_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  tenantId: varchar("tenant_id").references(() => tenants.id), // null for company-wide usage
  messageType: varchar("message_type").notNull(), // 'outbound', 'inbound'
  messageCount: integer("message_count").notNull().default(1),
  triggerType: varchar("trigger_type"), // 'payment_reminder', 'appointment_confirmation', etc.
  costPerMessage: decimal("cost_per_message", { precision: 10, scale: 4 }).default("0.0299"), // Based on LateNode costs
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  usageDate: date("usage_date").notNull().default(sql`CURRENT_DATE`),
  businessHours: boolean("business_hours").default(true), // Affects pricing
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappMessageUsageRelations = relations(whatsappMessageUsage, ({ one }) => ({
  company: one(companies, {
    fields: [whatsappMessageUsage.companyId],
    references: [companies.id],
  }),
  tenant: one(tenants, {
    fields: [whatsappMessageUsage.tenantId],
    references: [tenants.id],
  }),
}));

// External service subscriptions for companies
export const externalServiceSubscriptions = pgTable("external_service_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  serviceName: varchar("service_name").notNull(), // 'whatsapp', 'email', 'sms'
  serviceType: varchar("service_type").notNull(), // 'communication', 'analytics', 'integration'
  subscriptionStatus: varchar("subscription_status").default("inactive"), // active, inactive, suspended
  creditsRemaining: integer("credits_remaining").default(0),
  creditsTotal: integer("credits_total").default(0),
  pricePerBlock: decimal("price_per_block", { precision: 10, scale: 2 }).default("29.99"),
  blockSize: integer("block_size").default(1000), // Messages per block
  autoRefill: boolean("auto_refill").default(false),
  lowCreditThreshold: integer("low_credit_threshold").default(100), // Warning threshold
  lastRefillDate: timestamp("last_refill_date"),
  nextBillingDate: timestamp("next_billing_date"),
  usageThisPeriod: integer("usage_this_period").default(0),
  settings: jsonb("settings"), // Service-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const externalServiceSubscriptionsRelations = relations(externalServiceSubscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [externalServiceSubscriptions.companyId],
    references: [companies.id],
  }),
}));

// Type exports for external services
export type WhatsappMessageUsage = typeof whatsappMessageUsage.$inferSelect;
export type InsertWhatsappMessageUsage = typeof whatsappMessageUsage.$inferInsert;

export type ExternalServiceSubscription = typeof externalServiceSubscriptions.$inferSelect;
export type InsertExternalServiceSubscription = typeof externalServiceSubscriptions.$inferInsert;

