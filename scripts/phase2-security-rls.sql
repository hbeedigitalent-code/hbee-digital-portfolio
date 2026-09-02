-- =============================================================================
-- Phase 2 — Database security fixes for admin_users / clients / admin_2fa
-- Run in: Supabase Dashboard -> SQL Editor (one project, production DB).
-- Review the STEP 0 output before running STEP 1-3.
-- Safe to re-run (idempotent).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 0 — INSPECT current state (read the output, then continue)
-- -----------------------------------------------------------------------------
select c.relname               as table_name,
       c.relrowsecurity        as rls_enabled,
       c.relforcerowsecurity   as rls_forced
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
and    c.relname in ('admin_users', 'clients', 'admin_2fa');

select tablename, policyname, cmd, roles, qual, with_check
from   pg_policies
where  schemaname = 'public'
and    tablename in ('admin_users', 'clients', 'admin_2fa')
order  by tablename, cmd, policyname;


-- -----------------------------------------------------------------------------
-- STEP 1 — admin_users
-- Problem: a SELECT/ALL policy on admin_users references admin_users inside its
--          own USING clause -> "infinite recursion detected" (42P17) -> every
--          read of admin_users returns HTTP 500.
-- Fix:     drop all existing policies, add ONE non-recursive self-select.
--          (The app never writes admin_users from the anon/session client —
--           rows are managed via the dashboard / service role, which bypass RLS.
--           The 2FA login route reads admin_users via the service role.)
-- -----------------------------------------------------------------------------
alter table public.admin_users enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'admin_users'
  loop
    execute format('drop policy %I on public.admin_users', pol.policyname);
  end loop;
end $$;

create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using ( auth.uid() = user_id );


-- -----------------------------------------------------------------------------
-- STEP 2 — clients
-- State: anon SELECT is already blocked (returns []). We only ADD a guaranteed
--        self-select for authenticated users (additive; existing policies,
--        including any admin "read all clients" policy, are left untouched).
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients
  for select
  to authenticated
  using ( auth.uid() = user_id );


-- -----------------------------------------------------------------------------
-- STEP 3 — admin_2fa
-- Problem: anon can currently SELECT the full row (TOTP `secret` + `backup_codes`)
--          AND anon PATCH is accepted (204). The table is effectively unprotected.
-- Fix:     enable RLS, drop every policy, revoke table grants from anon +
--          authenticated. No policy => no access for the public API.
--          The 2FA API routes use the SERVICE-ROLE key, which bypasses RLS and
--          retains its own grant — they keep working.
--          (Code change already shipped: /api/admin/2fa/login now reads the
--           secret with the service-role client instead of the anon client.)
-- -----------------------------------------------------------------------------
alter table public.admin_2fa enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'admin_2fa'
  loop
    execute format('drop policy %I on public.admin_2fa', pol.policyname);
  end loop;
end $$;

revoke all on public.admin_2fa from anon;
revoke all on public.admin_2fa from authenticated;


-- -----------------------------------------------------------------------------
-- STEP 2b — clients : close the cross-tenant holes found in the STEP 0 output
--
-- The STEP 0 inspection revealed two over-broad policies that let ANY logged-in
-- user read and modify EVERY client record:
--     "Allow authenticated users to select clients"  USING (auth.role() = 'authenticated')
--     "Allow authenticated users to update clients"   USING (auth.role() = 'authenticated')
-- These defeat the "own row only" requirement. Drop them. The per-user
-- self-select / self-update policies (auth.uid() = user_id) stay, so the client
-- portal keeps working; add an admin-scoped policy so the admin dashboards that
-- list all clients keep working. The admin_users sub-query is safe now that the
-- STEP 1 recursion is gone.
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated users to select clients" on public.clients;
drop policy if exists "Allow authenticated users to update clients"  on public.clients;

drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_all"
  on public.clients
  for all
  to authenticated
  using ( exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.is_active = true
  ))
  with check ( exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.is_active = true
  ));

-- Note (not changed here — INSERT is outside the SELECT-focused Phase 2 scope):
--   "Allow authenticated users to insert clients" still has
--   WITH CHECK (auth.role() = 'authenticated') — a logged-in user can insert a
--   clients row with an arbitrary user_id. Tighten later to
--   WITH CHECK (auth.uid() = user_id) once the signup / confirm flow is reviewed.
-- Optional tidy-up: "Allow users to select their own client record",
--   "Users can read own client record" and "clients_select_own" are three
--   identical SELECT policies — keep one, drop two, any time.


-- -----------------------------------------------------------------------------
-- STEP 4 — VERIFY inside SQL Editor (simulate an authenticated admin).
-- Replace <ADMIN_AUTH_UID> with a real value from auth.users (look up the admin's
-- id in the Supabase dashboard, e.g. the user_id on their admin_2fa / admin_users
-- row). Do not commit the real UID back into this file.
-- -----------------------------------------------------------------------------
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims to
--     '{"sub":"<ADMIN_AUTH_UID>","role":"authenticated"}';
--
--   select 'admin_users' as t, count(*) from public.admin_users;   -- expect 1 (own row)
--   select 'clients'     as t, count(*) from public.clients;       -- ADMIN: all rows; CLIENT: only 1
--   select 'admin_2fa'   as t, count(*) from public.admin_2fa;     -- expect 0 / permission denied
-- rollback;
--
-- Also confirm RLS is actually enabled (this was the admin_2fa root cause):
--   select c.relname, c.relrowsecurity as rls_enabled
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relname in ('admin_users','clients','admin_2fa');
--   -- all three must show rls_enabled = true
