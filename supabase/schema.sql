-- Run this in the Supabase SQL editor.
-- It creates the content table and storage bucket used by the Next.js app.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  ref text,
  slug text not null unique,
  title text not null,
  subtitle text,
  excerpt text not null,
  body text[] not null default '{}',
  quote text,
  type text not null check (type in ('essay', 'fragment', 'chronicle')),
  category text not null,
  tags text[] not null default '{}',
  published_at timestamptz not null default now(),
  cover_image text,
  cover_alt text,
  featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (is_published, published_at desc);
create index if not exists posts_type_idx on public.posts (type);
create index if not exists posts_tags_idx on public.posts using gin (tags);

alter table public.posts enable row level security;

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts for select
to anon, authenticated
using (is_published = true);

-- Writes should use the server-side service role key only.
-- Do not create anon insert/update/delete policies unless you add real auth.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive-assets',
  'archive-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Public can read archive assets" on storage.objects;
create policy "Public can read archive assets"
on storage.objects for select
to public
using (bucket_id = 'archive-assets');

-- Uploads are done by the service role from /api/storage/upload.
