import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
Deno.serve(async () => {
  const headers = {
    'access-token': Deno.env.get('GC_ACCESS_TOKEN')!,
    'secret-access-token': Deno.env.get('GC_SECRET_ACCESS_TOKEN')!,
    'Content-Type': 'application/json',
  };
  const tries = [
    { valor_despesas_acessorias: 379.16 },
    { despesas_acessorias: 379.16 },
    { valor_outras_despesas: 379.16 },
    { outras_despesas: 379.16 },
    { despesa_acessoria: 379.16 },
    { valor_despesa_acessoria: 379.16 },
  ];
  const out: any[] = [];
  for (const t of tries) {
    const body = { nome: 'MÁQUINA DE GELO MACOM SRM 45 - EM CUBOS', valor_custo: 7583.10, ...t };
    const r = await fetch('https://api.gestaoclick.com/produtos/92713360', { method: 'PUT', headers, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    // GET back
    const g = await fetch('https://api.gestaoclick.com/produtos/92713360', { headers });
    const gj = await g.json().catch(() => ({}));
    out.push({ try: Object.keys(t)[0], status: r.status, msg: j?.data, get_keys: Object.keys(gj?.data ?? {}).filter(k => k.includes('desp') || k.includes('outr')), get_extras: Object.fromEntries(Object.entries(gj?.data ?? {}).filter(([k]) => k.includes('desp') || k.includes('outr'))) });
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
