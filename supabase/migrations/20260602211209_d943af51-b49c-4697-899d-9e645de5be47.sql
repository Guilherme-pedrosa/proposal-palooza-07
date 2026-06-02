ALTER TABLE public.clientes_gc 
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS contato text;