import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const GC_RATE_LIMIT_DELAY_MS = 350;
const GC_MAX_RETRIES = 3;
const GC_MAX_PER_PAGE = 100;

// Default principal price table
const TABELA_PRINCIPAL_GC_ID = '576894'; // TABELA COMERCIAL ACESSÓRIOS

// Sync ALL products (no group filter)

async function fetchComRetry(url: string, headers: Record<string, string>, maxRetries: number): Promise<Response> {
  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    const response = await fetch(url, { headers });
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, Math.pow(2, tentativa) * 1000));
      continue;
    }
    return response;
  }
  throw new Error('Máximo de tentativas atingido');
}

type GCProdutoRegistro = {
  gc_id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  tipo: 'produto' | 'servico';
  preco_venda: number | null;
  unidade: string;
  estoque_atual: number;
  ativo: boolean;
  foto_url: string | null;
  fotos_urls: string[];
  gc_synced_at: string;
};

async function fetchAllPages(endpoint: string, gcHeaders: Record<string, string>) {
  const items: any[] = [];
  let pagina = 1;
  let paginasProcessadas = 0;

  while (true) {
    await new Promise(resolve => setTimeout(resolve, GC_RATE_LIMIT_DELAY_MS));

    const url = `${GC_BASE_URL}${endpoint}?` + new URLSearchParams({
      loja_id: String(GC_LOJA_ID),
      limite: String(GC_MAX_PER_PAGE),
      pagina: String(pagina),
    });

    const response = await fetchComRetry(url, gcHeaders, GC_MAX_RETRIES);
    if (!response.ok) {
      throw new Error(`Erro ${response.status} ao consultar ${endpoint}: ${await response.text()}`);
    }

    const body = await response.json();
    const pageItems = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    paginasProcessadas++;

    const meta = body?.meta;
    const proximaPagina = meta?.proxima_pagina;
    const totalDaPagina = Number(meta?.total_da_pagina ?? meta?.total_registros_pagina ?? pageItems.length);
    const limitePorPagina = Number(meta?.limite_por_pagina ?? GC_MAX_PER_PAGE);

    if (!proximaPagina || totalDaPagina < limitePorPagina || pageItems.length < GC_MAX_PER_PAGE) {
      break;
    }

    pagina = Number(proximaPagina);
  }

  return { items, paginasProcessadas };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  let totalProdutos = 0;
  let totalServicos = 0;
  let totalPrecos = 0;
  let erros = 0;
  let paginasTotal = 0;

  // Map to collect all unique price tables discovered during sync
  const tabelasDescobertas = new Map<string, string>();

  // Collect all price entries to upsert after products
  const allPriceEntries: Array<{
    gc_produto_id: string;
    gc_tipo_id: string;
    valor_custo: number;
    valor_venda: number;
    lucro_percentual: number;
  }> = [];

  try {
    const [{ items: produtos, paginasProcessadas: paginasProdutos }, { items: servicos, paginasProcessadas: paginasServicos }] = await Promise.all([
      fetchAllPages('/produtos', gcHeaders),
      fetchAllPages('/servicos', gcHeaders),
    ]);

    const syncedAt = new Date().toISOString();

    const registrosProdutos: GCProdutoRegistro[] = produtos.map((p: any) => {
      let precoVenda = parseFloat(p.valor_venda) || null;
      if (Array.isArray(p.valores)) {
        const principalTabela = p.valores.find((v: any) => String(v.tipo_id) === TABELA_PRINCIPAL_GC_ID);
        if (principalTabela) {
          precoVenda = parseFloat(principalTabela.valor_venda) || precoVenda;
        }

        for (const v of p.valores) {
          if (v.tipo_id && v.nome_tipo) {
            tabelasDescobertas.set(String(v.tipo_id), v.nome_tipo);
            allPriceEntries.push({
              gc_produto_id: String(p.id),
              gc_tipo_id: String(v.tipo_id),
              valor_custo: parseFloat(v.valor_custo) || 0,
              valor_venda: parseFloat(v.valor_venda) || 0,
              lucro_percentual: parseFloat(v.lucro_utilizado) || 0,
            });
          }
        }
      }

      const fotos: string[] = Array.isArray(p.fotos) ? p.fotos.filter((f: any) => typeof f === 'string' && f.length > 0) : [];

      return {
        gc_id: String(p.id),
        codigo: p.codigo_interno || p.codigo || null,
        nome: p.nome,
        descricao: p.descricao || null,
        categoria: p.nome_grupo || null,
        tipo: 'produto',
        preco_venda: precoVenda,
        unidade: p.unidade || 'UN',
        estoque_atual: parseFloat(p.estoque) || 0,
        ativo: p.ativo !== '0' && p.ativo !== false,
        foto_url: fotos[0] || null,
        fotos_urls: fotos,
        gc_synced_at: syncedAt,
      };
    });

    const registrosServicos: GCProdutoRegistro[] = servicos.map((s: any) => ({
      gc_id: String(s.id),
      codigo: s.codigo || null,
      nome: s.nome,
      descricao: s.observacoes || null,
      categoria: 'Serviços',
      tipo: 'servico',
      preco_venda: parseFloat(s.valor_venda) || null,
      unidade: 'SV',
      estoque_atual: 0,
      ativo: true,
      foto_url: null,
      fotos_urls: [],
      gc_synced_at: syncedAt,
    }));

    const registros = [...registrosProdutos, ...registrosServicos];
    const { error } = await supabase
      .from('produtos_gc')
      .upsert(registros, { onConflict: 'gc_id', ignoreDuplicates: false });

    if (error) {
      console.error('Catalog upsert error:', error);
      erros++;
    } else {
      totalProdutos = registrosProdutos.length;
      totalServicos = registrosServicos.length;
    }

    paginasTotal = paginasProdutos + paginasServicos;
  } catch (e) {
    console.error('Sync error:', e);
    await supabase.from('gc_sync_log').insert({
      entidade: 'produtos',
      acao: 'sync_catalogo',
      status: 'erro',
      detalhes: { mensagem: e instanceof Error ? e.message : 'Erro desconhecido' }
    });
    erros++;
  }

  // --- Upsert price tables ---
  if (tabelasDescobertas.size > 0) {
    const tabelasRegistros = Array.from(tabelasDescobertas.entries()).map(([gcTipoId, nome]) => ({
      gc_tipo_id: gcTipoId,
      nome,
      principal: gcTipoId === TABELA_PRINCIPAL_GC_ID,
      ativa: true,
    }));

    const { error: tabelaError } = await supabase
      .from('tabelas_preco')
      .upsert(tabelasRegistros, { onConflict: 'gc_tipo_id', ignoreDuplicates: false });

    if (tabelaError) {
      console.error('Price table upsert error:', tabelaError);
      erros++;
    } else {
      console.log(`Upserted ${tabelasRegistros.length} price tables`);
    }
  }

  // --- Upsert prices per product ---
  if (allPriceEntries.length > 0) {
    // Get mapping: gc_id -> produto uuid
    const gcProdutoIds = [...new Set(allPriceEntries.map(e => e.gc_produto_id))];
    const produtoMap = new Map<string, string>();

    // Fetch in batches of 500
    for (let i = 0; i < gcProdutoIds.length; i += 500) {
      const batch = gcProdutoIds.slice(i, i + 500);
      const { data: produtos } = await supabase
        .from('produtos_gc')
        .select('id, gc_id')
        .in('gc_id', batch);
      if (produtos) {
        for (const p of produtos) {
          produtoMap.set(p.gc_id, p.id);
        }
      }
    }

    // Get mapping: gc_tipo_id -> tabela uuid
    const { data: tabelas } = await supabase.from('tabelas_preco').select('id, gc_tipo_id');
    const tabelaMap = new Map<string, string>();
    if (tabelas) {
      for (const t of tabelas) {
        tabelaMap.set(t.gc_tipo_id, t.id);
      }
    }

    // Build price records
    const precoRecords = allPriceEntries
      .map(e => {
        const produtoId = produtoMap.get(e.gc_produto_id);
        const tabelaId = tabelaMap.get(e.gc_tipo_id);
        if (!produtoId || !tabelaId) return null;
        return {
          produto_id: produtoId,
          tabela_preco_id: tabelaId,
          valor_custo: e.valor_custo,
          valor_venda: e.valor_venda,
          lucro_percentual: e.lucro_percentual,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    // Upsert in batches of 500
    for (let i = 0; i < precoRecords.length; i += 500) {
      const batch = precoRecords.slice(i, i + 500);
      const { error: precoError } = await supabase
        .from('precos_produto')
        .upsert(batch as any[], { onConflict: 'produto_id,tabela_preco_id', ignoreDuplicates: false });

      if (precoError) {
        console.error('Price upsert error batch', i, precoError);
        erros++;
      } else {
        totalPrecos += batch.length;
      }
    }
  }

  await supabase.from('gc_sync_log').insert({
    entidade: 'produtos',
    acao: 'sync_completo',
    status: erros === 0 ? 'sucesso' : 'parcial',
    detalhes: {
        total_produtos: totalProdutos,
        total_servicos: totalServicos,
        total_catalogo: totalProdutos + totalServicos,
      total_precos: totalPrecos,
      tabelas_preco: tabelasDescobertas.size,
      erros,
      paginas: paginasTotal,
    }
  });

  return new Response(JSON.stringify({
    sucesso: true,
    total_produtos: totalProdutos,
    total_servicos: totalServicos,
    total_catalogo: totalProdutos + totalServicos,
    total_precos: totalPrecos,
    tabelas_preco: tabelasDescobertas.size,
    erros,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
