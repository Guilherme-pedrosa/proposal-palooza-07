import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const BATCH_SIZE = 20;
const DELAY_MS = 400; // rate limit safety

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

  let atualizados = 0;
  let erros = 0;
  let semCompra = 0;

  // Process in batches
  for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
    const batch = clientes.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (cliente, idx) => {
        // Stagger requests within batch
        await new Promise(r => setTimeout(r, idx * DELAY_MS));

        const params = new URLSearchParams({
          loja_id: String(GC_LOJA_ID),
          cliente_id: String(cliente.gc_id),
          limite: '5',
          ordenar_por: 'data_venda',
          ordem: 'desc',
        });

        try {
          // Try vendas first (most reliable for "última compra")
          const vendasRes = await fetch(`${GC_BASE_URL}/vendas?${params}`, { headers: gcHeaders });
          let ultimaData: string | null = null;
          let totalCompras = 0;

          if (vendasRes.ok) {
            const vendasBody = await vendasRes.json();
            const vendas = vendasBody?.data || [];
            if (vendas.length > 0) {
              // Find most recent sale date
              ultimaData = vendas[0]?.data_venda || vendas[0]?.created_at || null;
              // Sum total
              totalCompras = vendas.reduce((sum: number, v: any) => {
                return sum + (parseFloat(v.valor_total) || 0);
              }, 0);
            }
          }

          // Also check orçamentos if no vendas
          if (!ultimaData) {
            await new Promise(r => setTimeout(r, DELAY_MS));
            const orcParams = new URLSearchParams({
              loja_id: String(GC_LOJA_ID),
              cliente_id: String(cliente.gc_id),
              limite: '5',
              ordenar_por: 'data_orcamento',
              ordem: 'desc',
            });
            const orcRes = await fetch(`${GC_BASE_URL}/orcamentos?${orcParams}`, { headers: gcHeaders });
            if (orcRes.ok) {
              const orcBody = await orcRes.json();
              const orcs = orcBody?.data || [];
              if (orcs.length > 0) {
                ultimaData = orcs[0]?.data_orcamento || orcs[0]?.created_at || null;
                totalCompras = orcs.reduce((sum: number, o: any) => {
                  return sum + (parseFloat(o.valor_total) || 0);
                }, 0);
              }
            }
          }

          if (ultimaData) {
            await supabase
              .from('clientes_gc')
              .update({
                ultima_compra_gc: ultimaData,
                total_compras_gc: totalCompras,
              })
              .eq('id', cliente.id);
            atualizados++;
          } else {
            semCompra++;
          }
        } catch (e) {
          console.error(`Erro cliente ${cliente.gc_id}:`, e);
          erros++;
        }
      })
    );

    // Wait between batches
    if (i + BATCH_SIZE < clientes.length) {
      await new Promise(r => setTimeout(r, BATCH_SIZE * DELAY_MS));
    }
  }

  return new Response(
    JSON.stringify({
      sucesso: true,
      total_clientes: clientes.length,
      atualizados,
      sem_compra: semCompra,
      erros,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});