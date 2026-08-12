-- Fishing Sessions are account-only. RLS already limits rows to auth.uid(),
-- but the authenticated Postgres role also needs table-level Data API grants.
grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.fishing_sessions
  to authenticated;

grant select, insert, update, delete
  on table public.fishing_catches
  to authenticated;

-- Keep Sessions unavailable to unauthenticated users for now.
revoke all
  on table public.fishing_sessions
  from anon;

revoke all
  on table public.fishing_catches
  from anon;
