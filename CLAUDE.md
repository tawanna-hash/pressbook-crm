# PressBook CRM — Project Brief for Claude

> Read this first in any new session. It captures everything needed to
> hit the ground running without rehashing past decisions.

## 1. What this app is

A multi-tenant CRM for **Caxton Publications** supporting two organizations:

- **RealtyLine** (`realtyline` slug) — Austin-area real estate publication
- **Newsline SA** (`newsline-sa` slug) — San Antonio real estate publication

Owner: Tawanna Verock (`tawanna@myrealtyline.com`). GitHub: `tawanna-hash/pressbook-crm`.
Production: `https://pressbook-crm.vercel.app` (Vercel).

## 2. Stack

- **Next.js 16.2.4** App Router + Turbopack
- **React 19**
- **Clerk** for authentication (staff + client portals)
- **Drizzle ORM** + `postgres-js` → PostgreSQL (DigitalOcean managed, port 25060, sslmode=require)
- **Tailwind CSS v4** with project CSS variables
- **TypeScript** strict
- **lucide-react** for icons
- **Stripe** (checkout sessions)
- **Resend** (email, not wired yet)
- **papaparse + xlsx (SheetJS)** for CSV/TSV/XLSX import/export
- **Vercel** for hosting (with `vercel.json` cron config)

## 3. Multi-tenancy model

Every data row carries `org_id`. The active org per session is stored in a
cookie (`pb_active_org`) and read server-side via `getActiveOrg()` at
`src/lib/auth/active-org.ts`. The sidebar shows a company switcher that
calls a server action to set this cookie.

**Staff** (`users` table) can belong to multiple orgs — one row per org
with a composite unique on `(clerk_id, org_id)`. `syncStaffUser()` creates
these rows on staff sign-in.

## 4. Route groups

- `src/app/(dashboard)/*` — staff-side CRM, gated by Clerk middleware
- `src/app/(portal)/portal/*` — client-facing portal, gated to clients OR staff preview
- `src/app/api/cron/sync-advertisers/route.ts` — every-minute job to sync active clients → Advertisers mailing list (Bearer `CRON_SECRET`)
- `src/app/api/webhooks/stripe/route.ts` — existing Stripe webhook endpoint (agreements paid-status wiring is TODO)

Clerk middleware lives at `src/middleware.ts` (warning: Next 16 deprecated
the name in favor of `proxy` — not migrated yet).

## 5. Features currently live

### Dashboard (`/`, sidebar-driven)

- **Client Hub** (`/clients`) — hub page + child routes `/clients/all`, `/active`, `/prospects`, `/inactive`. Paginated (25/50/100/200), search/filter, card & table view toggle, Add Client form.
- **Agreements** (`/agreements`) — list + three flows (Upload Signed, New Email, New Print) matching legacy `crm.myrealtyline.com` logic (Option C schema). Printable view at `/agreements/[id]/print`.
- **PressBook Us** (`/calendarly`) — scheduling overview with Team Calendar (`/team`), Booking (`/booking`), Meeting Polls (`/booking/scheduling`).
- **Mailing List Hub** (`/mailing`) — hub with 3 segments:
  - Advertisers (`/mailing/advertisers`)
  - Non-Advertisers (`/mailing/non-advertisers`)
  - REALTORS (`/mailing/realtors`)
  Each segment page has Import (CSV/TSV/XLSX/JSON with column-mapping dialog), Export (4 formats), Dedupe by email OR name+phone, Search, Column visibility/reorder, New Contact, paginated, sortable. Row actions: Edit / Move to list / Delete.
- **Events Calendar (website)** (`/industry-events`) — hub with `/list`, `/list/upcoming`, `/list/past`. Paginated.
- **Campaigns** (`/campaigns`) — placeholder
- **Verify Emails** (`/verify`) — placeholder
- **Calendar** (`/calendar`) — calendar view
- **Company Profile** (`/settings/company`) — edit org logo, phone, website, primary address, about, and additional locations (CRUD).
- **Staff** (`/settings/staff`) — edit each staff member's Full Name, Location, Address, Address 2, City, State, ZIP, Mobile.
- **View Client Portal** (`/portal`) — opens portal in staff-preview mode.

### Client Portal (`/portal`)

Separate views for clients (matched by `contacts.clerkId`) vs. staff (preview).

- `/portal` — welcome dashboard with KPI cards + account info
- `/portal/info` — Location page: primary office + all additional locations
- `/portal/team` — Staff grid
- `/portal/billing` — Agreements list with Stripe Pay Now button on unpaid rows
- `/portal/files` — Shared file drawer (upload, download, delete; base64 data URLs, 5MB cap)
- `/portal/tasks`, `/portal/messages`, `/portal/collect`, `/portal/settings` — legacy placeholder pages

### Cron

`vercel.json` schedules `/api/cron/sync-advertisers` every minute. Also
auto-refresh on `/mailing/advertisers` every 60s via `<AutoRefresh />`.

The sync has 3 code paths:
1. On client create/update with `status='active'` → `upsertAdvertiserMailing` in `clients/actions.ts`
2. Manual "Sync Active Clients" button on `/mailing/advertisers` → `syncActiveClientsToAdvertisers` (add-only)
3. Cron endpoint → `syncActiveClientsAllOrgs` (add-only, iterates every org)

Additional Contacts 2 & 3 on a client also sync to Advertisers via `additionalContactToClientLike` helper in `mailing/sync-helpers.ts`.

## 6. Key auth helpers

- **`getActiveOrg()`** — `src/lib/auth/active-org.ts` — dashboard-side, reads cookie, returns full agency profile (logo, address block, phone, about).
- **`getPortalContext()`** — `src/lib/auth/portal-context.ts` — portal-side, resolves to `client` / `staff` / `unknown` / `unauthenticated`.
- **`getPortalRole()`** — `src/lib/auth/role.ts` — Clerk metadata + email-domain fallback (`myrealtyline.com`, `newslinesa.com`, `caxtonpublications.com` → staff).
- **`resolveCurrentContact()`** — `src/lib/auth/contact.ts` — finds/links a contact by email; only links ACTIVE status clients.

## 7. Shared components

- `Button` — `@/components/ui/button` — variants `primary`/`secondary`/`ghost`/`danger`; sizes `sm`/`md`/`icon`; `leftIcon` prop; also exports `buttonClasses()` for Links.
- `Pagination` — `@/components/shared/pagination` (client) + `parsePagination` at `@/components/shared/pagination-helpers` (server-safe). Don't cross the use-client boundary.
- `AutoRefresh` — `@/components/shared/auto-refresh` — polls `router.refresh()` on interval.
- `RefreshOnFocus` — `src/app/(dashboard)/booking/scheduling/refresh-on-focus.tsx` — on visibility/focus.
- `Sidebar` — `@/components/shared/sidebar` — main dashboard nav (recursive NavLink).
- `PortalSidebar` — `@/components/shared/portal-sidebar` — portal nav.
- `Placeholder` — `@/components/shared/placeholder` — empty-state component.

## 8. Database schema highlights

- `organizations` — logo_url, address block, phone, website_url, about, brand_color
- `organization_locations` — additional offices per org (label, address block, phone)
- `users` — staff; has mobile, location_id FK, address block
- `contacts` — clients + prospects + mailing list (distinguished by `type` enum: `client` / `prospect` / `mailing`). Mailing list segments stored in `tags` JSONB array (`"advertiser"`, `"non-advertiser"`, `"realtor"`). Has `additional_contacts` JSONB with address fields on each.
- `agreements` — Option C ad schema (companyName, adSize, frequency, adRate, eblastPackages JSONB, auditLog JSONB, paymentMode, stripe fields). Enum includes `signed` status.
- `agreement_attachments` — multi-file uploads per agreement
- `portal_files` — shared client-staff file drawer (base64 data URLs; contactId NULL = general)
- `industry_events` + `industry_event_categories` + `industry_event_organizers` + `industry_event_locations`
- `meeting_polls` + `meeting_poll_times` + `meeting_poll_votes`
- `availability_slots` + `booking_org_settings`

## 9. Coding conventions used in this project

- TypeScript strict. No `any`.
- Server actions in `actions.ts` files with `"use server"` directive. Only `async function` exports allowed; constants and types go in sibling `*-options.ts` or similar.
- Server components for data fetching; Client components (`"use client"`) only for interactivity.
- Tailwind tokens actually defined: `text-text`, `text-text-2`, `text-text-3`, `bg-card`, `bg-surface-2`, `bg-muted-bg`, `bg-muted-bg-2`, `border-border`, `border-border-strong`, `pb-navy`, `pb-green`, `pb-red`, `pb-amber`, `pb-plum`. CSS vars: `--r`, `--rlg`, `--sh-xs`, `--sh-sm`, `--sidebar-width`.
- **Title Case** on all headings and button labels.
- **No icons on page h1s** (project convention).
- Page headers use the consistent size: `<h1 className="text-xl font-bold text-text">` or `text-2xl` on portal pages.
- 2-space indent.
- Imports: relative (`./foo`) for siblings, `@/` alias for `src/`.

## 10. Migration scripts

All idempotent. Run with:
```bash
cd ~/Projects/pressbook-crm
npx tsx scripts/<name>.ts
```

Scripts in `scripts/`:
- `add-agreements.ts` — base agreements table
- `add-agreement-ads-v2.ts` — Option C columns
- `add-agreement-attachments.ts` — multi-file attachments
- `add-client-portal.ts` — org profile columns + portal_files table
- `add-organization-locations.ts` — additional offices table
- `add-staff-fields.ts` — users address + mobile + location_id
- `fix-users-unique-per-org.ts` — historical fix

Each reads `DATABASE_URL` from `.env.local` if not in shell env.

## 11. Environment variables

Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — starts `pk_test_` or `pk_live_`
- `CLERK_SECRET_KEY` — starts `sk_test_` or `sk_live_`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`
- `DATABASE_URL` — full postgres URL with `?sslmode=require`
- `CRON_SECRET` — random hex, matches Vercel cron bearer token

Optional / feature-gated:
- `RESEND_API_KEY` — email sends
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe Checkout + webhooks
- `ANTHROPIC_API_KEY` — AI features (not wired yet)
- `NEXT_PUBLIC_SITE_URL` — used in Stripe success/cancel URLs; defaults to `VERCEL_URL` or localhost

## 12. How to run locally

```bash
cd ~/Projects/pressbook-crm
npm install           # first time only
npm run dev           # http://localhost:3000
```

## 13. How to deploy

Push to `main`. Vercel auto-builds. Pending migrations must be run
manually against prod:

```bash
cd ~/Projects/pressbook-crm
npx tsx scripts/<script>.ts
```

(DATABASE_URL in `.env.local` points at prod DO cluster, so running locally
hits prod.)

## 14. Known issues / pending work

- **DB password rotation** — the original password leaked in a Vercel build log. Rotate via DO Console → Users & Databases → Reset Password, then update DATABASE_URL in `.env.local` AND in Vercel env vars.
- **Custom domain** — still on `pressbook-crm.vercel.app`. Add via Vercel → Settings → Domains.
- **Stripe webhook** — endpoint exists but doesn't yet flip `agreements.stripeInvoiceId` on checkout success. Wire `checkout.session.completed` handler.
- **Email sending** — Resend key placeholder. No actual sends implemented for agreement e-sign flow.
- **Campaigns** + **Verify Emails** pages are placeholders.
- **Middleware → proxy** rename — Next 16 deprecation warning, non-urgent.
- **Clerk `afterSignInUrl` deprecated** — swap to `fallbackRedirectUrl` when convenient.
- **Live Clerk/Stripe keys** — still on test-tier. Swap to live before real users.

## 15. Style preferences from user

- Prefers concise, direct answers. Not chatty.
- Wants real files created on disk, not code pasted in chat.
- Iterative, fast-moving work. Expects typecheck at the end.
- Explicit `AskUserQuestion` tool use when requirements are ambiguous before starting substantial work.

---

**Start of session checklist:**
1. Read this file.
2. `git pull origin main` to get the latest code.
3. Check `scripts/` for any unapplied migrations against the user's setup.
4. If unsure what the user wants, ask with `AskUserQuestion`.
