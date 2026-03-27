
-- Allow authenticated users to upload to proposals bucket
CREATE POLICY "Authenticated users can upload to proposals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposals');

-- Allow authenticated users to read from proposals bucket
CREATE POLICY "Authenticated users can read proposals files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proposals');

-- Allow anonymous users to read proposals files (for public proposal links)
CREATE POLICY "Anon can read proposals files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'proposals');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete proposals files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposals');
