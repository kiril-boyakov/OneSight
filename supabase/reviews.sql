-- Run once in your Supabase project's SQL Editor. No public table access.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  business text not null default '' check (char_length(business) <= 100),
  review text not null check (char_length(review) between 20 and 1200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index reviews_status_date on public.reviews(status, created_at desc);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select, insert, update, delete on public.reviews to service_role;

-- Short-lived salted connection hashes; raw IP addresses are never stored here.
create table public.review_rate_limits (
  hash text primary key,
  started_at timestamptz not null,
  attempts integer not null
);
alter table public.review_rate_limits enable row level security;
revoke all on public.review_rate_limits from anon, authenticated;
grant all on public.review_rate_limits to service_role;

create function public.submit_review(p_name text, p_business text, p_review text, p_rate_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempt_count integer;
begin
  delete from public.review_rate_limits where started_at < now() - interval '1 hour';
  insert into public.review_rate_limits(hash, started_at, attempts) values (p_rate_hash, now(), 1)
    on conflict(hash) do update set attempts = public.review_rate_limits.attempts + 1
    returning attempts into attempt_count;
  if attempt_count > 3 then return false; end if;
  insert into public.reviews(name,business,review) values(p_name,p_business,p_review);
  return true;
end;
$$;
revoke all on function public.submit_review(text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_review(text,text,text,text) to service_role;
