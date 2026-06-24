-- ============================================================
-- Misheel CMS — run this WHOLE file in the Supabase SQL Editor.
-- (Pure SQL only. Safe to re-run.)
-- The `reports` table/bucket from the earlier step are NOT repeated here.
-- ============================================================

-- Reusable helper: public read, authenticated write.
create or replace function public.apply_cms_policies(tbl regclass) returns void
language plpgsql as $$
begin
  execute format('alter table %s enable row level security', tbl);
  execute format('drop policy if exists cms_read on %s', tbl);
  execute format('drop policy if exists cms_write on %s', tbl);
  execute format('create policy cms_read on %s for select using (true)', tbl);
  execute format($p$create policy cms_write on %s for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated')$p$, tbl);
end; $$;

-- Reports & Regulations documents.
-- group_key is a free-form category key managed by the admin (categories live in
-- site_settings under 'report_categories'), so there is NO check constraint on it.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  title text not null default '',
  file_path text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select public.apply_cms_policies('public.reports');

-- If the reports table was created earlier with a fixed check constraint on
-- group_key, drop it so custom category keys are accepted.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c'
  loop
    execute format('alter table public.reports drop constraint %I', c);
  end loop;
end $$;

-- Mission / Values cards (rotating carousel)
create table if not exists public.home_cards (
  id uuid primary key default gen_random_uuid(),
  title_mn text not null default '', body_mn text not null default '',
  title_en text not null default '', body_en text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select public.apply_cms_policies('public.home_cards');

-- Management team
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name_mn text not null default '', role_mn text not null default '',
  name_en text not null default '', role_en text not null default '',
  photo_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select public.apply_cms_policies('public.team_members');

-- Timeline
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  year text not null default '',
  text_mn text not null default '', text_en text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
select public.apply_cms_policies('public.timeline_events');

-- Settings (Contact info lives here under key 'contact')
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);
select public.apply_cms_policies('public.site_settings');

-- User roles. A profile row is auto-created on signup; admins assign the role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'fund_manager'
    check (role in ('general_admin','board_member','fund_manager')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_write on public.profiles;
create policy profiles_read on public.profiles for select using (auth.role() = 'authenticated');
create policy profiles_write on public.profiles for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist.
insert into public.profiles (id, email)
select id, email from auth.users on conflict (id) do nothing;

-- ============================================================
-- AFTER the above succeeds: create a PUBLIC storage bucket named
-- `team` in the dashboard (Storage → New bucket → name "team" → Public),
-- THEN run the three policies below.
-- ============================================================
-- Reports bucket policies (create a PUBLIC bucket named `reports` first).
drop policy if exists "report files are public" on storage.objects;
drop policy if exists "report files writable by authenticated" on storage.objects;
drop policy if exists "report files deletable by authenticated" on storage.objects;
create policy "report files are public" on storage.objects for select
  using (bucket_id = 'reports');
create policy "report files writable by authenticated" on storage.objects for insert
  to authenticated with check (bucket_id = 'reports');
create policy "report files deletable by authenticated" on storage.objects for delete
  to authenticated using (bucket_id = 'reports');

drop policy if exists "team files public" on storage.objects;
drop policy if exists "team files writable" on storage.objects;
drop policy if exists "team files deletable" on storage.objects;
create policy "team files public" on storage.objects for select
  using (bucket_id = 'team');
create policy "team files writable" on storage.objects for insert
  to authenticated with check (bucket_id = 'team');
create policy "team files deletable" on storage.objects for delete
  to authenticated using (bucket_id = 'team');
