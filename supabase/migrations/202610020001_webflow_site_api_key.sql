-- API keys belong to the connected Webflow site, not individual scenarios.
begin;

alter table public.webflow_integrations
  add column if not exists api_key_id uuid references public.api_keys(id) on delete set null;

alter table public.webflow_scenarios
  drop column if exists api_key_id;

commit;
