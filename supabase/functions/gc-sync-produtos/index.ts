import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const GC_RATE_LIMIT_DELAY_MS = 350;
const GC_MAX_RETRIES = 3;
const GC_MAX_PER_PAGE = 100;

async function fetchComRetry(url: string, maxRetries: number): Promise<Response> {
  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    const response = await fetch(url);
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let pagina = 1;
  let totalSincronizados = 0;
  let erros = 0;
  let continuar = true;

  while (continuar) {
    if (pagina > 1) {
      await new Promise(resolve => setTimeout(resolve, GC_RATE_LIMIT_DELAY_MS));
    }

    const url = `${GC_BASE_URL}/produtos?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      secret_access_token: SECRET_TOKEN,
      loja_id: String(GC_LOJA_ID),
      limite: String(GC_MAX_PER_PAGE),
      pagina: String(pagina),
    });

    try {
      const response = await fetchComRetry(url, GC_MAX_RETRIES);

      if (!response.ok) {
        await supabase.from('gc_sync_log').insert({
          entidade: 'produtos', acao: 'sync_pagina',
          status: 'erro',
          detalhes: { pagina, status: response.status, body: await response.text() }
        });
        break;
      }

      const body = await response.json();
      const produtos = body?.data || body;

      if (!Array.isArray(produtos) || produtos.length === 0) {
        continuar = false;
        break;
      }

      // Build upsert records WITHOUT foto_url to preserve manual uploads
      const registros = produtos.map((p: any) => ({
        gc_id: String(p.id),
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao,
        tipo: p.tipo_produto === 'S' ? 'servico' : 'produto',
        preco_venda: parseFloat(p.preco_venda) || null,
        unidade: p.unidade || 'UN',
        estoque_atual: parseFloat(p.estoque_atual) || 0,
        ativo: p.ativo !== false,
        gc_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('produtos_gc')
        .upsert(registros, { onConflict: 'gc_id', ignoreDuplicates: false });

      if (error) {
        erros++;
      } else {
        totalSincronizados += registros.length;
      }

      if (produtos.length < GC_MAX_PER_PAGE) {
        continuar = false;
      } else {
        pagina++;
      }
    } catch (e) {
      erros++;
      continuar = false;
    }
  }

  await supabase.from('gc_sync_log').insert({
    entidade: 'produtos',
    acao: 'sync_completo',
    status: erros === 0 ? 'sucesso' : 'parcial',
    detalhes: { total: totalSincronizados, erros, paginas: pagina }
  });

  return new Response(JSON.stringify({
    sucesso: true, total: totalSincronizados, erros
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
