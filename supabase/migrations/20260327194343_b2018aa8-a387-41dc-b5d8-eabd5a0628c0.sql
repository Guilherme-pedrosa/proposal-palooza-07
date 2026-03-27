
-- Tabela de visitas com check-in/check-out GPS
CREATE TABLE public.visitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes_gc(id) ON DELETE CASCADE NOT NULL,
  oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES public.usuarios(id) NOT NULL,
  
  -- Check-in
  checkin_at TIMESTAMP WITH TIME ZONE,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  
  -- Check-out
  checkout_at TIMESTAMP WITH TIME ZONE,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  
  -- Duração calculada (minutos)
  duracao_minutos INTEGER,
  
  -- Registro pós-visita
  resultado TEXT,
  proxima_acao TEXT,
  proxima_data TIMESTAMP WITH TIME ZONE,
  satisfacao INTEGER CHECK (satisfacao >= 1 AND satisfacao <= 5),
  fotos TEXT[] DEFAULT '{}',
  observacoes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  data_agendada TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedor_gerencia_proprias_visitas" ON public.visitas
  FOR ALL TO public
  USING (vendedor_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_visitas_updated_at
  BEFORE UPDATE ON public.visitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index para queries frequentes
CREATE INDEX idx_visitas_vendedor_status ON public.visitas(vendedor_id, status);
CREATE INDEX idx_visitas_cliente ON public.visitas(cliente_id);
CREATE INDEX idx_visitas_data_agendada ON public.visitas(data_agendada);
