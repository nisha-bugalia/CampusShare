-- ============================================================
-- CampusShare: listing-images Storage Bucket + RLS Policies
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify the "listing-images" bucket is public under Storage.
-- ============================================================

-- 1. Create the 'listing-images' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5 MB limit per image
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- 2. Storage RLS Policies

-- 2a. Public read access to listing images
drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'listing-images');

-- 2b. Authenticated users can upload listing images to their own folder ({user_id}/*)
drop policy if exists "listing_images_auth_insert" on storage.objects;
create policy "listing_images_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 2c. Authenticated users can update their own listing images
drop policy if exists "listing_images_auth_update" on storage.objects;
create policy "listing_images_auth_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'listing-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 2d. Authenticated users can delete their own listing images (e.g. cleanup on post failure)
drop policy if exists "listing_images_auth_delete" on storage.objects;
create policy "listing_images_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
