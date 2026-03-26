
-- 1. Notificacoes table
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  link text,
  lida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_proprias_notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "usuario_atualiza_proprias_notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "service_insere_notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Auto-create activity on new opportunity
CREATE OR REPLACE FUNCTION public.auto_criar_atividade_inicial()
RETURNS TRIGGER AS $$
DECLARE
  prox_dia DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE + 1;
BEGIN
  WHILE EXTRACT(DOW FROM prox_dia) IN (0, 6) LOOP
    prox_dia := prox_dia + 1;
  END LOOP;

  INSERT INTO public.atividades (
    oportunidade_id, cliente_id, vendedor_id,
    tipo, titulo, descricao, data_prevista, concluida
  ) VALUES (
    NEW.id, NEW.cliente_id, NEW.vendedor_id,
    'ligacao',
    'Primeiro contato — qualificar necessidade na cozinha',
    'Ligar para o cliente, entender a necessidade, confirmar interesse e agendar visita técnica.',
    (prox_dia || ' 09:00:00')::TIMESTAMPTZ,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_atividade_inicial
  AFTER INSERT ON public.oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_criar_atividade_inicial();

-- 3. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.oportunidades;
