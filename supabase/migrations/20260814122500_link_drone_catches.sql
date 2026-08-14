alter table public.fishing_catches
  add column if not exists source text not null default 'manual';

alter table public.fishing_catches
  add column if not exists drone_drop_id uuid
    references public.fishing_drops(id)
    on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'fishing_catches_source_check'
      and conrelid =
        'public.fishing_catches'::regclass
  ) then
    alter table public.fishing_catches
      add constraint fishing_catches_source_check
      check (source in ('manual', 'drone'));
  end if;
end;
$$;

create index if not exists
  fishing_catches_drone_drop_idx
  on public.fishing_catches(drone_drop_id)
  where drone_drop_id is not null;

-- Existing catches remain ordinary/manual catches.
update public.fishing_catches
set source = 'manual'
where source is null;

-- Existing table-level grants and RLS policies continue to apply.
