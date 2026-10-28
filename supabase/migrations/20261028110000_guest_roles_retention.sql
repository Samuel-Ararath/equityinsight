create extension if not exists pg_cron with schema extensions;

-- Guest traffic may view the public home page, but application data requires a session.
revoke all on public.market_assets, public.market_quotes, public.market_candles,
  public.financial_snapshots, public.financial_facts, public.market_sentiment_events,
  public.data_sources, public.model_registry, public.data_quality_checks,
  public.decision_signals, public.valuation_projects, public.valuation_runs,
  public.valuation_results, public.financial_periods, public.financial_metrics from anon;

grant select on public.market_assets, public.market_quotes, public.market_candles,
  public.financial_snapshots, public.financial_facts, public.market_sentiment_events,
  public.data_sources, public.model_registry, public.data_quality_checks,
  public.decision_signals to authenticated;

create table if not exists public.saved_workspace_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.saved_workspace_data enable row level security;
create policy "Members access own saved data" on public.saved_workspace_data
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.set_saved_data_expiry()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select p.role from public.profiles p where p.id = new.user_id) = 'free_member'::public.app_role then
    new.expires_at := now() + interval '1 day';
  else
    new.expires_at := null;
  end if;
  return new;
end;
$$;

create trigger saved_data_expiry before insert or update on public.saved_workspace_data
  for each row execute function public.set_saved_data_expiry();
create index if not exists saved_workspace_data_user_expiry_idx
  on public.saved_workspace_data (user_id, expires_at);

create or replace function public.purge_expired_saved_data()
returns bigint language plpgsql security definer set search_path = '' as $$
declare deleted_count bigint;
begin
  delete from public.saved_workspace_data where expires_at is not null and expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.purge_expired_saved_data() from public, anon, authenticated;
grant select, insert, update, delete on public.saved_workspace_data to authenticated;

select cron.schedule(
  'purge-elmesia-free-workspace-data-daily',
  '15 17 * * *',
  $$select public.purge_expired_saved_data();$$
)
where not exists (select 1 from cron.job where jobname = 'purge-elmesia-free-workspace-data-daily');

update public.profiles p
set role = 'administrator'::public.app_role, updated_at = now()
from auth.users u
where p.id = u.id and lower(u.email) = 'sycesima@tutanota.de'
  and p.display_name = 'Lord Ararath';
