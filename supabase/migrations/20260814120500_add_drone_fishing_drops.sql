create extension if not exists pgcrypto;

create table if not exists public.fishing_drops (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.fishing_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rod_label text not null,
  drop_number integer not null check (drop_number > 0),
  dropped_at timestamptz not null default now(),
  retrieved_at timestamptz,
  origin_latitude double precision not null check (origin_latitude between -90 and 90),
  origin_longitude double precision not null check (origin_longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  distance_yards numeric not null check (distance_yards >= 0),
  bearing_degrees numeric not null check (bearing_degrees >= 0 and bearing_degrees < 360),
  bait text,
  sinker_oz numeric check (sinker_oz is null or sinker_oz >= 0),
  estimated_depth_ft numeric check (estimated_depth_ft is null or estimated_depth_ft >= 0),
  depth_source text not null default 'unknown'
    check (depth_source in ('manual', 'unknown')),
  conditions jsonb not null default '{}'::jsonb,
  bite_at timestamptz,
  caught_fish_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, rod_label, drop_number)
);

create index if not exists fishing_drops_session_dropped_idx
  on public.fishing_drops(session_id, dropped_at desc);

create index if not exists fishing_drops_user_dropped_idx
  on public.fishing_drops(user_id, dropped_at desc);

alter table public.fishing_drops enable row level security;

drop policy if exists "Users can view own fishing drops"
  on public.fishing_drops;
create policy "Users can view own fishing drops"
  on public.fishing_drops
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own fishing drops"
  on public.fishing_drops;
create policy "Users can create own fishing drops"
  on public.fishing_drops
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.fishing_sessions session_row
      where session_row.id = session_id
        and session_row.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own fishing drops"
  on public.fishing_drops;
create policy "Users can update own fishing drops"
  on public.fishing_drops
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.fishing_sessions session_row
      where session_row.id = session_id
        and session_row.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own fishing drops"
  on public.fishing_drops;
create policy "Users can delete own fishing drops"
  on public.fishing_drops
  for delete
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on table public.fishing_drops
  to authenticated;
revoke all
  on table public.fishing_drops
  from anon;

create or replace function public.set_fishing_drop_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fishing_drops_set_updated_at
  on public.fishing_drops;
create trigger fishing_drops_set_updated_at
before update on public.fishing_drops
for each row
execute function public.set_fishing_drop_updated_at();
