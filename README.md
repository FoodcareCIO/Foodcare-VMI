# Foodcare VMI Admin

Admin control plane for the Foodcare VMI mobile (Expo) app. Built with Next.js 16 (App Router), React 19, Tailwind v4, and Supabase.

It uses a **REST API layer** (`/app/api/*`) for all dashboard data. The browser fetches JSON from those routes with `credentials: "include"`; route handlers verify the admin session and call Supabase with the service-role key. Master-data edits (customers, sites, products, minimums, assignments) automatically sync to the tablets via existing database triggers (`sync_change_log`).

## Features

- **Overview** - live KPIs and recent orders.
- **Customers & Sites** - CRUD for customers, sites, contacts, and site instructions.
- **Products & Minimums** - product catalog CRUD; bulk Excel/CSV catalog imports; legacy Foodcare VMI workbook imports with automatic customer-site matching and per-site minimum updates.
- **Reps & Assignments** - create sales-rep logins and control which customers each rep sees.
- **VMI Orders** - view submitted stock counts + line items, download the Excel export, and reject completed counts.
- **Admin Users** - manage who can sign in to this dashboard.
- **Devices** - view registered tablets and revoke them.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment. Copy `.env.example` to `.env.local` and fill in the values from your Supabase project (Project Settings > API). Use the **same** project the mobile app / backend use:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SECRET_KEY=your-secret-service-role-key
   ```

   > `SUPABASE_SECRET_KEY` is the service-role/secret key. It is server-only and must never be prefixed with `NEXT_PUBLIC`.

3. Apply the reject-support migration to the shared Supabase database (lives in the mobile repo):

   `foodcare-vmi-app/supabase/migrations/202607080001_admin_reject_stock_count.sql`

   This lets the dashboard reject completed counts (they are otherwise immutable).

4. Seed at least one admin so you can sign in. In the Supabase SQL editor:

   ```sql
   -- The account must already exist in Supabase Auth. Create it under
   -- Authentication > Users first (email + password), then:
   insert into public.admin_users (user_id, role)
   select id, 'admin'
   from auth.users
   where email = 'you@foodcare.com'
   on conflict (user_id) do update set deleted_at = null;
   ```

   After the first admin exists, you can add more admins from the dashboard's **Admin Users** page.

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, sign in, and manage away.

## Architecture notes

```
Browser (client components)
  → fetch /api/*  (credentials: include)
    → Route handlers (lib/api/server.ts → withAdmin)
      → lib/services/admin-data.ts
        → Supabase service-role client
```

- `proxy.ts` (Next 16's renamed middleware) refreshes the Supabase auth session cookie on every request.
- `features/auth/` - login form and dashboard auth guard (browser session).
- `lib/supabase/server.ts` - RLS-scoped client bound to the signed-in user (session verification).
- `lib/supabase/admin.ts` - service-role client; only used inside `/app/api` route handlers after `getAdminSession()`.
- `lib/api/server.ts#withAdmin` - verifies the JWT and checks `admin_users` membership before any API handler runs.
- `lib/api/client.ts` - browser `fetch` wrapper used by dashboard pages and `EntityManager`.
- All deletes are **soft deletes** (`deleted_at`), matching the sync model; the DB triggers turn them into `delete` operations for the tablets.

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - production build
- `npm run start` - run the production build
