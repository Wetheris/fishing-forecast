create table if not exists public.fishing_rods (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.fishing_sessions(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (session_id, label)
);

create index if not exists
  fishing_rods_session_sort_idx
  on public.fishing_rods(
    session_id,
    retired_at,
    sort_order,
    created_at
  );

alter table public.fishing_rods
  enable row level security;

drop policy if exists
  "Users can view own fishing rods"
  on public.fishing_rods;
create policy
  "Users can view own fishing rods"
  on public.fishing_rods
  for select
  using (auth.uid() = user_id);

drop policy if exists
  "Users can create own fishing rods"
  on public.fishing_rods;
create policy
  "Users can create own fishing rods"
  on public.fishing_rods
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

drop policy if exists
  "Users can update own fishing rods"
  on public.fishing_rods;
create policy
  "Users can update own fishing rods"
  on public.fishing_rods
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

drop policy if exists
  "Users can delete own fishing rods"
  on public.fishing_rods;
create policy
  "Users can delete own fishing rods"
  on public.fishing_rods
  for delete
  using (auth.uid() = user_id);

grant usage on schema public
  to authenticated;

grant select, insert, update, delete
  on table public.fishing_rods
  to authenticated;

revoke all
  on table public.fishing_rods
  from anon;

-- Turn the existing text rod labels into persistent rod records.
with existing_labels as (
  select
    session_id,
    user_id,
    rod_label,
    min(dropped_at) as first_drop
  from public.fishing_drops
  group by
    session_id,
    user_id,
    rod_label
),
ranked_labels as (
  select
    session_id,
    user_id,
    rod_label,
    first_drop,
    row_number() over (
      partition by session_id
      order by first_drop, rod_label
    ) as sort_order
  from existing_labels
)
insert into public.fishing_rods (
  session_id,
  user_id,
  label,
  sort_order,
  created_at
)
select
  session_id,
  user_id,
  rod_label,
  sort_order,
  first_drop
from ranked_labels
on conflict (session_id, label)
do nothing;

alter table public.fishing_drops
  add column if not exists rod_id uuid
  references public.fishing_rods(id)
  on delete restrict;

update public.fishing_drops drop_row
set rod_id = rod_row.id
from public.fishing_rods rod_row
where drop_row.rod_id is null
  and rod_row.session_id =
    drop_row.session_id
  and rod_row.label =
    drop_row.rod_label;

create index if not exists
  fishing_drops_rod_dropped_idx
  on public.fishing_drops(
    rod_id,
    dropped_at desc
  );

-- If old beta data accidentally has multiple active drops for one rod,
-- close each older one at the time the next drop began.
with active_drops as (
  select
    id,
    rod_id,
    lead(dropped_at) over (
      partition by rod_id
      order by dropped_at
    ) as next_drop_at
  from public.fishing_drops
  where retrieved_at is null
    and rod_id is not null
)
update public.fishing_drops drop_row
set retrieved_at =
  active_drops.next_drop_at
from active_drops
where drop_row.id =
    active_drops.id
  and active_drops.next_drop_at
    is not null;

-- There can only be one bait actively soaking on a rod.
create unique index if not exists
  fishing_drops_one_active_per_rod
  on public.fishing_drops(rod_id)
  where retrieved_at is null
    and rod_id is not null;
