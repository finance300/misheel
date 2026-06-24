# Supabase setup — Reports & Regulations (Тайлан & Журам)

The admin dashboard manages the documents shown in the public **Тайлан & Журам**
section. Documents (PDFs) live in Supabase **Storage**; their metadata lives in a
**`reports`** table; only authenticated admins can write (enforced by RLS).

Do these 4 steps once.

## 1. Create a project & add credentials

1. Create a project at https://supabase.com.
2. Project Settings → API → copy the **Project URL** and the **anon public** key.
3. In the app root, copy `.env.example` to `.env` and paste them in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. Restart `npm run dev` (Vite only reads `.env` at startup).

## 2. Create the table + security policies

Supabase dashboard → **SQL Editor** → run:

```sql
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  group_key   text not null check (group_key in ('activity','audit','regulations')),
  title       text not null,
  file_path   text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Anyone can read (public website).
create policy "reports are readable by all"
  on public.reports for select
  using (true);

-- Only signed-in admins can write.
create policy "reports writable by authenticated"
  on public.reports for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

## 3. Create the storage bucket

Dashboard → **Storage** → **New bucket** → name it `reports`, set it **Public**.
Then SQL Editor → run (storage policies):

```sql
-- Public read of files in the "reports" bucket.
create policy "report files are public"
  on storage.objects for select
  using (bucket_id = 'reports');

-- Only signed-in admins can upload/delete.
create policy "report files writable by authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports');

create policy "report files deletable by authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reports');
```

## 4. Create an admin user

Dashboard → **Authentication** → **Users** → **Add user** → enter the admin's
email + password (tick "Auto confirm"). That's who signs in on the admin tab.

---

Once all four are done: open the site → **Нэвтрэх** → **Ерөнхий админ** → the
**Тайлан & Журам** tab. Sign in with the admin email/password, then upload PDFs.
They'll appear on the public Тайлан & Журам section immediately.

Until `.env` is filled, the app runs fine and the public section shows the
built-in placeholder documents.

---

# 5. CMS content tables (admin edits every section)

Run this whole block in the **SQL Editor**. It creates the tables for the
Mission/Values cards, Management team, Timeline, Contact info, and user roles —
all readable by everyone, writable only by signed-in admins.

```sql
-- Reusable: public read, authenticated write.
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

-- Singleton-ish settings (Contact info lives here under key 'contact')
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
```

### Team photo bucket

Dashboard → **Storage** → **New bucket** → name it `team`, set **Public**.
Then SQL Editor:

```sql
create policy "team files public" on storage.objects for select
  using (bucket_id = 'team');
create policy "team files writable" on storage.objects for insert
  to authenticated with check (bucket_id = 'team');
create policy "team files deletable" on storage.objects for delete
  to authenticated using (bucket_id = 'team');
```

That's it — the admin panel (Ерөнхий админ → tabs) now manages every section.
Each section falls back to the built-in content until you add rows. To make
yourself a **general admin**, open the **Users** tab and set your role (or run
`update public.profiles set role='general_admin' where email='you@example.com';`).
