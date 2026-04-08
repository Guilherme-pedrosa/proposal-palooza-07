
CREATE TABLE public.simulacoes_roi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL,
  nome_restaurante TEXT NOT NULL,
  url_cardapio TEXT,
  materias_primas JSONB NOT NULL DEFAULT '{}'::jsonb,
  custo_energia NUMERIC DEFAULT 0,
  custo_gordura NUMERIC DEFAULT 0,
  custo_mao_obra NUMERIC DEFAULT 0,
  custo_agua NUMERIC DEFAULT 0,
  refeicoes_dia INTEGER DEFAULT 0,
  dias_mes INTEGER DEFAULT 26,
  resultado_analise JSONB,
  economia_mensal NUMERIC DEFAULT 0,
  economia_anual NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulacoes_roi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedor_gerencia_proprias_simulacoes"
ON public.simulacoes_roi
FOR ALL
USING (vendedor_id = auth.uid());

CREATE TRIGGER update_simulacoes_roi_updated_at
BEFORE UPDATE ON public.simulacoes_roi
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
