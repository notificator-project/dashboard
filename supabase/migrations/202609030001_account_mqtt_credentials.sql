-- Shared account storage for dashboard, mobile, and future integration clients.
-- Store only a versioned encrypted envelope; decryption belongs to trusted servers.
begin;
create table public.user_mqtt_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_credentials text not null check (length(encrypted_credentials) between 1 and 16000),
  updated_at timestamptz not null default now()
);
alter table public.user_mqtt_credentials enable row level security;
alter table public.user_mqtt_credentials force row level security;
revoke all on public.user_mqtt_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.user_mqtt_credentials to authenticated;

create policy "Owners read MQTT credentials" on public.user_mqtt_credentials
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners insert MQTT credentials" on public.user_mqtt_credentials
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update MQTT credentials" on public.user_mqtt_credentials
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete MQTT credentials" on public.user_mqtt_credentials
  for delete to authenticated using ((select auth.uid()) = user_id);
commit;
