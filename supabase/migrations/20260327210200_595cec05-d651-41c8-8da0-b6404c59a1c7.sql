INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('visitas', 'visitas', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload visita photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visitas');

CREATE POLICY "Anyone can view visita photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'visitas');

CREATE POLICY "Authenticated users can delete visita photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'visitas');