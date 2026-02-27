# CLAUDE.md — Hours Reporting App

## Project Overview
An organizational hours reporting web application. Employees clock in/out (with optional geolocation), submit absences and manual time corrections, and managers approve non-regular entries. Supports Microsoft Azure AD and Okta SSO, four languages (EN/HE/AR/FR) with RTL layout for Hebrew and Arabic, custom org branding, notifications (email/SMS/push), weekly manager reports, and built-in dashboards.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 with CSS logical properties for RTL |
| Auth | NextAuth.js v5 (Auth.js) — Azure AD + Okta providers |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| i18n | next-intl |
| Charts | recharts |
| Email | nodemailer (SMTP) |
| SMS | Twilio |
| Push notifications | web-push (VAPID) |
| Scheduling | node-cron |
| File parsing | papaparse (CSV) |

---

## Environment Setup

1. Copy `.env.example` to `.env` and fill in all values:
   ```bash
   cp .env.example .env
   ```

2. Required variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `AUTH_SECRET` — random string (`openssl rand -base64 32`)
   - At least one SSO provider (Azure AD or Okta)
   - `ADMIN_EMAILS` — comma-separated emails that get ADMIN role on first login
   - `MANAGER_EMAILS` — comma-separated emails that get MANAGER role on first login

3. Optional (features degrade gracefully if missing):
   - SMTP vars — email notifications
   - Twilio vars — SMS notifications
   - VAPID vars — browser push notifications
   - `CRON_SECRET` — protects `/api/cron/*` endpoints

---

## Database

This project uses **Prisma 7** with the new `prisma.config.ts` approach. The connection URL is in `prisma.config.ts`, not `schema.prisma`.

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Seed the database (creates default OrganizationSettings)
npx tsx prisma/seed.ts

# Open Prisma Studio (DB GUI)
npx prisma studio
```

### Key Models
- **User** — SSO users with role, hierarchy (`managerId`), delegation fields, and notification preferences
- **TimeEntry** — Covers all entry types via `type` enum:
  - `WORK`: clock-in/clock-out with optional geolocation — auto-APPROVED
  - `VACATION`, `SICK`, `CHILD_SICK`, `MILITARY`, `MANUAL`: date-range entries — always start as PENDING
- **OrganizationSettings** — Singleton row for branding and working schedule

---

## Development

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build
```

### Scheduler (separate process)
The cron jobs (forgotten clock-out alerts, weekly manager reports) require a long-running process. Run alongside `npm run dev`:

```bash
# Install ts-node globally if needed: npm i -g ts-node
npm run scheduler
```

Or configure an external cron tool to POST to:
- `POST /api/cron/forgotten-clockout` with `x-cron-secret: <CRON_SECRET>` header
- `POST /api/cron/weekly-report` with `x-cron-secret: <CRON_SECRET>` header

---

## Authentication

`src/lib/auth.ts` configures NextAuth with:
- `MicrosoftEntraId` provider (Azure AD)
- `Okta` provider
- `PrismaAdapter` for session/user persistence in PostgreSQL
- `signIn` callback assigns `ADMIN` or `MANAGER` role from env-configured email lists on first login

**Route protection** is handled in `src/middleware.ts`:
- All `/(en|he|ar|fr)/` routes except `/login` require an active session
- `/admin/*` routes require `ADMIN` role
- `/manager/*` routes require `MANAGER` or `ADMIN` role

---

## Internationalisation (i18n)

- Locales: `en`, `he`, `ar`, `fr`
- RTL locales: `he`, `ar` — the root locale layout sets `<html dir="rtl">`
- Message catalogs live in `/messages/{locale}.json`
- Locale routing: all pages live under `/[locale]/` (e.g. `/en/dashboard`, `/he/dashboard`)
- User preferred locale is stored in `User.locale` and shown via the Language Switcher in profile settings

**Adding a new locale:**
1. Add to `src/i18n/routing.ts` `locales` array
2. Create `messages/{newLocale}.json` with all keys
3. Add to `RTL_LOCALES` if applicable

**Adding a new translation key:**
1. Add the key to `messages/en.json`
2. Add translations for all other locales
3. Use `useTranslations("namespace")` in client components or `getTranslations("namespace")` in server components

---

## Entry Types & Approval Flow

| Type | Trigger | Auto-status |
|---|---|---|
| `WORK` | Clock in/out button | `APPROVED` |
| `VACATION`, `SICK`, `CHILD_SICK`, `MILITARY`, `MANUAL` | Absence/Manual forms | `PENDING` |

Pending entries are visible to the user's direct manager (and any active delegate). Managers approve/reject via `/manager/approvals`. Employees receive a notification on approval/rejection.

---

## Approval Delegation

A manager can delegate their approval responsibilities to another user for a specified date range. Set via `PUT /api/manager/delegation` or the Delegation page. The delegate sees all pending entries for the manager's subordinates while the delegation is active.

---

## Notifications

Three channels, configured per-user in their profile:
1. **Email** — via SMTP/nodemailer
2. **SMS** — via Twilio
3. **Browser Push** — via Web Push + Service Worker (`public/sw.js`)

The `src/lib/notifications.ts` module provides `notify()` which dispatches to all enabled channels simultaneously.

---

## Custom Branding

Admins configure branding at `/admin/settings`:
- **Logo URL** — external image URL, shown in navbar and login page
- **Primary colour** — hex colour injected as `--primary` CSS variable at the root level

Changes take effect immediately (CSS var is updated without reload via JS on the settings form).

---

## Hierarchy & Data Visibility

Users are linked via `managerId` forming a tree. The `src/lib/hierarchy.ts` module provides:
- `getSubordinateIds(managerId)` — recursive query returning all direct + indirect report IDs
- `getVisibleUserIds(userId, role)` — returns IDs visible to a user based on role

| Role | Sees |
|---|---|
| `EMPLOYEE` | Own data only |
| `MANAGER` | Own + all subordinates (recursive) |
| `ADMIN` | All users |

---

## File Structure

```
src/
├── app/
│   ├── [locale]/           # All locale-aware pages
│   │   ├── layout.tsx      # Sets dir, CSS vars, session provider
│   │   ├── login/          # SSO login page
│   │   ├── dashboard/      # Clock in/out + summaries
│   │   ├── history/        # Own entry history
│   │   ├── reports/        # My hours chart
│   │   ├── manager/        # Approvals, delegation, team summary
│   │   ├── admin/          # All entries, users, settings, org reports
│   │   └── profile/        # Language + notification preferences
│   └── api/                # All API routes (no locale prefix)
├── components/             # Reusable React client components
│   └── reports/            # Chart/table report components
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma singleton
│   ├── time-utils.ts       # Duration math, cron expressions
│   ├── hierarchy.ts        # Recursive org tree queries
│   ├── notifications.ts    # Email / SMS / push dispatch
│   └── scheduler.ts        # node-cron job setup
└── i18n/
    ├── routing.ts          # Locale list + RTL config
    └── request.ts          # next-intl server config
```

---

## Common Conventions

- All API routes return `{ error: "..." }` with an appropriate HTTP status code on failure.
- All API routes that modify data require an authenticated session (`auth()` from `@/lib/auth`).
- Role checks: `session.user.role` contains the `Role` enum value from the database.
- Dates are always stored and compared as UTC.
- The `OrganizationSettings` table always has exactly one row with `id = "singleton"`.
- Non-WORK `TimeEntry` records always start with `status = "PENDING"`.
- Geolocation is purely informational — users are never blocked for missing location data.

---

## SSO Configuration Guide

### Azure AD (Microsoft Entra ID)
1. Register an app in Azure Portal → App registrations
2. Add redirect URI: `https://your-domain.com/api/auth/callback/microsoft-entra-id`
3. Copy Client ID, Client Secret, and Tenant ID to `.env`

### Okta
1. Create an OIDC Web Application in Okta Admin Console
2. Add Sign-in redirect URI: `https://your-domain.com/api/auth/callback/okta`
3. Copy Client ID, Client Secret, and Issuer URL (e.g. `https://your-org.okta.com`) to `.env`

---

## Web Push Setup

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Copy both keys to .env
# VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY should have the same value
```
