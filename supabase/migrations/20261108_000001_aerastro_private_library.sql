-- Aerastro 3D v0.4.0 initial private asset library.
-- Execute in the dedicated development Supabase project SQL Editor after review.
-- No public file sharing, billing, or AI generation is enabled by this migration.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_aerastro_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists aerastro_auth_user_created on auth.users;
create trigger aerastro_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_aerastro_signup();

create table if not exists public.assets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 160),
  original_name text not null check(char_length(original_name) between 1 and 160),
  storage_path text not null unique,
  format text not null check(format in ('glb','gltf','fbx','obj','dae','3ds','stl','ply','3mf','usdz','vtk','pcd','xyz','pdb')),
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 52428800),
  created_at timestamptz not null default now(),
  constraint original_path_matches_owner check(
    storage_path = owner_id::text || '/' || id::text || '/original.' || format
  )
);
create index if not exists assets_owner_created on public.assets(owner_id, created_at desc);
alter table public.assets enable row level security;

drop policy if exists "assets select own" on public.assets;
create policy "assets select own" on public.assets
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "assets insert own" on public.assets;
create policy "assets insert own" on public.assets
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "assets delete own" on public.assets;
create policy "assets delete own" on public.assets
  for delete to authenticated using ((select auth.uid()) = owner_id);
-- No user UPDATE policy: immutable object path and ownership after creation.

insert into storage.buckets(id,name,public,file_size_limit)
values('asset-originals','asset-originals',false,52428800)
on conflict(id) do update set public=false,file_size_limit=52428800;

drop policy if exists "aerastro owner can upload originals" on storage.objects;
create policy "aerastro owner can upload originals" on storage.objects
 for insert to authenticated
 with check (bucket_id = 'asset-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] is not null);

drop policy if exists "aerastro owner can read originals" on storage.objects;
create policy "aerastro owner can read originals" on storage.objects
 for select to authenticated
 using (bucket_id = 'asset-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "aerastro owner can remove originals" on storage.objects;
create policy "aerastro owner can remove originals" on storage.objects
 for delete to authenticated
 using (bucket_id = 'asset-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No cross-user access and no public bucket. Upserts are not allowed.
commit;
