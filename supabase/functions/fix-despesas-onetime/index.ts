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
    { gc_id: '92713360', nome: 'MÁQUINA DE GELO MACOM SRM 45 - EM CUBOS', custo: 7583.10, desp: 379.16 },
    { gc_id: '92713371', nome: 'MÁQUINA DE GELO MACOM SRM 105 - EM CUBOS', custo: 14011.20, desp: 700.56 },
    { gc_id: '92713377', nome: 'SELADORA A VÁCUO SELOVAC JUMBO 32S', custo: 7200.00, desp: 360.00 },
  ];

  const results: any[] = [];
  for (const it of items) {
    const payload = {
      nome: it.nome,
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
