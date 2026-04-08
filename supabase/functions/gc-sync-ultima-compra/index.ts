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

  let limit = 50;
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

  // Fetch ALL pages from a GC endpoint
  async function fetchAllGC(endpoint: string, params: Record<string, string>): Promise<any[]> {
    const allRecords: any[] = [];
    let pagina = 1;

    while (true) {
      const searchParams = new URLSearchParams({
        loja_id: GC_LOJA_ID,
        limite: '100',
        pagina: String(pagina),
        ...params,
      });

      try {
        const res = await fetch(`${GC_BASE_URL}/${endpoint}?${searchParams}`, { headers: gcHeaders });
        if (!res.ok) {
          console.error(`${endpoint} HTTP ${res.status}`);
          break;
        }
        const body = await res.json();
        const records = body?.data || [];
        if (!Array.isArray(records) || records.length === 0) break;
        allRecords.push(...records);
        if (!body?.meta?.proxima_pagina || records.length < 100) break;
        pagina++;
        await new Promise(r => setTimeout(r, DELAY_MS));
      } catch (e) {
        console.error(`Erro ${endpoint}:`, e);
        break;
      }
    }
    return allRecords;
  }

  // Situações que NÃO contam como transação realizada
  const SITUACOES_IGNORAR = new Set([
    'cancelado', 'cancelada', 'reprovado', 'reprovada',
  ]);

  function processarTransacoes(records: any[]) {
    let total = 0;
    let ultimaData: string | null = null;
    for (const r of records) {
      const sit = String(r.situacao || r.nome_situacao || '').toLowerCase();
      if (SITUACOES_IGNORAR.has(sit)) continue;
      total += parseFloat(r.valor_total || '0') || 0;
      const d = r.data || null;
      if (d && (!ultimaData || d > ultimaData)) ultimaData = d;
    }
    return { total, ultimaData };
  }

  for (const cliente of clientes) {
    try {
      // 1) Buscar vendas, OS e orçamentos para calcular total_compras e ultima_compra
      const vendas = await fetchAllGC('vendas', {
        cliente_id: cliente.gc_id,
        ordenacao: 'data',
        direcao: 'desc',
      });
      await new Promise(r => setTimeout(r, DELAY_MS));

      const ordens = await fetchAllGC('ordens_servicos', {
        cliente_id: cliente.gc_id,
        ordenacao: 'data',
        direcao: 'desc',
      });
      await new Promise(r => setTimeout(r, DELAY_MS));

      const orcamentos = await fetchAllGC('orcamentos', {
        cliente_id: cliente.gc_id,
        ordenacao: 'data',
        direcao: 'desc',
      });
      await new Promise(r => setTimeout(r, DELAY_MS));

      const resVendas = processarTransacoes(vendas);
      const resOS = processarTransacoes(ordens);
      const resOrc = processarTransacoes(orcamentos);

      const totalCompras = resVendas.total + resOS.total + resOrc.total;
      const datas = [resVendas.ultimaData, resOS.ultimaData, resOrc.ultimaData].filter(Boolean) as string[];
      const ultimaCompra = datas.length > 0 ? datas.sort().pop()! : null;

      // 2) Buscar recebimentos em atraso diretamente do módulo financeiro
      const recebimentosAtrasados = await fetchAllGC('recebimentos', {
        cliente_id: cliente.gc_id,
        liquidado: 'at', // "at" = em atraso
      });
      await new Promise(r => setTimeout(r, DELAY_MS));

      const financeiroAtrasado = recebimentosAtrasados.length > 0;
      let valorAtrasado = 0;
      for (const r of recebimentosAtrasados) {
        valorAtrasado += parseFloat(r.valor_total || r.valor || '0') || 0;
      }

      if (ultimaCompra || totalCompras > 0 || financeiroAtrasado) {
        const updateData: Record<string, any> = {
          total_compras_gc: totalCompras,
          financeiro_atrasado: financeiroAtrasado,
          valor_atrasado_gc: valorAtrasado,
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
          const flag = financeiroAtrasado ? ` ⚠️ ATRASADO R$${valorAtrasado.toFixed(2)}` : '';
          console.log(`✅ ${cliente.nome}: R$ ${totalCompras.toFixed(2)} (${vendas.length}V, ${ordens.length}OS, ${orcamentos.length}Orç) última: ${ultimaCompra}${flag}`);
        }
      } else {
        await supabase.from('clientes_gc').update({
          financeiro_atrasado: false,
          valor_atrasado_gc: 0,
        }).eq('id', cliente.id);
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
