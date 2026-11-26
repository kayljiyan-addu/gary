# Gary: Merchant of Asphodel

A responsive trading-card marketplace built with Next.js, TypeScript, and Supabase. It supports listings, buyer carts and purchase requests, shipping or local meetup, messaging, reviews, reports, disputes, and staff tools. Checkout records a request only; it does not collect payment.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project.
4. Apply `supabase/migrations/20261125120000_marketplace.sql` in the Supabase SQL Editor or with the Supabase CLI.
5. Start the app with `npm run dev`.

Without those two environment variables, the app opens in clearly labelled preview mode. Preview interactions are temporary and do not write to Supabase.

Only the Supabase project URL and publishable/anon key belong in the browser environment. Never expose a service-role key.

## First administrator

After creating and confirming the account that should administer the marketplace, run this once in the Supabase SQL Editor. Replace the email with that account's email. The privileged SQL Editor is required because regular members cannot assign staff roles.

```sql
do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where email = lower('admin@example.com');

  if admin_user_id is null then
    raise exception 'Create the administrator account before running this bootstrap.';
  end if;

  execute 'alter table public.profiles disable trigger guard_profile_update_before';
  update public.profiles
  set role = 'admin', account_status = 'active'
  where id = admin_user_id;
  execute 'alter table public.profiles enable trigger guard_profile_update_before';
exception
  when others then
    execute 'alter table public.profiles enable trigger guard_profile_update_before';
    raise;
end;
$$;
```

## Deploy to Vercel

Import the repository as a new Vercel project; Vercel detects the Next.js framework and uses `npm run build`. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Production, Preview, and Development environments that need Supabase, then deploy. Optionally set `NEXT_PUBLIC_SITE_URL` to the canonical production origin (for example, `https://your-domain.com`) so social preview image URLs use that domain; otherwise Vercel's deployment URL is used. Apply database migrations to the Supabase project before directing users to the deployment.

## Checks

```text
npm run typecheck
npm run lint
npm run build
```
