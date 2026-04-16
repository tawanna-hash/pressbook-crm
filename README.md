# PressBook 360 CRM

Modern CRM platform for Caxton Publications — RealtyLine (Austin) & Newsline SA (San Antonio).

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui components
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Clerk (multi-org support)
- **Email:** Resend
- **Payments:** Stripe
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/tawanna-hash/pressbook-crm.git
cd pressbook-crm
npm install
```

### 2. Set up Clerk

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Create a new application called "PressBook 360"
3. Enable **Email** and **Google** sign-in methods
4. Go to **API Keys** in the Clerk dashboard
5. Copy your Publishable Key and Secret Key

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from step 2
- `CLERK_SECRET_KEY` — from step 2
- `DATABASE_URL` — your PostgreSQL connection string

### 4. Push the database schema

```bash
npm run db:push
```

This creates all 15 tables in your PostgreSQL database. Your existing `crm_data` table is untouched — the new tables live alongside it.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see the Clerk sign-in page. After signing in, the dashboard loads with the sidebar.

### 6. Deploy to Vercel

1. Push to GitHub: `git push origin main`
2. Go to [vercel.com](https://vercel.com) → New Project → Import `pressbook-crm`
3. Add environment variables (same as `.env.local`)
4. Deploy
5. Add custom domain: `app.myrealtyline.com`

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Sign-in / sign-up (Clerk)
│   ├── (dashboard)/      # Main app (behind auth)
│   │   ├── contacts/     # Phase 1
│   │   ├── agreements/   # Phase 1
│   │   ├── campaigns/    # Phase 2
│   │   ├── verify/       # Phase 4
│   │   ├── calendar/     # Phase 3
│   │   ├── settings/     # Phase 1
│   │   ├── layout.tsx    # Sidebar + main area
│   │   └── page.tsx      # Dashboard home
│   ├── api/webhooks/     # Stripe, Resend webhooks
│   └── layout.tsx        # Root layout + Clerk provider
├── components/
│   ├── shared/           # Sidebar, org switcher, etc.
│   └── ui/               # shadcn/ui components (added as needed)
├── lib/
│   ├── db/
│   │   ├── index.ts      # Drizzle connection
│   │   └── schema.ts     # All table definitions
│   └── utils/
│       └── cn.ts         # Tailwind class merger
└── middleware.ts          # Clerk auth middleware
```

## Database Schema

15 tables, all with `org_id` for multi-tenant isolation:

organizations, users, contacts, agreements, invoices, campaigns,
campaign_tasks, campaign_outreach, email_verifications, calendar_events,
tasks, notes, audit_log, settings

Run `npm run db:studio` to browse your data with Drizzle Studio.

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Foundation + Auth + DB | ✅ Done |
| 1 | Contacts + Agreements + Invoicing | Next |
| 2 | Campaign Hub + AI + Email | Planned |
| 3 | Calendar + Tasks + Notes | Planned |
| 4 | Email Verification + Analytics | Planned |
| 5 | Mobile App (iOS + Android) | Planned |
| 6 | Multi-Tenant SaaS | Planned |
