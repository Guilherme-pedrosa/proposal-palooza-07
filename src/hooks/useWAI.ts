import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WAIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface WAIContexto {
  cliente?: {
    id?: string;
    nome: string;
    segmento?: string | null;
    porte?: string | null;
    cidade?: string | null;
    estado?: string | null;
    ultima_compra?: string | null;
    total_compras?: number | null;
    observacoes?: string | null;
  };
  oportunidade?: {
    titulo: string;
    etapa?: string;
    tipo_venda?: string | null;
    valor_estimado?: number | null;
    probabilidade?: number | null;
    temperatura?: string | null;
    dias_sem_atividade?: number;
    origem?: string | null;
    ultima_atividade?: string | null;
    produtos_interesse?: string | null;
  };
  proposta?: {
    numero: string;
    status?: string | null;
    valor_total?: number | null;
    produtos_nomes?: string;
    dias_enviada?: number;
    aberto_contagem?: number | null;
    validade_ate?: string | null;
  };
}

export function useWAI(contexto: WAIContexto) {
  const [historico, setHistorico] = useState<WAIMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const perguntar = useCallback(async (pergunta: string, modo?: string): Promise<string | null> => {
    setCarregando(true);
    setErro(null);

    const novaMensagem: WAIMessage = {
      role: 'user',
      content: pergunta || `[${modo}]`,
      timestamp: new Date(),
    };
    
    setHistorico(h => [...h, novaMensagem]);

    try {
      const { data, error } = await supabase.functions.invoke('wai-sales-assistant', {
        body: {
          pergunta,
          modo,
          contexto_cliente: contexto.cliente,
          contexto_oportunidade: contexto.oportunidade,
          contexto_proposta: contexto.proposta,
          historico_chat: historico.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;
      if (data?.erro) throw new Error(data.mensagem);

      const resposta = data.resposta;

      setHistorico(h => [...h, {
        role: 'assistant',
        content: resposta,
        timestamp: new Date(),
      }]);

      return resposta;
    } catch (e: any) {
      console.error('WAI error:', e);
      setErro('WAI indisponível no momento. Tente novamente.');
      return null;
    } finally {
      setCarregando(false);
    }
  }, [contexto, historico]);

  const acionarModo = useCallback(async (modo: string): Promise<string | null> => {
    return perguntar('', modo);
  }, [perguntar]);

  const limparHistorico = useCallback(() => {
    setHistorico([]);
    setErro(null);
  }, []);

  return { historico, perguntar, acionarModo, carregando, erro, limparHistorico };
}
