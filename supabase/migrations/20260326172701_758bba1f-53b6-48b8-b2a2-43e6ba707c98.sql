
-- Tabela de conversas WAI (histórico de uso da IA)
CREATE TABLE IF NOT EXISTS wai_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  oportunidade_id UUID REFERENCES oportunidades(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes_gc(id) ON DELETE SET NULL,
  modo TEXT NOT NULL DEFAULT 'livre',
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tokens_prompt INTEGER DEFAULT 0,
  tokens_resposta INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  custo_estimado_usd NUMERIC(8,6) DEFAULT 0,
  modelo TEXT DEFAULT 'gemini-2.5-flash',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de log WAI (controle de custo)
CREATE TABLE IF NOT EXISTS wai_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  modo TEXT,
  tokens_prompt INTEGER,
  tokens_resposta INTEGER,
  tokens_total INTEGER,
  custo_estimado_usd NUMERIC(8,6),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wai_conversas_usuario ON wai_conversas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_wai_conversas_oportunidade ON wai_conversas(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_wai_conversas_cliente ON wai_conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_wai_log_usuario ON wai_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_wai_log_criado ON wai_log(criado_em);

-- RLS
ALTER TABLE wai_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wai_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wai_conversas_own" ON wai_conversas FOR ALL
  USING (usuario_id = auth.uid());

CREATE POLICY "wai_log_own_or_gestor" ON wai_log FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.perfil IN ('gestor','admin'))
  );

CREATE POLICY "wai_log_insert" ON wai_log FOR INSERT
  WITH CHECK (true);

-- View de custo mensal por vendedor
CREATE OR REPLACE VIEW wai_custo_mes AS
SELECT
  u.nome,
  u.id as usuario_id,
  COUNT(*) as chamadas,
  SUM(l.tokens_total) as tokens_total,
  ROUND(SUM(l.custo_estimado_usd)::numeric, 4) as custo_usd
FROM wai_log l
JOIN usuarios u ON u.id = l.usuario_id
WHERE l.criado_em >= DATE_TRUNC('month', NOW())
GROUP BY u.id, u.nome
ORDER BY custo_usd DESC;
