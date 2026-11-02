begin;
-- Additive migration. Run once in the existing OneSight Supabase SQL Editor.
create table public.inquiries (
 id uuid primary key,
 name text not null check(char_length(name) between 2 and 80),
 email text not null check(char_length(email) between 3 and 254),
 business text not null default '' check(char_length(business)<=100),
 project_type text not null check(project_type in ('new','redesign','updates')),
 description text not null check(char_length(description) between 20 and 5000),
 timeline text not null default '' check(char_length(timeline)<=160),
 status text not null default 'new' check(status in ('new','contacted','archived')),
 notification_status text not null default 'pending' check(notification_status in ('pending','sent','failed','not_configured')),
 notification_id text,
 created_at timestamptz not null default now()
);
create index inquiries_status_date on public.inquiries(status,created_at desc);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from public,anon,authenticated;
grant select,insert,update,delete on public.inquiries to service_role;
create table public.inquiry_rate_limits(hash text primary key,started_at timestamptz not null,attempts integer not null);
alter table public.inquiry_rate_limits enable row level security;
revoke all on public.inquiry_rate_limits from public,anon,authenticated;
grant all on public.inquiry_rate_limits to service_role;
create function public.submit_inquiry(p_id uuid,p_name text,p_email text,p_business text,p_project_type text,p_description text,p_timeline text,p_rate_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.inquiries%rowtype;attempt_count integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select * into existing from public.inquiries where id=p_id;
 if found then
  if existing.name<>p_name or existing.email<>p_email or existing.business<>p_business or existing.project_type<>p_project_type or existing.description<>p_description or existing.timeline<>p_timeline then
   return jsonb_build_object('conflict',true);
  end if;
  return jsonb_build_object('id',existing.id,'notification_status',existing.notification_status);
 end if;
 delete from public.inquiry_rate_limits where started_at<now()-interval '1 hour';
 insert into public.inquiry_rate_limits(hash,started_at,attempts) values(p_rate_hash,now(),1)
 on conflict(hash) do update set attempts=public.inquiry_rate_limits.attempts+1 returning attempts into attempt_count;
 if attempt_count>3 then return jsonb_build_object('limited',true);end if;
 insert into public.inquiries(id,name,email,business,project_type,description,timeline) values(p_id,p_name,p_email,p_business,p_project_type,p_description,p_timeline);
 return jsonb_build_object('id',p_id,'notification_status','pending');
end;$$;
revoke all on function public.submit_inquiry(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_inquiry(uuid,text,text,text,text,text,text,text) to service_role;

commit;
