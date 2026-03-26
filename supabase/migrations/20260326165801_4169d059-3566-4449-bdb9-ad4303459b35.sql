-- Allow anonymous (public) access to propostas by link_publico_uuid for the public page
CREATE POLICY "Public can read propostas by link_publico_uuid"
ON public.propostas
FOR SELECT
TO anon
USING (link_publico_uuid IS NOT NULL);

-- Allow anonymous updates for view tracking and approval
CREATE POLICY "Public can update proposta status and view tracking"
ON public.propostas
FOR UPDATE
TO anon
USING (link_publico_uuid IS NOT NULL)
WITH CHECK (link_publico_uuid IS NOT NULL);

-- Allow authenticated users full access to propostas
CREATE POLICY "Authenticated users can manage propostas"
ON public.propostas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);