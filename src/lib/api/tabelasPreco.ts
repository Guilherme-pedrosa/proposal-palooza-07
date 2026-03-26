import { supabase } from '@/integrations/supabase/client';

export interface TabelaPreco {
  id: string;
  gc_tipo_id: string;
  nome: string;
  principal: boolean;
  ativa: boolean;
}

export interface PrecoProduto {
  id: string;
  produto_id: string;
  tabela_preco_id: string;
  valor_custo: number;
  valor_venda: number;
  lucro_percentual: number;
}

export const tabelasPrecoApi = {
  async getAll(): Promise<TabelaPreco[]> {
    const { data, error } = await supabase
      .from('tabelas_preco')
      .select('*')
      .eq('ativa', true)
      .order('principal', { ascending: false })
      .order('nome');

    if (error) throw error;
    return (data || []) as unknown as TabelaPreco[];
  },

  async getPrincipal(): Promise<TabelaPreco | null> {
    const { data, error } = await supabase
      .from('tabelas_preco')
      .select('*')
      .eq('principal', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as TabelaPreco | null;
  },

  async getPrecosPorTabela(tabelaPrecoId: string): Promise<PrecoProduto[]> {
    const { data, error } = await supabase
      .from('precos_produto')
      .select('*')
      .eq('tabela_preco_id', tabelaPrecoId);

    if (error) throw error;
    return (data || []) as unknown as PrecoProduto[];
  },

  async getPrecosPorProduto(produtoId: string): Promise<(PrecoProduto & { tabela_nome: string })[]> {
    const { data, error } = await supabase
      .from('precos_produto')
      .select('*, tabelas_preco!inner(nome)')
      .eq('produto_id', produtoId);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      ...d,
      tabela_nome: d.tabelas_preco?.nome || '',
    })) as (PrecoProduto & { tabela_nome: string })[];
  },
};
