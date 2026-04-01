
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL,
  acao text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  pagina text,
  ip text,
  user_agent text
);

CREATE INDEX idx_audit_log_usuario ON public.audit_log (usuario_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_tipo ON public.audit_log (tipo);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode inserir seus próprios logs
CREATE POLICY "usuario_insere_proprio_log"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- Apenas admin e gestor podem visualizar todos os logs
CREATE POLICY "admin_gestor_ve_logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (is_admin_or_gestor(auth.uid()));
