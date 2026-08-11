-- Anonymous URL-saved dashboards.
-- The URL token is readable; a separate edit token stays only in the
-- creator's browser so shared recipients cannot overwrite the original.

create extension if not exists pg_cron;

create table if not exists public.shared_dashboards (
  id uuid primary key default gen_random_uuid(),

  share_token uuid not null unique
    default gen_random_uuid(),

  edit_token uuid not null unique
    default gen_random_uuid(),

  name text not null
    check (char_length(name) between 1 and 120),

  dashboard_data jsonb not null
    check (jsonb_typeof(dashboard_data) = 'object'),

  schema_version integer not null
    default 1
    check (schema_version > 0),

  created_at timestamptz not null
    default now(),

  last_accessed_at timestamptz not null
    default now(),

  expires_at timestamptz not null
    default (now() + interval '90 days')
);

create index if not exists
  shared_dashboards_expires_at_idx
on public.shared_dashboards (expires_at);

alter table public.shared_dashboards
enable row level security;

-- Do not expose rows directly through the Data API.
revoke all
on table public.shared_dashboards
from anon, authenticated;


create or replace function public.create_shared_dashboard(
  p_name text,
  p_dashboard_data jsonb,
  p_schema_version integer default 1
)
returns table (
  share_token uuid,
  edit_token uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name is null
     or char_length(trim(p_name)) < 1
     or char_length(trim(p_name)) > 120 then
    raise exception 'Dashboard name must be between 1 and 120 characters.';
  end if;

  if p_dashboard_data is null
     or jsonb_typeof(p_dashboard_data) <> 'object' then
    raise exception 'Dashboard data must be a JSON object.';
  end if;

  -- Keep anonymous storage bounded.
  if octet_length(p_dashboard_data::text) > 2097152 then
    raise exception 'Dashboard data is too large.';
  end if;

  if p_schema_version < 1 then
    raise exception 'Invalid dashboard schema version.';
  end if;

  return query
  insert into public.shared_dashboards (
    name,
    dashboard_data,
    schema_version
  )
  values (
    trim(p_name),
    p_dashboard_data,
    p_schema_version
  )
  returning
    public.shared_dashboards.share_token,
    public.shared_dashboards.edit_token,
    public.shared_dashboards.expires_at;
end;
$$;


create or replace function public.get_shared_dashboard(
  p_share_token uuid
)
returns table (
  name text,
  dashboard_data jsonb,
  schema_version integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An expired link is immediately unusable, even if the hourly
  -- cleanup job has not physically removed it yet.
  delete from public.shared_dashboards
  where public.shared_dashboards.share_token = p_share_token
    and public.shared_dashboards.expires_at <= now();

  return query
  update public.shared_dashboards
  set
    last_accessed_at = now(),
    expires_at = now() + interval '90 days'
  where public.shared_dashboards.share_token = p_share_token
  returning
    public.shared_dashboards.name,
    public.shared_dashboards.dashboard_data,
    public.shared_dashboards.schema_version,
    public.shared_dashboards.expires_at;
end;
$$;


create or replace function public.update_shared_dashboard(
  p_share_token uuid,
  p_edit_token uuid,
  p_name text,
  p_dashboard_data jsonb,
  p_schema_version integer default 1
)
returns table (
  share_token uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name is null
     or char_length(trim(p_name)) < 1
     or char_length(trim(p_name)) > 120 then
    raise exception 'Dashboard name must be between 1 and 120 characters.';
  end if;

  if p_dashboard_data is null
     or jsonb_typeof(p_dashboard_data) <> 'object' then
    raise exception 'Dashboard data must be a JSON object.';
  end if;

  if octet_length(p_dashboard_data::text) > 2097152 then
    raise exception 'Dashboard data is too large.';
  end if;

  return query
  update public.shared_dashboards
  set
    name = trim(p_name),
    dashboard_data = p_dashboard_data,
    schema_version = p_schema_version,
    last_accessed_at = now(),
    expires_at = now() + interval '90 days'
  where public.shared_dashboards.share_token = p_share_token
    and public.shared_dashboards.edit_token = p_edit_token
    and public.shared_dashboards.expires_at > now()
  returning
    public.shared_dashboards.share_token,
    public.shared_dashboards.expires_at;
end;
$$;


revoke all
on function public.create_shared_dashboard(text, jsonb, integer)
from public;

revoke all
on function public.get_shared_dashboard(uuid)
from public;

revoke all
on function public.update_shared_dashboard(uuid, uuid, text, jsonb, integer)
from public;

grant execute
on function public.create_shared_dashboard(text, jsonb, integer)
to anon, authenticated;

grant execute
on function public.get_shared_dashboard(uuid)
to anon, authenticated;

grant execute
on function public.update_shared_dashboard(uuid, uuid, text, jsonb, integer)
to anon, authenticated;


-- Creating a job with the same name replaces the prior job, so this
-- migration can be rerun safely.
select cron.schedule(
  'delete-expired-fishing-dashboard-links',
  '17 * * * *',
  $$delete from public.shared_dashboards
    where expires_at <= now()$$
);
