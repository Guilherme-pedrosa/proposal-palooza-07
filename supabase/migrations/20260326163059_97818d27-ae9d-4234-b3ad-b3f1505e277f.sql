
-- Create storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('product-photos', 'product-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('proposals', 'proposals', false, 20971520, ARRAY['application/pdf']),
  ('avatars', 'avatars', false, 2097152, ARRAY['image/jpeg', 'image/png']);

-- Storage RLS policies
create policy "Public read product photos" on storage.objects
  for select using (bucket_id = 'product-photos');

create policy "Authenticated upload product photos" on storage.objects
  for insert with check (bucket_id = 'product-photos' and auth.role() = 'authenticated');

create policy "Authenticated read proposals" on storage.objects
  for select using (bucket_id = 'proposals' and auth.role() = 'authenticated');

create policy "Authenticated upload proposals" on storage.objects
  for insert with check (bucket_id = 'proposals' and auth.role() = 'authenticated');

create policy "Users manage own avatar" on storage.objects
  for all using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
