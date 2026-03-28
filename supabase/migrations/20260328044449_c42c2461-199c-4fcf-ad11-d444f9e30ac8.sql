ALTER TABLE public.prospects_rf 
  ADD COLUMN IF NOT EXISTS socios jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contato_principal text;