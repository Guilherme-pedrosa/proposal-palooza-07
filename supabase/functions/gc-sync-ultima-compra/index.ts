import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GC_BASE_URL = 'https://api.gestaoclick.com/api';
const GC_LOJA_ID = '446246';
const DELAY_MS = 350;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Accept limit/offset from body for chunked processing
  let limit = 50; // default: process 50 clients per call
  let offset = 0;
  try {
    const body = await req.json();
    if (body?.limit) limit = Math.min(Number(body.limit), 100);
    if (body?.offset) offset = Number(body.offset);
  } catch {}

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  // Get clients in chunks using offset/limit
  const { data: clientes, error: dbError, count } = await supabase
    .from('clientes_gc')
    .select('id, gc_id, nome', { count: 'exact' })
    .order('updated_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (dbError || !clientes) {
    return new Response(JSON.stringify({ erro: 'Erro ao buscar clientes', detalhes: dbError?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Processando ${clientes.length} clientes (offset ${offset}, total ${count})...`);

  let atualizados = 0;
  let erros = 0;
  let semCompra = 0;

  // Fetch ONE page from GC (up to 100 records, sorted by date desc to get most recent first)
  async function fetchGCPage(endpoint: string, clienteGcId: string, pagina = 1): Promise<{ records: any[]; hasMore: boolean }> {
    const params = new URLSearchParams({
      loja_id: GC_LOJA_ID,
      cliente_id: clienteGcId,
      limite: '100',
      pagina: String(pagina),
      ordenacao: 'data',
      direcao: 'desc',
    });

    try {
      const res = await fetch(`${GC_BASE_URL}/${endpoint}?${params}`, { headers: gcHeaders });
      if (!res.ok) {
        console.error(`${endpoint} HTTP ${res.status} for client ${clienteGcId}`);
        return { records: [], hasMore: false };
      }
      const body = await res.json();
      const records = body?.data || [];
      if (!Array.isArray(records)) return { records: [], hasMore: false };
      
      const meta = body?.meta;
      const hasMore = !!(meta?.proxima_pagina) && records.length >= 100;
      return { records, hasMore };
    } catch (e) {
      console.error(`Erro ${endpoint} client ${clienteGcId}:`, e);
      return { records: [], hasMore: false };
    }
  }

  // Fetch ALL pages for total calculation
  async function fetchAllGC(endpoint: string, clienteGcId: string): Promise<any[]> {
    const allRecords: any[] = [];
    let pagina = 1;

    while (true) {
      const { records, hasMore } = await fetchGCPage(endpoint, clienteGcId, pagina);
      allRecords.push(...records);
      if (!hasMore || records.length === 0) break;
      pagina++;
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
    return allRecords;
  }

  for (const cliente of clientes) {
    try {
      // Fetch ALL vendas
      const vendas = await fetchAllGC('vendas', cliente.gc_id);
      await new Promise(r => setTimeout(r, DELAY_MS));

      // Fetch ALL ordens de serviço
      const ordens = await fetchAllGC('ordens_servicos', cliente.gc_id);
      await new Promise(r => setTimeout(r, DELAY_MS));

      // Situações que efetivamente geram financeiro (excluem orçamento, pedido, etc.)
      const situacoesComFinanceiro = new Set([
        'aprovado', 'aprovada', 'faturado', 'faturada',
        'concluido', 'concluída', 'concluida',
        'entregue', 'finalizado', 'finalizada',
      ]);

      // Calculate totals from vendas
      let totalVendas = 0;
      let ultimaDataVenda: string | null = null;
      let financeiroAtrasado = false;
      const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      for (const v of vendas) {
        const situacao = String(v.situacao || '').toLowerCase();
        if (situacao === 'cancelado' || situacao === 'cancelada') continue;

        totalVendas += parseFloat(v.valor_total || '0') || 0;
        const d = v.data || null;
        if (d && (!ultimaDataVenda || d > ultimaDataVenda)) {
          ultimaDataVenda = d;
        }
        // Só checa financeiro se a situação gera financeiro E financeiro não está quitado
        if (situacoesComFinanceiro.has(situacao) &&
            (v.situacao_financeiro === '0' || v.situacao_financeiro === 0)) {
          const pagamentos = v.pagamentos || [];
          for (const p of pagamentos) {
            const pg = p.pagamento || p;
            if (pg.data_vencimento && pg.data_vencimento < hoje) {
              financeiroAtrasado = true;
            }
          }
        }
      }

      // Check OS financeiro too — mesma lógica
      for (const o of ordens) {
        const situacaoOS = String(o.situacao || '').toLowerCase();
        if (situacaoOS === 'cancelado' || situacaoOS === 'cancelada') continue;

        if (situacoesComFinanceiro.has(situacaoOS) &&
            (o.situacao_financeiro === '0' || o.situacao_financeiro === 0)) {
          const pagamentos = o.pagamentos || [];
          for (const p of pagamentos) {
            const pg = p.pagamento || p;
            if (pg.data_vencimento && pg.data_vencimento < hoje) {
              financeiroAtrasado = true;
            }
          }
        }
      }

      // Calculate totals from OS
      let totalOS = 0;
      let ultimaDataOS: string | null = null;
      for (const o of ordens) {
        const situacaoOS2 = String(o.situacao || '').toLowerCase();
        if (situacaoOS2 === 'cancelado' || situacaoOS2 === 'cancelada') continue;

        totalOS += parseFloat(o.valor_total || '0') || 0;
        const d = o.data || null;
        if (d && (!ultimaDataOS || d > ultimaDataOS)) {
          ultimaDataOS = d;
        }
      }

      const totalCompras = totalVendas + totalOS;

      // Most recent date between vendas and OS
      let ultimaCompra: string | null = null;
      if (ultimaDataVenda && ultimaDataOS) {
        ultimaCompra = ultimaDataVenda > ultimaDataOS ? ultimaDataVenda : ultimaDataOS;
      } else {
        ultimaCompra = ultimaDataVenda || ultimaDataOS;
      }

      if (ultimaCompra || totalCompras > 0 || financeiroAtrasado) {
        const updateData: Record<string, any> = {
          total_compras_gc: totalCompras,
          financeiro_atrasado: financeiroAtrasado,
        };
        if (ultimaCompra) {
          updateData.ultima_compra_gc = ultimaCompra;
        }

        const { error: updateErr } = await supabase
          .from('clientes_gc')
          .update(updateData)
          .eq('id', cliente.id);

        if (updateErr) {
          console.error(`Erro update ${cliente.nome}:`, updateErr.message);
          erros++;
        } else {
          atualizados++;
          const flag = financeiroAtrasado ? ' ⚠️ ATRASADO' : '';
          console.log(`✅ ${cliente.nome}: R$ ${totalCompras.toFixed(2)} (${vendas.length}V, ${ordens.length}OS) última: ${ultimaCompra}${flag}`);
        }
      } else {
        // Reset flag if no overdue
        await supabase.from('clientes_gc').update({ financeiro_atrasado: false }).eq('id', cliente.id);
        semCompra++;
      }
    } catch (e) {
      console.error(`Erro cliente ${cliente.gc_id} (${cliente.nome}):`, e);
      erros++;
    }
  }

  const result = {
    sucesso: true,
    total_clientes: count,
    processados: clientes.length,
    offset,
    proximo_offset: offset + clientes.length,
    tem_mais: (offset + clientes.length) < (count || 0),
    atualizados,
    sem_compra: semCompra,
    erros,
  };

  console.log('Resultado:', JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
