create extension if not exists pgcrypto;

create table if not exists public.fishing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  notes text,
  starting_conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fishing_catches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.fishing_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  caught_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  species text,
  length_value numeric,
  weight_value numeric,
  lure_bait text,
  notes text,
  conditions jsonb not null default '{}'::jsonb,
  stamp_settings jsonb not null default '{}'::jsonb,
  original_photo_path text,
  stamped_photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists fishing_sessions_user_started_idx
  on public.fishing_sessions(user_id, started_at desc);

create index if not exists fishing_catches_session_caught_idx
  on public.fishing_catches(session_id, caught_at desc);

create index if not exists fishing_catches_user_caught_idx
  on public.fishing_catches(user_id, caught_at desc);

alter table public.fishing_sessions enable row level security;
alter table public.fishing_catches enable row level security;

drop policy if exists "Users can view own fishing sessions"
  on public.fishing_sessions;
create policy "Users can view own fishing sessions"
  on public.fishing_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own fishing sessions"
  on public.fishing_sessions;
create policy "Users can create own fishing sessions"
  on public.fishing_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own fishing sessions"
  on public.fishing_sessions;
create policy "Users can update own fishing sessions"
  on public.fishing_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own fishing sessions"
  on public.fishing_sessions;
create policy "Users can delete own fishing sessions"
  on public.fishing_sessions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own fishing catches"
  on public.fishing_catches;
create policy "Users can view own fishing catches"
  on public.fishing_catches
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own fishing catches"
  on public.fishing_catches;
create policy "Users can create own fishing catches"
  on public.fishing_catches
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

drop policy if exists "Users can update own fishing catches"
  on public.fishing_catches;
create policy "Users can update own fishing catches"
  on public.fishing_catches
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

drop policy if exists "Users can delete own fishing catches"
  on public.fishing_catches;
create policy "Users can delete own fishing catches"
  on public.fishing_catches
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_fishing_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fishing_sessions_set_updated_at
  on public.fishing_sessions;
create trigger fishing_sessions_set_updated_at
before update on public.fishing_sessions
for each row
execute function public.set_fishing_session_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catch-photos',
  'catch-photos',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own catch photos"
  on storage.objects;
create policy "Users can read own catch photos"
  on storage.objects
  for select
  using (
    bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own catch photos"
  on storage.objects;
create policy "Users can upload own catch photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own catch photos"
  on storage.objects;
create policy "Users can update own catch photos"
  on storage.objects
  for update
  using (
    bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own catch photos"
  on storage.objects;
create policy "Users can delete own catch photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
