
-- Tabelas de preço do GestãoClick
CREATE TABLE public.tabelas_preco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_tipo_id text NOT NULL UNIQUE,
  nome text NOT NULL,
  principal boolean NOT NULL DEFAULT false,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tabelas_preco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_leem_tabelas_preco" ON public.tabelas_preco
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados_escrevem_tabelas_preco" ON public.tabelas_preco
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "autenticados_atualizam_tabelas_preco" ON public.tabelas_preco
  FOR UPDATE TO authenticated USING (true);

-- Preços por produto e tabela
CREATE TABLE public.precos_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos_gc(id) ON DELETE CASCADE,
  tabela_preco_id uuid NOT NULL REFERENCES public.tabelas_preco(id) ON DELETE CASCADE,
  valor_custo numeric DEFAULT 0,
  valor_venda numeric DEFAULT 0,
  lucro_percentual numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(produto_id, tabela_preco_id)
);

ALTER TABLE public.precos_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_leem_precos" ON public.precos_produto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados_escrevem_precos" ON public.precos_produto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "autenticados_atualizam_precos" ON public.precos_produto
  FOR UPDATE TO authenticated USING (true);
