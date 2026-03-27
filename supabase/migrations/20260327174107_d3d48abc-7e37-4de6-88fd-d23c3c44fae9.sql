-- Tabela de prospects da Receita Federal
CREATE TABLE IF NOT EXISTS prospects_rf (
  cnpj TEXT PRIMARY KEY,
  razao_social TEXT,
  nome_fantasia TEXT,
  endereco_completo TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  cnae_codigo TEXT NOT NULL,
  cnae_descricao TEXT,
  situacao_cadastral TEXT DEFAULT 'Ativa',
  regime_fiscal TEXT,
  porte TEXT,
  capital_social DECIMAL(15,2) DEFAULT 0,
  natureza_juridica TEXT,
  data_inicio_atividade TEXT,
  telefone_1 TEXT,
  telefone_2 TEXT,
  email TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocodificado BOOLEAN DEFAULT false,
  fonte TEXT DEFAULT 'receita_federal',
  eh_cliente_wedo BOOLEAN DEFAULT false,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prospects_cnae ON prospects_rf(cnae_codigo);
CREATE INDEX IF NOT EXISTS idx_prospects_uf ON prospects_rf(uf);
CREATE INDEX IF NOT EXISTS idx_prospects_cidade ON prospects_rf(cidade);
CREATE INDEX IF NOT EXISTS idx_prospects_regime ON prospects_rf(regime_fiscal);
CREATE INDEX IF NOT EXISTS idx_prospects_porte ON prospects_rf(porte);
CREATE INDEX IF NOT EXISTS idx_prospects_situacao ON prospects_rf(situacao_cadastral);
CREATE INDEX IF NOT EXISTS idx_prospects_geo ON prospects_rf(latitude, longitude) WHERE geocodificado = true;
CREATE INDEX IF NOT EXISTS idx_prospects_busca ON prospects_rf(cnae_codigo, uf, regime_fiscal);

-- RLS
ALTER TABLE prospects_rf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select_auth" ON prospects_rf FOR SELECT
  USING (auth.role() = 'authenticated');

-- View de estatísticas
CREATE OR REPLACE VIEW prospects_stats AS
SELECT 
  cnae_codigo,
  cnae_descricao,
  uf,
  regime_fiscal,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as com_email,
  COUNT(*) FILTER (WHERE telefone_1 IS NOT NULL AND telefone_1 != '') as com_telefone,
  COUNT(*) FILTER (WHERE geocodificado = true) as geocodificados,
  COUNT(*) FILTER (WHERE eh_cliente_wedo = true) as ja_clientes
FROM prospects_rf
WHERE situacao_cadastral = 'Ativa'
GROUP BY cnae_codigo, cnae_descricao, uf, regime_fiscal
ORDER BY total DESC;

-- Função para marcar prospects que já são clientes
CREATE OR REPLACE FUNCTION marcar_prospects_clientes()
RETURNS void AS $$
BEGIN
  UPDATE prospects_rf SET eh_cliente_wedo = false WHERE eh_cliente_wedo = true;
  UPDATE prospects_rf p
  SET eh_cliente_wedo = true
  FROM clientes_gc c
  WHERE p.cnpj = REPLACE(REPLACE(REPLACE(c.cnpj, '.', ''), '/', ''), '-', '')
    AND c.cnpj IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;