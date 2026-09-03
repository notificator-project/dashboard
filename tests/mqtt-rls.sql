-- ONLY run in an empty disposable PostgreSQL database, never the production project.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
insert into auth.users values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
\ir ../supabase/migrations/202609030001_account_mqtt_credentials.sql

insert into public.user_mqtt_credentials values
  ('00000000-0000-0000-0000-000000000002', 'other-owner-ciphertext', now());
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
insert into public.user_mqtt_credentials (user_id, encrypted_credentials) values
  ('00000000-0000-0000-0000-000000000001', 'owner-ciphertext');
do $$
declare affected integer;
begin
  if (select count(*) from public.user_mqtt_credentials) <> 1 then raise exception 'Cross-account SELECT leaked'; end if;
  update public.user_mqtt_credentials set encrypted_credentials = 'updated'
    where user_id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner UPDATE failed'; end if;
  update public.user_mqtt_credentials set encrypted_credentials = 'forbidden'
    where user_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account UPDATE allowed'; end if;
  delete from public.user_mqtt_credentials where user_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account DELETE allowed'; end if;
  begin
    insert into public.user_mqtt_credentials (user_id, encrypted_credentials)
      values ('00000000-0000-0000-0000-000000000003', 'forbidden');
    raise exception 'Cross-account INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.user_mqtt_credentials set user_id = '00000000-0000-0000-0000-000000000003'
      where user_id = auth.uid();
    raise exception 'Changing owner allowed';
  exception when insufficient_privilege then null;
  end;
  delete from public.user_mqtt_credentials where user_id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner DELETE failed'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform * from public.user_mqtt_credentials;
    raise exception 'Anonymous SELECT allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if exists(select 1 from public.user_mqtt_credentials) then raise exception 'Account deletion did not cascade'; end if;
end $$;
select 'MQTT owner isolation and cascade checks passed' as result;
