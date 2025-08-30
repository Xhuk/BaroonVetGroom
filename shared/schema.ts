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
  password: varchar("password"), // Add password field for local authentication
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
  // Auto Status Update Service Settings
  autoStatusUpdateEnabled: boolean("auto_status_update_enabled").default(false), // Enable/disable auto status updates
  autoStatusUpdateInterval: integer("auto_status_update_interval").default(5), // Check interval in minutes
  autoStatusUpdateLastRun: timestamp("auto_status_update_last_run"),
  // Pet Age Management Settings
  petAgeUpdateEnabled: boolean("pet_age_update_enabled").default(true), // Enable/disable automatic pet age updates
  petAgeUpdateInterval: integer("pet_age_update_interval").default(1440), // Check interval in minutes (24 hours)
  petAgeUpdateLastRun: timestamp("pet_age_update_last_run"),
  // Calendar Auto-Return Settings
  calendarAutoReturnEnabled: boolean("calendar_auto_return_enabled").default(true), // Enable/disable calendar auto-return to today
  calendarAutoReturnTimeout: integer("calendar_auto_return_timeout").default(60), // Timeout in seconds (default: 60 seconds = 1 minute)
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
  salaryBasis: varchar("salary_basis").default("per_month"), // per_day, per_month
  // Salary configuration fields
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).default("0.00"),
  isrEnabled: boolean("isr_enabled").default(true),
  imssEnabled: boolean("imss_enabled").default(true),
  imssEmployeePercentage: decimal("imss_employee_percentage", { precision: 5, scale: 3 }).default("2.375"),
  imssEmployerPercentage: decimal("imss_employer_percentage", { precision: 5, scale: 3 }).default("10.525"),
  infonavitEnabled: boolean("infonavit_enabled").default(false),
  infonavitPercentage: decimal("infonavit_percentage", { precision: 4, scale: 2 }).default("0.00"),
  fonacotEnabled: boolean("fonacot_enabled").default(false),
  fonacotAmount: decimal("fonacot_amount", { precision: 10, scale: 2 }).default("0.00"),
  paymentFrequency: varchar("payment_frequency").default("monthly"), // weekly, biweekly, monthly
  lastPaymentDate: timestamp("last_payment_date"),
  isActive: boolean("is_active").default(true),
  // Shift management fields
  allowsShiftSwap: boolean("allows_shift_swap").default(true),
  maxWeeklyHours: integer("max_weekly_hours").default(40),
  preferredShiftType: varchar("preferred_shift_type"), // morning, afternoon, evening, night
  createdAt: timestamp("created_at").defaultNow(),
});

// Shift patterns/templates for dynamic scheduling
export const shiftPatterns = pgTable("shift_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(), // "Morning Shift", "Evening Shift", "Night Shift"
  displayName: varchar("display_name").notNull(),
  startTime: time("start_time").notNull(), // 09:00
  endTime: time("end_time").notNull(), // 17:00
  breakDuration: integer("break_duration").default(60), // minutes
  shiftType: varchar("shift_type").notNull(), // morning, afternoon, evening, night
  color: varchar("color").default("#3B82F6"), // hex color for UI
  icon: varchar("icon").default("☀️"), // emoji or icon name
  isActive: boolean("is_active").default(true),
  allowOvertime: boolean("allow_overtime").default(false),
  overtimeRate: decimal("overtime_rate", { precision: 4, scale: 2 }).default("1.50"), // 1.5x regular rate
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shift assignments - who works when and where
export const shiftAssignments = pgTable("shift_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  shiftPatternId: varchar("shift_pattern_id").notNull().references(() => shiftPatterns.id),
  assignedDate: date("assigned_date").notNull(),
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled, no_show
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  notes: text("notes"),
  // GPS tracking
  clockInLocation: jsonb("clock_in_location"), // {lat, lng, address}
  clockOutLocation: jsonb("clock_out_location"), // {lat, lng, address}
  isRemoteWork: boolean("is_remote_work").default(false),
  approvedBy: varchar("approved_by").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ShiftPattern = typeof shiftPatterns.$inferSelect;
export type InsertShiftPattern = typeof shiftPatterns.$inferInsert;

export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = typeof shiftAssignments.$inferInsert;

// Shift rotation patterns for automatic scheduling
export const shiftRotations = pgTable("shift_rotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(), // "3 Week Rotation", "Monthly Rotation"
  rotationFrequency: varchar("rotation_frequency").notNull(), // weekly, biweekly, monthly
  rotationWeeks: integer("rotation_weeks").default(3), // how many weeks in cycle
  isActive: boolean("is_active").default(true),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ShiftRotation = typeof shiftRotations.$inferSelect;
export type InsertShiftRotation = typeof shiftRotations.$inferInsert;

// Team assignments for rotation patterns
export const rotationTeams = pgTable("rotation_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rotationId: varchar("rotation_id").notNull().references(() => shiftRotations.id),
  teamNumber: integer("team_number").notNull(), // 1, 2, 3
  teamName: varchar("team_name"), // "Team A", "Team 1"
  maxEmployees: integer("max_employees").default(10),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff assignments to rotation teams
export const rotationTeamMembers = pgTable("rotation_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => rotationTeams.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Rotation schedule - which team works which shift pattern during which week
export const rotationSchedules = pgTable("rotation_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rotationId: varchar("rotation_id").notNull().references(() => shiftRotations.id),
  teamId: varchar("team_id").notNull().references(() => rotationTeams.id),
  shiftPatternId: varchar("shift_pattern_id").notNull().references(() => shiftPatterns.id),
  weekNumber: integer("week_number").notNull(), // 1, 2, 3 (relative to rotation cycle)
  dayOfWeek: integer("day_of_week").notNull(), // 1=Monday, 7=Sunday
  createdAt: timestamp("created_at").defaultNow(),
});

// Time tracking and attendance details
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  shiftAssignmentId: varchar("shift_assignment_id").references(() => shiftAssignments.id),
  entryType: varchar("entry_type").notNull(), // clock_in, clock_out, break_start, break_end
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  location: jsonb("location"), // {lat, lng, address, accuracy}
  deviceInfo: jsonb("device_info"), // device details for security
  ipAddress: varchar("ip_address"),
  photo: varchar("photo"), // optional selfie for clock in/out
  notes: text("notes"),
  isManualEntry: boolean("is_manual_entry").default(false),
  approvedBy: varchar("approved_by").references(() => staff.id),
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
  registeredAge: integer("registered_age"), // Age at registration time
  birthDate: date("birth_date"), // For automatic age calculation
  weight: decimal("weight", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true), // For active/inactive status (deceased pets)
  medicalHistory: jsonb("medical_history"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Medical disclaimers and consent forms
export const medicalDisclaimers = pgTable("medical_disclaimers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  title: varchar("title").notNull(),
  content: text("content").notNull(), // Rich text content
  category: varchar("category").notNull(), // 'medical', 'surgical', 'grooming', 'general'
  isActive: boolean("is_active").default(true),
  requiresSignature: boolean("requires_signature").default(true),
  isPrintable: boolean("is_printable").default(true),
  templateVersion: varchar("template_version").default("1.0"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Disclaimer usage/activation tracking
export const disclaimerUsage = pgTable("disclaimer_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disclaimerId: varchar("disclaimer_id").notNull().references(() => medicalDisclaimers.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id),
  followUpTaskId: varchar("follow_up_task_id").references(() => followUpTasks.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").references(() => pets.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  pdfPath: varchar("pdf_path"), // Path to generated PDF
  signedBy: varchar("signed_by"), // Client name who signed
  signedAt: timestamp("signed_at"),
  wasPrinted: boolean("was_printed").default(false),
  printedAt: timestamp("printed_at"),
  status: varchar("status").notNull().default("pending"), // pending, signed, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MedicalDisclaimer = typeof medicalDisclaimers.$inferSelect;
export type InsertMedicalDisclaimer = typeof medicalDisclaimers.$inferInsert;
export type DisclaimerUsage = typeof disclaimerUsage.$inferSelect;
export type InsertDisclaimerUsage = typeof disclaimerUsage.$inferInsert;

// Service activation and usage tracking tables
export const serviceActivations = pgTable("service_activations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  serviceId: varchar("service_id").notNull(),
  isActive: boolean("is_active").default(true),
  activatedAt: timestamp("activated_at").defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  monthlyLimit: integer("monthly_limit").notNull(), // e.g., 1000 WhatsApp messages
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  paymentIntentId: varchar("payment_intent_id"),
  autoRenewal: boolean("auto_renewal").default(false),
  renewalThreshold: decimal("renewal_threshold", { precision: 5, scale: 2 }).default("0.15"), // 15%
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceUsage = pgTable("service_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceActivationId: varchar("service_activation_id").notNull().references(() => serviceActivations.id, { onDelete: 'cascade' }),
  usageType: varchar("usage_type").notNull(), // 'whatsapp_message', 'sms_message', 'email_sent', etc.
  amount: integer("amount").notNull().default(1),
  metadata: jsonb("metadata"), // Additional data like recipient, message_id, etc.
  timestamp: timestamp("timestamp").defaultNow(),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
});

export const serviceRenewals = pgTable("service_renewals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceActivationId: varchar("service_activation_id").notNull().references(() => serviceActivations.id, { onDelete: 'cascade' }),
  renewalDate: timestamp("renewal_date").defaultNow(),
  previousPeriodStart: timestamp("previous_period_start").notNull(),
  previousPeriodEnd: timestamp("previous_period_end").notNull(),
  newPeriodStart: timestamp("new_period_start").notNull(),
  newPeriodEnd: timestamp("new_period_end").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentIntentId: varchar("payment_intent_id"),
  status: varchar("status").notNull().default("completed"), // completed, failed, pending
  triggerReason: varchar("trigger_reason").notNull(), // 'auto_renewal', 'manual_renewal', 'usage_threshold'
});

export type ServiceActivation = typeof serviceActivations.$inferSelect;
export type InsertServiceActivation = typeof serviceActivations.$inferInsert;
export type ServiceUsage = typeof serviceUsage.$inferSelect;
export type InsertServiceUsage = typeof serviceUsage.$inferInsert;
export type ServiceRenewal = typeof serviceRenewals.$inferSelect;
export type InsertServiceRenewal = typeof serviceRenewals.$inferInsert;

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
  // Follow-up Configuration
  followUpNormalThreshold: integer("follow_up_normal_threshold").default(10),
  followUpUrgentThreshold: integer("follow_up_urgent_threshold").default(20),
  followUpHeartBeatEnabled: boolean("follow_up_heart_beat_enabled").default(true),
  followUpShowCount: boolean("follow_up_show_count").default(true),
  followUpAutoGenerationInterval: integer("follow_up_auto_generation_interval").default(15), // Minutes between auto-generation checks
  // Clinical Intervention Pricing Configuration
  clinicalInterventionPricing: varchar("clinical_intervention_pricing", { 
    enum: ["operation_plus_items", "flat_price"] 
  }).default("operation_plus_items"),
  enableItemizedCharges: boolean("enable_itemized_charges").default(true),
  allowCashierAddItems: boolean("allow_cashier_add_items").default(true),
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

// Slot reservations for click-to-book soft locking
export const slotReservations = pgTable("slot_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: time("scheduled_time").notNull(),
  serviceId: varchar("service_id"),
  expiresAt: timestamp("expires_at").notNull(), // 15 minutes from creation
  createdAt: timestamp("created_at").defaultNow(),
});

export type SlotReservation = typeof slotReservations.$inferSelect;
export type InsertSlotReservation = typeof slotReservations.$inferInsert;

export type VanCage = typeof vanCages.$inferSelect;
export type InsertVanCage = typeof vanCages.$inferInsert;
export type CageAssignment = typeof cageAssignments.$inferSelect;
export type InsertCageAssignment = typeof cageAssignments.$inferInsert;

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
  // Cage layout configuration
  cageLayout: jsonb("cage_layout"), // JSON structure for cage positions and sizes
  totalCages: integer("total_cages").default(0),
  layoutWidth: integer("layout_width").default(3), // Grid width (columns)
  layoutHeight: integer("layout_height").default(5), // Grid height (rows)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual cage configurations within vans
export const vanCages = pgTable("van_cages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vanId: varchar("van_id").notNull().references(() => vans.id),
  cageNumber: integer("cage_number").notNull(), // Unique number within the van
  size: varchar("size").notNull().default("medium"), // small, medium, large
  type: varchar("type").notNull().default("mixed"), // cat, dog, mixed
  position: jsonb("position").notNull(), // {x: 0, y: 0, width: 1, height: 1}
  maxWeight: integer("max_weight").default(25), // kg per cage
  isOccupied: boolean("is_occupied").default(false),
  occupantPetId: varchar("occupant_pet_id").references(() => pets.id),
  notes: text("notes"), // Special instructions or cage details
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cage assignment history for tracking
export const cageAssignments = pgTable("cage_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cageId: varchar("cage_id").notNull().references(() => vanCages.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  unassignedAt: timestamp("unassigned_at"),
  assignedBy: varchar("assigned_by").references(() => staff.id), // Staff member who made assignment
  reason: varchar("reason").default("transport"), // transport, medical, isolation
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Shift configurations table
export const shiftConfigurations = pgTable("shift_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  shiftType: varchar("shift_type").notNull(), // morning, afternoon, evening
  name: varchar("name").notNull(), // TURNO MATUTINO, TURNO VESPERTINO, TURNO NOCTURNO
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff shift assignments table
export const staffShiftAssignments = pgTable("staff_shift_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  shiftType: varchar("shift_type").notNull(), // morning, afternoon, evening
  assignedDate: date("assigned_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New type exports
export type MedicalAppointment = typeof medicalAppointments.$inferSelect;
export type InsertMedicalAppointment = typeof medicalAppointments.$inferInsert;

export type ShiftConfiguration = typeof shiftConfigurations.$inferSelect;
export type InsertShiftConfiguration = typeof shiftConfigurations.$inferInsert;

export type StaffShiftAssignment = typeof staffShiftAssignments.$inferSelect;
export type InsertStaffShiftAssignment = typeof staffShiftAssignments.$inferInsert;

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

// Fraccionamientos management for route optimization
export const fraccionamientos = pgTable("fraccionamientos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  displayName: varchar("display_name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  weight: decimal("weight", { precision: 4, scale: 2 }).default("1.0"), // Route optimization weight (1.0 = normal, higher = priority)
  priority: integer("priority").default(1), // Delivery priority (1 = highest)
  isActive: boolean("is_active").default(true),
  postalCode: varchar("postal_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RouteOptimizationConfig = typeof routeOptimizationConfig.$inferSelect;
export type InsertRouteOptimizationConfig = typeof routeOptimizationConfig.$inferInsert;

export type Fraccionamiento = typeof fraccionamientos.$inferSelect;
export type InsertFraccionamiento = typeof fraccionamientos.$inferInsert;

// Follow-up tasks for tracking missing information and required actions
export const followUpTasks = pgTable("follow_up_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  medicalAppointmentId: varchar("medical_appointment_id").references(() => medicalAppointments.id),
  groomingRecordId: varchar("grooming_record_id").references(() => groomingRecords.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  taskType: varchar("task_type").notNull(), // medical_follow_up, grooming_follow_up, missing_diagnosis, missing_treatment, missing_price, missing_medicine, incomplete_record
  priority: varchar("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal"),
  title: varchar("title").notNull(),
  description: text("description"),
  missingFields: text("missing_fields").array().default(sql`ARRAY[]::text[]`), // Array of missing field names
  dueDate: date("due_date"),
  assignedTo: varchar("assigned_to").references(() => staff.id),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).default("pending"),
  completedBy: varchar("completed_by").references(() => staff.id),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Additional context or custom data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FollowUpTask = typeof followUpTasks.$inferSelect;
export type InsertFollowUpTask = typeof followUpTasks.$inferInsert;

// Delivery routes for actual driver route management
export const deliveryRoutes = pgTable("delivery_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  driverId: varchar("driver_id").references(() => staff.id),
  status: varchar("status", { enum: ["scheduled", "in_progress", "completed", "cancelled"] }).default("scheduled"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes, calculated from completion times
  totalDistance: decimal("total_distance", { precision: 8, scale: 2 }), // in kilometers
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual stops within a delivery route
export const deliveryRouteStops = pgTable("delivery_route_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => deliveryRoutes.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  clientId: varchar("client_id").references(() => clients.id),
  address: text("address").notNull(),
  estimatedTime: time("estimated_time"), // estimated time to arrive
  actualArrivalTime: timestamp("actual_arrival_time"), // when driver actually arrived
  actualCompletionTime: timestamp("actual_completion_time"), // when stop was marked complete
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "skipped"] }).default("pending"),
  stopOrder: integer("stop_order").notNull(), // order in route sequence
  services: jsonb("services"), // services to be performed at this stop
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type InsertDeliveryRoute = typeof deliveryRoutes.$inferInsert;

export type DeliveryRouteStop = typeof deliveryRouteStops.$inferSelect;
export type InsertDeliveryRouteStop = typeof deliveryRouteStops.$inferInsert;

// Relations for delivery routes
export const deliveryRoutesRelations = relations(deliveryRoutes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deliveryRoutes.tenantId],
    references: [tenants.id],
  }),
  driver: one(staff, {
    fields: [deliveryRoutes.driverId],
    references: [staff.id],
  }),
  stops: many(deliveryRouteStops),
}));

export const deliveryRouteStopsRelations = relations(deliveryRouteStops, ({ one }) => ({
  route: one(deliveryRoutes, {
    fields: [deliveryRouteStops.routeId],
    references: [deliveryRoutes.id],
  }),
  appointment: one(appointments, {
    fields: [deliveryRouteStops.appointmentId],
    references: [appointments.id],
  }),
  client: one(clients, {
    fields: [deliveryRouteStops.clientId],
    references: [clients.id],
  }),
}));

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
  route: one(deliveryRoutes, {
    fields: [deliveryTracking.routeId],
    references: [deliveryRoutes.id],
  }),
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

// Email configuration for the platform
export const emailConfig = pgTable("email_config", {
  id: varchar("id").primaryKey().default("default"),
  provider: varchar("provider", { enum: ["resend", "sendgrid", "ses"] }).notNull().default("resend"),
  apiKey: text("api_key").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull().default("VetGroom"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Email notification logs
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailType: varchar("email_type").notNull(), // 'subscription_reminder', 'subscription_expired'
  recipientEmail: text("recipient_email").notNull(),
  companyId: varchar("company_id").references(() => companies.id),
  subject: text("subject").notNull(),
  status: varchar("status", { enum: ["sent", "failed", "pending"] }).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Subscription Transactions (Payment records)
export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  subscriptionPlanId: varchar("subscription_plan_id").notNull().references(() => subscriptionPlans.id),
  paymentProvider: varchar("payment_provider").notNull(), // stripe, paypal, mercado_pago
  externalTransactionId: varchar("external_transaction_id"), // Provider's transaction ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("MXN"),
  status: varchar("status").notNull(), // pending, completed, failed, refunded
  billingCycle: varchar("billing_cycle").notNull(), // monthly, yearly
  subscriptionStartDate: timestamp("subscription_start_date").notNull(),
  subscriptionEndDate: timestamp("subscription_end_date").notNull(),
  paymentDate: timestamp("payment_date"),
  webhookData: jsonb("webhook_data"), // Raw webhook payload
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Onboarding Process
export const companyOnboarding = pgTable("company_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  transactionId: varchar("transaction_id").references(() => subscriptionTransactions.id),
  // Company Information
  legalName: varchar("legal_name").notNull(),
  businessType: varchar("business_type"), // clinic, hospital, grooming_salon, mixed
  taxId: varchar("tax_id"), // RFC in Mexico
  phone: varchar("phone"),
  email: varchar("email").notNull(),
  website: varchar("website"),
  // Main Address
  mainAddress: text("main_address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  postalCode: varchar("postal_code").notNull(),
  country: varchar("country").default("MX"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  // Contact Person
  contactPersonName: varchar("contact_person_name").notNull(),
  contactPersonEmail: varchar("contact_person_email").notNull(),
  contactPersonPhone: varchar("contact_person_phone"),
  contactPersonRole: varchar("contact_person_role"), // owner, manager, admin
  // Onboarding Status
  status: varchar("status").default("payment_confirmed"), // payment_confirmed, info_collected, sites_setup, completed
  currentStep: integer("current_step").default(1), // 1=info, 2=sites, 3=activation, 4=complete
  sitesRequested: integer("sites_requested").notNull(), // How many sites they want to set up
  welcomeEmailSent: boolean("welcome_email_sent").default(false),
  loginGuideSent: boolean("login_guide_sent").default(false),
  accountActivated: boolean("account_activated").default(false),
  activatedAt: timestamp("activated_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Onboarding Site Setup (For setting up multiple clinic locations)
export const onboardingSites = pgTable("onboarding_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  onboardingId: varchar("onboarding_id").notNull().references(() => companyOnboarding.id),
  tenantId: varchar("tenant_id").references(() => tenants.id), // Created after setup
  // Site Information
  siteName: varchar("site_name").notNull(),
  siteType: varchar("site_type"), // main, branch, mobile
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  postalCode: varchar("postal_code").notNull(),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  phone: varchar("phone"),
  email: varchar("email"),
  // Operating Hours
  openTime: time("open_time").default("08:00"),
  closeTime: time("close_time").default("18:00"),
  timeSlotDuration: integer("time_slot_duration").default(30),
  // Setup Status
  isMainSite: boolean("is_main_site").default(false),
  setupCompleted: boolean("setup_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for new payment and subscription tables
export type PaymentGatewayConfig = typeof paymentGatewayConfig.$inferSelect;
export type InsertPaymentGatewayConfig = typeof paymentGatewayConfig.$inferInsert;

export type BillingQueue = typeof billingQueue.$inferSelect;
export type InsertBillingQueue = typeof billingQueue.$inferInsert;

export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = typeof emailConfig.$inferInsert;

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

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

export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;
export type InsertSubscriptionTransaction = typeof subscriptionTransactions.$inferInsert;

export type CompanyOnboarding = typeof companyOnboarding.$inferSelect;
export type InsertCompanyOnboarding = typeof companyOnboarding.$inferInsert;

export type OnboardingSite = typeof onboardingSites.$inferSelect;
export type InsertOnboardingSite = typeof onboardingSites.$inferInsert;

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
  inventoryUsed: jsonb("inventory_used"), // Array of { itemId, quantity, unitPrice, total } for automatic deduction
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
  inventoryProcessed: boolean("inventory_processed").default(false), // Track if inventory has been deducted
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

export const tempLinks = pgTable('temp_links', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  token: varchar('token', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }).notNull(),
  tenantId: varchar('tenant_id', { length: 100 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  accessCount: integer('access_count').default(0).notNull(),
  maxAccess: integer('max_access'),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
});

// Delivery configuration for tenants
export const deliveryConfig = pgTable("delivery_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  mode: varchar("mode", { enum: ["wave", "free"] }).notNull().default("wave"),
  totalWaves: integer("total_waves").notNull().default(5),
  pickupVans: integer("pickup_vans").notNull().default(2),
  deliveryVans: integer("delivery_vans").notNull().default(3),
  pickupStartTime: varchar("pickup_start_time").notNull().default("08:00"),
  pickupEndTime: varchar("pickup_end_time").notNull().default("12:00"),
  deliveryStartTime: varchar("delivery_start_time").notNull().default("13:00"),
  deliveryEndTime: varchar("delivery_end_time").notNull().default("17:00"),
  freeStartTime: varchar("free_start_time").notNull().default("08:00"),
  freeEndTime: varchar("free_end_time").notNull().default("20:00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for temporary links
export const tempLinksRelations = relations(tempLinks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tempLinks.tenantId],
    references: [tenants.id],
  }),
}));

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

// Sales Order Types
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = typeof salesOrderItems.$inferInsert;



export type DeliveryConfig = typeof deliveryConfig.$inferSelect;
export type InsertDeliveryConfig = typeof deliveryConfig.$inferInsert;

// Sales Orders Management System
export const salesOrders = pgTable("sales_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  customerName: varchar("customer_name").notNull(),
  customerPhone: varchar("customer_phone"),
  customerEmail: varchar("customer_email"),
  customerAddress: text("customer_address"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, confirmed, failed
  paymentMethod: varchar("payment_method"), // credit, cash, gateway
  paymentLink: text("payment_link"),
  receiptLink: text("receipt_link"),
  paymentGatewayTransactionId: varchar("payment_gateway_transaction_id"),
  deliveryStatus: varchar("delivery_status").notNull().default("pending"), // pending, in_transit, delivered, confirmed
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesOrderId: varchar("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  itemType: varchar("item_type").notNull(), // product, medicine, service
  inventoryItemId: varchar("inventory_item_id"), // Reference to inventory if applicable
  createdAt: timestamp("created_at").defaultNow(),
});



// Inventory Management System
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // medicine, supply, equipment, food
  sku: varchar("sku").unique(),
  barcode: varchar("barcode"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  currentStock: integer("current_stock").default(0),
  minStockLevel: integer("min_stock_level").default(0),
  maxStockLevel: integer("max_stock_level"),
  unit: varchar("unit").default("piece"), // piece, bottle, box, kg, liter
  supplier: varchar("supplier"),
  expirationDate: date("expiration_date"),
  batchNumber: varchar("batch_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id),
  transactionType: varchar("transaction_type").notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  reason: varchar("reason").notNull(), // purchase, sale, usage, adjustment, return, donation
  referenceId: varchar("reference_id"), // appointment_id, invoice_id, etc.
  referenceType: varchar("reference_type"), // appointment, invoice, manual
  notes: text("notes"),
  staffId: varchar("staff_id").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for inventory
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;

// Sales Management System
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  receiptId: varchar("receipt_id").notNull(), // User-facing receipt number
  customerName: varchar("customer_name").notNull(),
  customerPhone: varchar("customer_phone"),
  customerEmail: varchar("customer_email"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // paid, pending, partial
  deliveryStatus: varchar("delivery_status").notNull().default("pending"), // pending, partial, delivered
  paymentMethod: varchar("payment_method"), // cash, card, transfer
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  deliveredBy: varchar("delivered_by").references(() => staff.id),
});

export const saleItems = pgTable("sale_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull().references(() => sales.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // medicine, supply, equipment, food, service, additional
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  delivered: boolean("delivered").default(false),
  deliveredAt: timestamp("delivered_at"),
  inventoryItemId: varchar("inventory_item_id").references(() => inventoryItems.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for sales
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

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

// Shift Management Relations

// Staff relations with shift management
export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [staff.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  shiftAssignments: many(shiftAssignments),
  timeEntries: many(timeEntries),
  rotationTeamMemberships: many(rotationTeamMembers),
}));

// Shift pattern relations
export const shiftPatternsRelations = relations(shiftPatterns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [shiftPatterns.tenantId],
    references: [tenants.id],
  }),
  assignments: many(shiftAssignments),
  rotationSchedules: many(rotationSchedules),
}));

// Shift assignment relations
export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [shiftAssignments.tenantId],
    references: [tenants.id],
  }),
  staff: one(staff, {
    fields: [shiftAssignments.staffId],
    references: [staff.id],
  }),
  shiftPattern: one(shiftPatterns, {
    fields: [shiftAssignments.shiftPatternId],
    references: [shiftPatterns.id],
  }),
  approver: one(staff, {
    fields: [shiftAssignments.approvedBy],
    references: [staff.id],
  }),
  timeEntries: many(timeEntries),
}));

// Shift rotation relations
export const shiftRotationsRelations = relations(shiftRotations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [shiftRotations.tenantId],
    references: [tenants.id],
  }),
  teams: many(rotationTeams),
  schedules: many(rotationSchedules),
}));

// Rotation team relations
export const rotationTeamsRelations = relations(rotationTeams, ({ one, many }) => ({
  rotation: one(shiftRotations, {
    fields: [rotationTeams.rotationId],
    references: [shiftRotations.id],
  }),
  members: many(rotationTeamMembers),
  schedules: many(rotationSchedules),
}));

// Rotation team member relations
export const rotationTeamMembersRelations = relations(rotationTeamMembers, ({ one }) => ({
  team: one(rotationTeams, {
    fields: [rotationTeamMembers.teamId],
    references: [rotationTeams.id],
  }),
  staff: one(staff, {
    fields: [rotationTeamMembers.staffId],
    references: [staff.id],
  }),
}));

// Rotation schedule relations
export const rotationSchedulesRelations = relations(rotationSchedules, ({ one }) => ({
  rotation: one(shiftRotations, {
    fields: [rotationSchedules.rotationId],
    references: [shiftRotations.id],
  }),
  team: one(rotationTeams, {
    fields: [rotationSchedules.teamId],
    references: [rotationTeams.id],
  }),
  shiftPattern: one(shiftPatterns, {
    fields: [rotationSchedules.shiftPatternId],
    references: [shiftPatterns.id],
  }),
}));

// Time entry relations
export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [timeEntries.tenantId],
    references: [tenants.id],
  }),
  staff: one(staff, {
    fields: [timeEntries.staffId],
    references: [staff.id],
  }),
  shiftAssignment: one(shiftAssignments, {
    fields: [timeEntries.shiftAssignmentId],
    references: [shiftAssignments.id],
  }),
  approver: one(staff, {
    fields: [timeEntries.approvedBy],
    references: [staff.id],
  }),
}));

// Receipt Templates - store receipt templates per company/tenant
export const receiptTemplates = pgTable("receipt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id), // null for global templates
  tenantId: varchar("tenant_id").references(() => tenants.id), // null for company-wide templates
  name: varchar("name").notNull(),
  description: text("description"),
  templateType: varchar("template_type").notNull().default("receipt"), // receipt, invoice, estimate
  fileUrl: varchar("file_url").notNull(), // Object storage path to ZIP file
  fileName: varchar("file_name").notNull(), // Original ZIP file name
  fileSize: integer("file_size"), // File size in bytes
  version: varchar("version").default("1.0"),
  isActive: boolean("is_active").default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  metadata: jsonb("metadata"), // Additional template configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyTenant: index("unique_company_tenant_template").on(table.companyId, table.tenantId, table.name),
}));

export const receiptTemplatesRelations = relations(receiptTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [receiptTemplates.companyId],
    references: [companies.id],
  }),
  tenant: one(tenants, {
    fields: [receiptTemplates.tenantId],
    references: [tenants.id],
  }),
  uploadedByUser: one(users, {
    fields: [receiptTemplates.uploadedBy],
    references: [users.id],
  }),
}));

// Type exports for external services
export type WhatsappMessageUsage = typeof whatsappMessageUsage.$inferSelect;
export type InsertWhatsappMessageUsage = typeof whatsappMessageUsage.$inferInsert;

export type ExternalServiceSubscription = typeof externalServiceSubscriptions.$inferSelect;
export type InsertExternalServiceSubscription = typeof externalServiceSubscriptions.$inferInsert;

export type ReceiptTemplate = typeof receiptTemplates.$inferSelect;
export type InsertReceiptTemplate = typeof receiptTemplates.$inferInsert;

// Calendar Shares - for sharing shift calendars via WhatsApp
export const calendarShares = pgTable("calendar_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  staffName: varchar("staff_name").notNull(),
  shareToken: varchar("share_token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
});

export const calendarSharesRelations = relations(calendarShares, ({ one }) => ({
  tenant: one(tenants, {
    fields: [calendarShares.tenantId],
    references: [tenants.id],
  }),
  staff: one(staff, {
    fields: [calendarShares.staffId],
    references: [staff.id],
  }),
}));

export type CalendarShare = typeof calendarShares.$inferSelect;
export type InsertCalendarShare = typeof calendarShares.$inferInsert;

