import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com/api';
const GC_LOJA_ID = '446246';
const BATCH_SIZE = 10;
const DELAY_MS = 350; // max 3 req/s

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  // Get all clients with gc_id
  const { data: clientes, error: dbError } = await supabase
    .from('clientes_gc')
    .select('id, gc_id, nome')
    .order('updated_at', { ascending: true });

  if (dbError || !clientes) {
    return new Response(JSON.stringify({ erro: 'Erro ao buscar clientes', detalhes: dbError?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Processando ${clientes.length} clientes...`);

  let atualizados = 0;
  let erros = 0;
  let semCompra = 0;

  // Helper: fetch ALL pages from a GC endpoint for a given client
  async function fetchAllGC(endpoint: string, clienteGcId: string): Promise<any[]> {
    const allRecords: any[] = [];
    let pagina = 1;
    const limite = 100; // max per page

    while (true) {
      const params = new URLSearchParams({
        loja_id: GC_LOJA_ID,
        cliente_id: clienteGcId,
        limite: String(limite),
        pagina: String(pagina),
      });

      try {
        const res = await fetch(`${GC_BASE_URL}/${endpoint}?${params}`, { headers: gcHeaders });
        if (!res.ok) {
          console.error(`${endpoint} HTTP ${res.status} for client ${clienteGcId}`);
          break;
        }
        const body = await res.json();
        const records = body?.data || [];
        
        if (!Array.isArray(records) || records.length === 0) break;
        
        allRecords.push(...records);
        
        // Check if there are more pages
        const meta = body?.meta;
        if (!meta?.proxima_pagina || records.length < limite) break;
        
        pagina++;
        await new Promise(r => setTimeout(r, DELAY_MS));
      } catch (e) {
        console.error(`Erro ${endpoint} client ${clienteGcId}:`, e);
        break;
      }
    }
    return allRecords;
  }

  // Process clients in batches
  for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
    const batch = clientes.slice(i, i + BATCH_SIZE);

    for (const cliente of batch) {
      try {
        // 1. Fetch ALL vendas for this client
        const vendas = await fetchAllGC('vendas', cliente.gc_id);
        await new Promise(r => setTimeout(r, DELAY_MS));

        // 2. Fetch ALL ordens de serviço for this client
        const ordens = await fetchAllGC('ordens_servicos', cliente.gc_id);
        await new Promise(r => setTimeout(r, DELAY_MS));

        // 3. Calculate totals
        // Vendas: field "data" is the date, "valor_total" is the value
        let totalVendas = 0;
        let ultimaDataVenda: string | null = null;
        for (const v of vendas) {
          totalVendas += parseFloat(v.valor_total || '0') || 0;
          const dataV = v.data || null;
          if (dataV && (!ultimaDataVenda || dataV > ultimaDataVenda)) {
            ultimaDataVenda = dataV;
          }
        }

        // OS: field "data" is the date, "valor_total" is the value
        let totalOS = 0;
        let ultimaDataOS: string | null = null;
        for (const o of ordens) {
          totalOS += parseFloat(o.valor_total || '0') || 0;
          const dataO = o.data || null;
          if (dataO && (!ultimaDataOS || dataO > ultimaDataOS)) {
            ultimaDataOS = dataO;
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

        if (ultimaCompra || totalCompras > 0) {
          const updateData: Record<string, any> = {
            total_compras_gc: totalCompras,
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
            console.log(`✅ ${cliente.nome}: R$ ${totalCompras.toFixed(2)} (${vendas.length} vendas, ${ordens.length} OS) última: ${ultimaCompra}`);
          }
        } else {
          semCompra++;
        }
      } catch (e) {
        console.error(`Erro cliente ${cliente.gc_id} (${cliente.nome}):`, e);
        erros++;
      }
    }

    // Log progress
    console.log(`Progresso: ${Math.min(i + BATCH_SIZE, clientes.length)}/${clientes.length} (${atualizados} atualizados, ${erros} erros)`);
  }

  const result = {
    sucesso: true,
    total_clientes: clientes.length,
    atualizados,
    sem_compra: semCompra,
    erros,
  };

  console.log('Resultado final:', JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
