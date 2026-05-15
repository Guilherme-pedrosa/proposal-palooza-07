import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
// Override via env GC_SITUACAO_ORCAMENTO_ID se necessário
const GC_SITUACAO_DEFAULT = 7116099;
const GC_MAX_RETRIES = 3;

async function fetchComRetry(url: string, init: RequestInit, maxRetries: number): Promise<Response> {
  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    const response = await fetch(url, init);
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, Math.pow(2, tentativa) * 1000));
      continue;
    }
    return response;
  }
  throw new Error('Máximo de tentativas atingido');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;
  const SITUACAO_ID = Number(Deno.env.get('GC_SITUACAO_ORCAMENTO_ID') ?? GC_SITUACAO_DEFAULT);

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  const {
    gc_cliente_id,
    produtos,
    observacoes,
    vendedor_nome,
    proposta_numero,
  } = await req.json();

  // Estrutura correta da API GestãoClick:
  // produtos: [{ produto: { produto_id, quantidade, valor_venda, valor_total, ... } }]
  const produtosGC = (produtos ?? []).map((p: any) => {
    const quantidade = Number(p.quantidade ?? 1);
    const valor_venda = Number(p.valor_unitario ?? 0);
    const valor_total = Number((quantidade * valor_venda).toFixed(2));
    return {
      produto: {
        produto_id: String(p.gc_produto_id),
        quantidade: quantidade.toFixed(2),
        valor_venda: valor_venda.toFixed(2),
        valor_total: valor_total.toFixed(2),
        tipo_desconto: 'R$',
        desconto_valor: '0.00',
        desconto_porcentagem: '0.00',
      },
    };
  });

  const valorTotalOrc = produtosGC.reduce(
    (acc: number, item: any) => acc + Number(item.produto.valor_total),
    0,
  );

  const hoje = new Date().toISOString().split('T')[0];

  const payload: Record<string, any> = {
    tipo: 'produto',
    loja_id: GC_LOJA_ID,
    cliente_id: gc_cliente_id,
    situacao_id: SITUACAO_ID,
    data: hoje,
    valor_total: valorTotalOrc.toFixed(2),
    valor_frete: '0.00',
    desconto_valor: '0.00',
    desconto_porcentagem: '0.00',
    condicao_pagamento: 'a_vista',
    observacoes: `CRM WeDo - Proposta ${proposta_numero} - ${vendedor_nome}\n\n${observacoes || ''}`,
    produtos: produtosGC,
  };

  const url = `${GC_BASE_URL}/orcamentos`;

  console.log('[gc-criar-orcamento] payload:', JSON.stringify(payload));

  try {
    const response = await fetchComRetry(url, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify(payload),
    }, GC_MAX_RETRIES);

    if (response.status === 401) {
      return new Response(JSON.stringify({
        erro: 'API_KEY_EXPIRADA',
        mensagem: 'Chave de API do GestãoClick expirada. Acesse Configurações para atualizar.'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[gc-criar-orcamento] GC error:', response.status, errBody);
      return new Response(JSON.stringify({
        erro: 'ERRO_GC',
        mensagem: `Erro ao criar orçamento: ${errBody}`
      }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const json = await response.json();
    console.log('[gc-criar-orcamento] GC response:', JSON.stringify(json));
    const orcamento = json.data ?? json;
    const gc_orcamento_id = String(orcamento.id);
    const gc_orcamento_url = `https://app.gestaoclick.com/orcamentos/visualizar/${gc_orcamento_id}`;

    return new Response(JSON.stringify({
      sucesso: true,
      gc_orcamento_id,
      gc_orcamento_url,
      valor_total: valorTotalOrc,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({
      erro: 'ERRO_CONEXAO',
      mensagem: e instanceof Error ? e.message : 'Erro desconhecido'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
