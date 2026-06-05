ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS aprovador_nome text,
  ADD COLUMN IF NOT EXISTS aprovador_cpf text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_ip text;