import {
  pgTable, text, varchar, timestamp, boolean, integer, jsonb,
  uuid, pgEnum, serial, unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export const orgPlanEnum = pgEnum("org_plan", ["free", "pro", "enterprise"]);
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);
export const contactTypeEnum = pgEnum("contact_type", ["client", "prospect", "mailing"]);
export const agreementStatusEnum = pgEnum("agreement_status", ["draft", "sent", "signed", "active", "expired", "cancelled"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "void"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "planning", "active", "completed", "archived"]);
export const taskStatusEnum = pgEnum("task_status", ["to_do", "in_progress", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const emailStatusEnum = pgEnum("email_status", ["valid", "invalid", "risk", "unknown"]);
export const outreachChannelEnum = pgEnum("outreach_channel", ["email", "sms", "drip"]);
export const meetingPollStatusEnum = pgEnum("meeting_poll_status", ["draft", "open", "booked", "closed"]);
export const meetingPollLocationEnum = pgEnum("meeting_poll_location", ["zoom", "phone", "in_person", "all_options"]);

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
  // ── Agency profile (for Client Portal display) ──
  logoUrl: text("logo_url"),               // base64 data URL or external URL
  address: text("address"),
  address2: varchar("address_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  about: text("about"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Organization locations (additional offices) ───────────────
// Primary address still lives on the `organizations` row; this table
// stores every extra office the agency lists in its client portal.
export const organizationLocations = pgTable("organization_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  label: varchar("label", { length: 100 }).notNull().default("Office"),
  address: text("address"),
  address2: varchar("address_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Portal files (shared between staff + clients) ─────────────
// orgId scopes every file. contactId is optional:
//   • set    → file is private between a staff member and this one client
//   • null   → general agency file, visible to all clients of the org
// uploadedByUserId XOR uploadedByContactId identifies the uploader.
export const portalFiles = pgTable("portal_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  contactId: uuid("contact_id"),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),              // base64 data URL or external URL
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  uploadedByUserId: uuid("uploaded_by_user_id"),
  uploadedByContactId: uuid("uploaded_by_contact_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Users ─────────────────────────────────────────────────────
// A signed-in Clerk user can belong to multiple orgs (one staff "seat"
// per org), so clerk_id is NOT globally unique — only unique per org.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 255 }).notNull(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    role: userRoleEnum("role").notNull().default("member"),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    // Staff profile — office + address + mobile
    locationId: uuid("location_id"),
    address: text("address"),
    address2: varchar("address_2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zip: varchar("zip", { length: 20 }),
    mobile: varchar("mobile", { length: 50 }),
    // Booking settings (per user)
    publicBookingUrl: varchar("public_booking_url", { length: 500 }),
    meetingDurationMinutes: integer("meeting_duration_minutes").default(30),
    meetingLocation: varchar("meeting_location", { length: 255 }),
    bookingBio: text("booking_bio"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    clerkOrgUnique: unique("users_clerk_id_org_id_unique").on(t.clerkId, t.orgId),
  }),
);

// ── Booking org settings ──────────────────────────────────────
export const bookingOrgSettings = pgTable("booking_org_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().unique().references(() => organizations.id),
  publicBookingUrl: varchar("public_booking_url", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Availability slots ────────────────────────────────────────
export const availabilitySlots = pgTable("availability_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun … 6=Sat
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Meeting polls (Scheduling) ────────────────────────────────
// Host-created polls where invitees vote on which times work.
export const meetingPolls = pgTable("meeting_polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  shareToken: varchar("share_token", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().default("Meeting"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  location: meetingPollLocationEnum("location").notNull().default("zoom"),
  description: text("description"),
  reserveTimes: boolean("reserve_times").notNull().default(false),
  showVotes: boolean("show_votes").notNull().default(true),
  language: varchar("language", { length: 16 }).notNull().default("en"),
  status: meetingPollStatusEnum("status").notNull().default("draft"),
  selectedTimeId: uuid("selected_time_id"), // nullable FK, set when booked
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetingPollTimes = pgTable("meeting_poll_times", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => meetingPolls.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
});

export const meetingPollVotes = pgTable("meeting_poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => meetingPolls.id, { onDelete: "cascade" }),
  timeId: uuid("time_id").notNull().references(() => meetingPollTimes.id, { onDelete: "cascade" }),
  voterName: varchar("voter_name", { length: 255 }).notNull(),
  voterEmail: varchar("voter_email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shape of an entry in `contacts.additionalContacts`.
// Address fields are optional on older records — stored empty-string when
// the form leaves them blank so we don't have to branch on undefined.
export type AdditionalContact = {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  phone: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

// ── Contacts ──────────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  type: contactTypeEnum("type").notNull().default("client"),
  // Portal linkage
  clerkId: varchar("clerk_id", { length: 255 }).unique(),
  portalActivatedAt: timestamp("portal_activated_at"),
  // Client relationship status — drives portal gate and list filtering.
  status: varchar("status", { length: 20 }).default("prospect"),
  // Primary contact person
  avatarUrl: text("avatar_url"),                     // base64 data URL or https://… URL
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),          // Primary business email
  portalEmail: varchar("portal_email", { length: 255 }), // Email used for portal login (may differ)
  phone: varchar("phone", { length: 50 }),           // Mobile
  officePhone: varchar("office_phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  company: varchar("company", { length: 255 }),
  title: varchar("title", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  // Mailing address
  address: text("address"),
  address2: varchar("address_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  // Email verification signal
  emailStatus: emailStatusEnum("email_status"),
  emailVerifiedAt: timestamp("email_verified_at"),
  // Secondary and tertiary contacts at the same account, stored as JSON.
  additionalContacts: jsonb("additional_contacts")
    .$type<AdditionalContact[]>()
    .default([]),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Agreements ────────────────────────────────────────────────
export const agreements = pgTable("agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  // Contact link is optional now — fresh uploads may arrive without a
  // pre-existing contact. Advertiser info fields below carry identity.
  contactId: uuid("contact_id").references(() => contacts.id),
  type: varchar("type", { length: 100 }),
  status: agreementStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  amount: integer("amount"),  // cents (kept as convenience mirror of ad_rate)
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  notes: text("notes"),
  signedDocument: text("signed_document"),            // legacy single-file slot
  signedAt: timestamp("signed_at"),
  sentToEmail: varchar("sent_to_email", { length: 255 }),

  // ── Option C: advertising-contract fields ──
  companyName: varchar("company_name", { length: 255 }),
  repName: varchar("rep_name", { length: 255 }),
  advertiserEmail: varchar("advertiser_email", { length: 255 }),
  advertiserPhone: varchar("advertiser_phone", { length: 50 }),
  advertiserAddress: text("advertiser_address"),
  adSize: varchar("ad_size", { length: 100 }),
  frequency: varchar("frequency", { length: 50 }),
  adRate: integer("ad_rate"),                          // cents per issue
  adTiming: jsonb("ad_timing").$type<{ months: string[]; years: number }>(),
  signDate: timestamp("sign_date"),
  expDate: timestamp("exp_date"),
  renewalNoticeDate: timestamp("renewal_notice_date"),
  billingName: varchar("billing_name", { length: 255 }),
  billingEmail: varchar("billing_email", { length: 255 }),
  paymentMode: varchar("payment_mode", { length: 20 }), // card|link|invoice|check
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripePaymentLinkUrl: text("stripe_payment_link_url"),
  isUploaded: boolean("is_uploaded").notNull().default(false),
  auditLog: jsonb("audit_log")
    .$type<
      { event: string; timestamp: string; userEmail?: string; details?: string }[]
    >()
    .notNull()
    .default([]),
  eblastPackages: jsonb("eblast_packages")
    .$type<string[]>()
    .notNull()
    .default([]),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agreementAttachments = pgTable("agreement_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  agreementId: uuid("agreement_id")
    .notNull()
    .references(() => agreements.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  dataUrl: text("data_url"),             // base64 data URL
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
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
  // Optional link to a client contact — appointments with a contact_id
  // show up in Calendarly; unlinked events show in the general Calendar.
  contactId: uuid("contact_id").references(() => contacts.id),
  title: varchar("title", { length: 500 }).notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  durationMinutes: integer("duration_minutes"),
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 100 }),
  notes: text("notes"),
  // Free-text fields used by Team Calendar entries (non-linked)
  clientName: varchar("client_name", { length: 255 }),
  agentEmail: varchar("agent_email", { length: 255 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Industry Events ───────────────────────────────────────────
// External events the team wants to track: conferences, CE courses, expos,
// networking, etc. Not the same as calendar_events (team/client meetings).
export type ExtraDateTime = { startAt: string; endAt: string | null };

export const industryEvents = pgTable("industry_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  allDay: boolean("all_day").notNull().default(false),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  extraDateTimes: jsonb("extra_date_times").$type<ExtraDateTime[]>().default([]),
  // Venue / address
  venueName: varchar("venue_name", { length: 255 }),
  address: text("address"),
  address2: varchar("address_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  // Pricing + licensing (real-estate CE course context)
  websiteUrl: varchar("website_url", { length: 500 }),
  memberPriceCents: integer("member_price_cents"),
  nonMemberPriceCents: integer("non_member_price_cents"),
  courseNumber: varchar("course_number", { length: 100 }),
  trecLicenseNumber: varchar("trec_license_number", { length: 100 }),
  // Classification
  category: varchar("category", { length: 255 }),
  organizer: varchar("organizer", { length: 255 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  // Team integration
  pushToTeamCalendar: boolean("push_to_team_calendar").notNull().default(false),
  eventColor: varchar("event_color", { length: 7 }).default("#3D0740"),
  linkedCalendarEventId: uuid("linked_calendar_event_id").references(
    () => calendarEvents.id,
  ),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const industryEventCategories = pgTable("industry_event_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  isParent: boolean("is_parent").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const industryEventOrganizers = pgTable("industry_event_organizers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const industryEventLocations = pgTable("industry_event_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  venueName: varchar("venue_name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
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
