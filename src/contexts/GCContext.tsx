import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClienteGC, ProdutoGC } from '@/types/crm';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCatalogQueries } from '@/lib/query/invalidateCatalogQueries';

interface OrcamentoPayload {
  gc_cliente_id: string;
  produtos: { gc_produto_id: string; quantidade: number; valor_unitario: number }[];
  observacoes?: string;
  vendedor_nome: string;
  proposta_numero: string;
}

interface OrcamentoResult {
  sucesso: boolean;
  gc_orcamento_id: string;
  gc_orcamento_url: string;
}

interface HistoricoGC {
  orcamentos: any[];
  vendas: any[];
  recebimentos: any[];
}

interface GCState {
  isSyncingClientes: boolean;
  isSyncingProdutos: boolean;
  lastSyncClientes: Date | null;
  lastSyncProdutos: Date | null;
  syncClientes: () => Promise<void>;
  syncProdutos: () => Promise<void>;
  criarOrcamentoGC: (payload: OrcamentoPayload) => Promise<OrcamentoResult>;
  buscarHistoricoCliente: (gc_id: string) => Promise<HistoricoGC>;
  testarConexao: () => Promise<{ ok: boolean; mensagem: string }>;
}

const GCContext = createContext<GCState | undefined>(undefined);

export function GCProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isSyncingClientes, setIsSyncingClientes] = useState(false);
  const [isSyncingProdutos, setIsSyncingProdutos] = useState(false);
  const [lastSyncClientes, setLastSyncClientes] = useState<Date | null>(null);
  const [lastSyncProdutos, setLastSyncProdutos] = useState<Date | null>(null);

  // Load last sync timestamps from gc_sync_log
  useEffect(() => {
    const loadLastSync = async () => {
      const { data: logs } = await supabase
        .from('gc_sync_log')
        .select('entidade, created_at')
        .eq('acao', 'sync_completo')
        .eq('status', 'sucesso')
        .order('created_at', { ascending: false })
        .limit(2);

      logs?.forEach((log: any) => {
        if (log.entidade === 'clientes') setLastSyncClientes(new Date(log.created_at));
        if (log.entidade === 'produtos') setLastSyncProdutos(new Date(log.created_at));
      });
    };
    loadLastSync();
  }, []);

  const syncClientes = async () => {
    setIsSyncingClientes(true);
    try {
      const { data, error } = await supabase.functions.invoke('gc-sync-clientes');
      if (error) throw error;
      setLastSyncClientes(new Date());
      toast.success(`✅ ${data?.total ?? 0} clientes sincronizados com GestãoClick`);
    } catch (e: any) {
      toast.error('❌ Erro ao sincronizar clientes. Verifique a API GC.');
      console.error(e);
    } finally {
      setIsSyncingClientes(false);
    }
  };

  const syncProdutos = async () => {
    setIsSyncingProdutos(true);
    try {
      const { data, error } = await supabase.functions.invoke('gc-sync-produtos');
      if (error) throw error;
      setLastSyncProdutos(new Date());
      await invalidateCatalogQueries(queryClient);
      toast.success(`✅ ${data?.total_catalogo ?? 0} itens sincronizados (${data?.total_produtos ?? 0} produtos e ${data?.total_servicos ?? 0} serviços)`);
    } catch (e: any) {
      toast.error('❌ Erro ao sincronizar produtos. Verifique a API GC.');
      console.error(e);
    } finally {
      setIsSyncingProdutos(false);
    }
  };

  const criarOrcamentoGC = async (payload: OrcamentoPayload): Promise<OrcamentoResult> => {
    const { data, error } = await supabase.functions.invoke('gc-criar-orcamento', { body: payload });
    if (error) throw error;
    if (data?.erro === 'API_KEY_EXPIRADA') {
      toast.error('⚠️ Chave de API GestãoClick expirada. Acesse Configurações.');
      throw new Error('API_KEY_EXPIRADA');
    }
    if (data?.erro) throw new Error(data.mensagem);
    return data;
  };

  const buscarHistoricoCliente = async (gc_id: string): Promise<HistoricoGC> => {
    const { data, error } = await supabase.functions.invoke('gc-buscar-historico-cliente', {
      body: { gc_cliente_id: gc_id }
    });
    if (error) throw error;
    return data;
  };

  const testarConexao = async () => {
    const { data, error } = await supabase.functions.invoke('gc-testar-conexao');
    if (error) return { ok: false, mensagem: 'Erro ao testar conexão' };
    return data;
  };

  return (
    <GCContext.Provider value={{
      isSyncingClientes,
      isSyncingProdutos,
      lastSyncClientes,
      lastSyncProdutos,
      syncClientes,
      syncProdutos,
      criarOrcamentoGC,
      buscarHistoricoCliente,
      testarConexao,
    }}>
      {children}
    </GCContext.Provider>
  );
}

export function useGC() {
  const ctx = useContext(GCContext);
  if (!ctx) throw new Error('useGC deve ser usado dentro de GCProvider');
  return ctx;
}
