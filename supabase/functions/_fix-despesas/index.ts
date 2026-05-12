// One-shot: corrige os 3 produtos já criados, separando custo puro + despesas acessórias.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GC_BASE_URL = 'https://api.gestaoclick.com';

Deno.serve(async (_req) => {
  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;
  const headers = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  // [gc_id, custo_puro, despesas_acessorias (5%)]
  const items = [
    { gc_id: '92713360', custo: 7583.10, desp: +(7583.10 * 0.05).toFixed(2) }, // SRM45
    { gc_id: '92713371', custo: 14011.20, desp: +(14011.20 * 0.05).toFixed(2) }, // SRM105
    { gc_id: '92713377', custo: 7200.00, desp: +(7200.00 * 0.05).toFixed(2) }, // JUMBO32
  ];

  const results: any[] = [];
  for (const it of items) {
    const payload = {
      valor_custo: it.custo,
      despesas_acessorias: it.desp,
    };
    const r = await fetch(`${GC_BASE_URL}/produtos/${it.gc_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    results.push({ gc_id: it.gc_id, status: r.status, resp: j });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
