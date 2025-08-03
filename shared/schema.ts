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

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  roomId: varchar("room_id").references(() => rooms.id),
  staffId: varchar("staff_id").references(() => staff.id),
  type: varchar("type").notNull(), // medical, grooming, vaccination
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: time("scheduled_time").notNull(),
  duration: integer("duration").default(60), // minutes
  notes: text("notes"),
  services: jsonb("services"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
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

export const appointmentsRelations = relations(appointments, ({ one }) => ({
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
export type Fraccionamiento = typeof fraccionamientos.$inferSelect;
export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type DeliveryStop = typeof deliveryStops.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertFraccionamiento = z.infer<typeof insertFraccionamientoSchema>;
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type InsertDeliveryStop = z.infer<typeof insertDeliveryStopSchema>;
