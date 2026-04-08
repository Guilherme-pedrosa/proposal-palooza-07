-- Allow anonymous users to read company_settings for public proposal pages
CREATE POLICY "anon_leem_company_settings"
ON public.company_settings
FOR SELECT
TO anon
USING (true);