-- Allow one Webflow scenario to be assigned to one or more connected sites.
begin;

create table if not exists public.webflow_scenario_sites (
  scenario_id uuid not null references public.webflow_scenarios(id) on delete cascade,
  integration_id uuid not null references public.webflow_integrations(id) on delete cascade,
  webhook_id text not null,
  created_at timestamptz not null default now(),
  primary key (scenario_id, integration_id),
  unique (integration_id, webhook_id)
);

create index if not exists webflow_scenario_sites_integration_idx
  on public.webflow_scenario_sites (integration_id, scenario_id);

insert into public.webflow_scenario_sites (scenario_id, integration_id, webhook_id)
select id, integration_id, webhook_id
from public.webflow_scenarios
where webhook_id is not null
on conflict (scenario_id, integration_id) do nothing;

alter table public.webflow_scenario_sites enable row level security;
alter table public.webflow_scenario_sites force row level security;
revoke all on public.webflow_scenario_sites from public, anon;
grant select, insert, update, delete on public.webflow_scenario_sites to authenticated;

drop policy if exists "Owners manage Webflow scenario sites" on public.webflow_scenario_sites;
create policy "Owners manage Webflow scenario sites" on public.webflow_scenario_sites
  for all to authenticated
  using (
    exists (
      select 1
      from public.webflow_scenarios scenario
      where scenario.id = webflow_scenario_sites.scenario_id
        and scenario.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.webflow_scenarios scenario
      where scenario.id = webflow_scenario_sites.scenario_id
        and scenario.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.webflow_integrations integration
      where integration.id = webflow_scenario_sites.integration_id
        and integration.user_id = (select auth.uid())
    )
  );

commit;
