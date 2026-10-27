-- Server-only portal data. No anonymous or authenticated browser API access.
create table if not exists public.portal_state (
 id integer primary key check (id = 1),
 data jsonb not null
);
create table if not exists public.portal_file_metadata (
 id text primary key,
 name text not null,
 type text not null,
 kind text not null,
 owner text not null
);
alter table public.portal_state enable row level security;
alter table public.portal_file_metadata enable row level security;
revoke all on public.portal_state, public.portal_file_metadata from public, anon, authenticated;
grant all on public.portal_state, public.portal_file_metadata to service_role;
create or replace function public.portal_initialize(p_data jsonb)
returns void language sql security invoker set search_path = '' as $$
 insert into public.portal_state (id,data) values (1,p_data) on conflict (id) do nothing;
$$;
create or replace function public.portal_compare_save(p_revision bigint,p_data jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 update public.portal_state set data=p_data
 where id=1 and (data->>'_revision')::bigint=p_revision;
 return found;
end;
$$;
revoke execute on function public.portal_initialize(jsonb) from public,anon,authenticated;
revoke execute on function public.portal_compare_save(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.portal_initialize(jsonb) to service_role;
grant execute on function public.portal_compare_save(bigint,jsonb) to service_role;
insert into storage.buckets (id,name,public,file_size_limit)
values ('portal-files','portal-files',false,10485760)
on conflict (id) do update set public=false,file_size_limit=10485760;
