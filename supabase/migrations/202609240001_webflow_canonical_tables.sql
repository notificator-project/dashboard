-- The standalone Webflow setup is being replaced by the dashboard-owned flow.
-- Existing Webflow installation/scenario records are intentionally disposable.
begin;

-- Keep this migration safe to run on a project that did not apply the
-- dashboard migration separately. Existing integrations are preserved;
-- only the disposable legacy scenario/installations tables are replaced.
create table if not exists public.webflow_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  webflow_site_id text,
  webflow_site_name text,
  encrypted_access_token text not null check (length(encrypted_access_token) between 1 and 16000),
  api_key_id uuid references public.api_keys(id) on delete set null,
  status text not null default 'connected' check (status in ('connected', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists webflow_integrations_user_site_idx
  on public.webflow_integrations (user_id, webflow_site_id)
  where webflow_site_id is not null;

alter table public.webflow_integrations
  add column if not exists api_key_id uuid references public.api_keys(id) on delete set null;

alter table public.webflow_integrations enable row level security;
alter table public.webflow_integrations force row level security;
revoke all on public.webflow_integrations from public, anon;
grant select, insert, update, delete on public.webflow_integrations to authenticated;

drop policy if exists "Owners manage Webflow integrations" on public.webflow_integrations;
create policy "Owners manage Webflow integrations" on public.webflow_integrations
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop table if exists public.webflow_scenarios cascade;
drop table if exists public.webflow_installations cascade;
drop table if exists public.webflow_integration_scenarios cascade;

create table public.webflow_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.webflow_integrations(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  trigger_type text not null default 'form_submission' check (trigger_type = 'form_submission'),
  webhook_id text,
  form_name text,
  title_template text not null default 'New Webflow form submission',
  body_template text not null default 'A new form was submitted on your Webflow site.',
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webflow_scenarios_user_idx on public.webflow_scenarios (user_id, created_at desc);

alter table public.webflow_scenarios enable row level security;
alter table public.webflow_scenarios force row level security;
revoke all on public.webflow_scenarios from public, anon;
grant select, insert, update, delete on public.webflow_scenarios to authenticated;

create policy "Owners manage Webflow scenarios" on public.webflow_scenarios
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
