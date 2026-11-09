begin;
alter table public.reviews add column if not exists notification_status text
  check (notification_status in ('pending','sent','failed','not_configured'));

create or replace function public.submit_review_with_alert(p_name text, p_business text, p_review text, p_rate_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare attempt_count integer; review_id uuid;
begin
  delete from public.review_rate_limits where started_at < now() - interval '1 hour';
  insert into public.review_rate_limits(hash, started_at, attempts) values (p_rate_hash, now(), 1)
    on conflict(hash) do update set attempts = public.review_rate_limits.attempts + 1
    returning attempts into attempt_count;
  if attempt_count > 3 then return null; end if;
  insert into public.reviews(name,business,review,notification_status) values(p_name,p_business,p_review,'pending') returning id into review_id;
  return review_id;
end;
$$;
revoke all on function public.submit_review_with_alert(text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_review_with_alert(text,text,text,text) to service_role;
commit;
