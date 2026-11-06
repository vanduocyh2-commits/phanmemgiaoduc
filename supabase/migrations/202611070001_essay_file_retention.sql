alter table public.portal_file_metadata add column if not exists created_at timestamptz not null default now();
