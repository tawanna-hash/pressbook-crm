import {
  pgTable, text, varchar, timestamp, boolean, integer, jsonb,
  uuid, pgEnum, serial
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export const orgPlanEnum = pgEnum("org_plan", ["free", "pro", "enterprise"]);
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);
export const contactTypeEnum = pgEnum("contact_type", ["client", "prospect", "mailing"]);
export const agreementStatusEnum = pgEnum("agreement_status", ["draft", "sent", "active", "expired", "cancelled"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "void"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "planning", "active", "completed", "archived"]);
export const taskStatusEnum = pgEnum("task_status", ["to_do", "in_progress", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const emailStatusEnum = pgEnum("email_status", ["valid", "invalid", "risk", "unknown"]);
export const outreachChannelEnum = pgEnum("outreach_channel", ["email", "sms", "drip"]);

// ═══════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════

// ── Organizations ─────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  brandColor: varchar("brand_color", { length: 7 }).notNull().default("#021D40"),
  domain: varchar("domain", { length: 255 }),
  mailDomain: varchar("mail_domain", { length: 255 }),
  plan: orgPlanEnum("plan").notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Users ─────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  role: userRoleEnum("role").notNull().default("member"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Contacts ──────────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  type: contactTypeEnum("type").notNull().default("client"),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  title: varchar("title", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  emailStatus: emailStatusEnum("email_status"),
  emailVerifiedAt: timestamp("email_verified_at"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Agreements ────────────────────────────────────────────────
export const agreements = pgTable("agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  type: varchar("type", { length: 100 }),
  status: agreementStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  amount: integer("amount"),  // cents
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Invoices ──────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  agreementId: uuid("agreement_id").references(() => agreements.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  amount: integer("amount").notNull(),  // cents
  status: invoiceStatusEnum("status").notNull().default("draft"),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Campaigns ─────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  status: campaignStatusEnum("status").notNull().default("draft"),
  type: varchar("type", { length: 100 }),
  audienceFilter: jsonb("audience_filter"),
  brief: text("brief"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Campaign Tasks ────────────────────────────────────────────
export const campaignTasks = pgTable("campaign_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  assigneeId: uuid("assignee_id").references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  status: taskStatusEnum("status").notNull().default("to_do"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Campaign Outreach ─────────────────────────────────────────
export const campaignOutreach = pgTable("campaign_outreach", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  channel: outreachChannelEnum("channel").notNull().default("email"),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Email Verifications ───────────────────────────────────────
export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  email: varchar("email", { length: 255 }).notNull(),
  status: emailStatusEnum("status").notNull(),
  reason: varchar("reason", { length: 100 }),
  source: varchar("source", { length: 50 }),
  suggestion: varchar("suggestion", { length: 255 }),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

// ── Calendar Events ───────────────────────────────────────────
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 500 }).notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  type: varchar("type", { length: 100 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Tasks ─────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 500 }).notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id),
  status: taskStatusEnum("status").notNull().default("to_do"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Notes (polymorphic) ───────────────────────────────────────
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'contact', 'agreement', 'campaign'
  entityId: uuid("entity_id").notNull(),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Audit Log ─────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  diff: jsonb("diff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Settings ──────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  key: varchar("key", { length: 255 }).notNull(),
  value: jsonb("value"),
});

// ═══════════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════════

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  contacts: many(contacts),
  agreements: many(agreements),
  campaigns: many(campaigns),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, { fields: [contacts.orgId], references: [organizations.id] }),
  agreements: many(agreements),
}));

export const agreementsRelations = relations(agreements, ({ one }) => ({
  organization: one(organizations, { fields: [agreements.orgId], references: [organizations.id] }),
  contact: one(contacts, { fields: [agreements.contactId], references: [contacts.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, { fields: [campaigns.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [campaigns.createdBy], references: [users.id] }),
  tasks: many(campaignTasks),
  outreach: many(campaignOutreach),
}));
