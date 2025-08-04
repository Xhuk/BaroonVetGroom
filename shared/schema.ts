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

// Medical Records - patient medical history and diagnoses
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
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  groomerId: varchar("groomer_id").notNull().references(() => staff.id),
  groomingDate: date("grooming_date").notNull(),
  servicesProvided: varchar("services_provided").array().notNull(), // bath, haircut, nail_trim, ear_cleaning, etc.
  coatCondition: varchar("coat_condition"), // excellent, good, fair, poor
  skinCondition: varchar("skin_condition"), // healthy, dry, irritated, infected
  behaviorNotes: text("behavior_notes"),
  specialInstructions: text("special_instructions"),
  productsUsed: jsonb("products_used"), // shampoos, conditioners, tools
  beforePhotos: text("before_photos").array().default(sql`ARRAY[]::text[]`),
  afterPhotos: text("after_photos").array().default(sql`ARRAY[]::text[]`),
  duration: integer("duration"), // minutes spent
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  clientSatisfaction: integer("client_satisfaction"), // 1-5 rating
  notes: text("notes"),
  nextGroomingDate: date("next_grooming_date"),
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
export type DeliveryAlert = typeof deliveryAlerts.$inferSelect;
export type InsertDeliveryAlert = typeof deliveryAlerts.$inferInsert;
export type DriverCheckIn = typeof driverCheckIns.$inferSelect;
export type InsertDriverCheckIn = typeof driverCheckIns.$inferInsert;