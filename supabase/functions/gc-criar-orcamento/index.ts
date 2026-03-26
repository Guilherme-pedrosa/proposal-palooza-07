import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const GC_SITUACAO_ORCAMENTO_INICIAL = 7116099;
const GC_MAX_RETRIES = 3;

async function fetchComRetry(url: string, body: object, maxRetries: number): Promise<Response> {
  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const {
    gc_cliente_id,
    produtos,
    observacoes,
    vendedor_nome,
    proposta_numero
  } = await req.json();

  const payload = {
    loja_id: GC_LOJA_ID,
    cliente_id: gc_cliente_id,
    situacao_id: GC_SITUACAO_ORCAMENTO_INICIAL,
    observacoes: `CRM WeDo - Proposta ${proposta_numero} - ${vendedor_nome}\n\n${observacoes || ''}`,
    produtos: produtos.map((p: any) => ({
      produto_id: p.gc_produto_id,
      quantidade: p.quantidade,
      valor_unitario: p.valor_unitario,
    })),
  };

  const url = `${GC_BASE_URL}/orcamentos?` + new URLSearchParams({
    access_token: ACCESS_TOKEN,
    secret_access_token: SECRET_TOKEN,
  });

  try {
    const response = await fetchComRetry(url, payload, GC_MAX_RETRIES);

    if (response.status === 401) {
      return new Response(JSON.stringify({
        erro: 'API_KEY_EXPIRADA',
        mensagem: 'Chave de API do GestãoClick expirada. Acesse Configurações para atualizar.'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(JSON.stringify({
        erro: 'ERRO_GC',
        mensagem: `Erro ao criar orçamento: ${errBody}`
      }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: orcamento } = await response.json();
    const gc_orcamento_id = String(orcamento.id);
    const gc_orcamento_url = `https://gestaoclick.com/orcamentos/visualizar/${gc_orcamento_id}`;

    return new Response(JSON.stringify({
      sucesso: true,
      gc_orcamento_id,
      gc_orcamento_url
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({
      erro: 'ERRO_CONEXAO',
      mensagem: e instanceof Error ? e.message : 'Erro desconhecido'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
