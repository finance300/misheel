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
