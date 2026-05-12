const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const H = {
    'access-token': Deno.env.get('GC_ACCESS_TOKEN')!,
    'secret-access-token': Deno.env.get('GC_SECRET_ACCESS_TOKEN')!,
  };
  const out: any[] = [];
  for (const url of [
    'https://api.gestaoclick.com/produtos/grupos',
    'https://api.gestaoclick.com/grupos_produtos',
    'https://api.gestaoclick.com/grupos-produto',
    'https://api.gestaoclick.com/grupos',
    'https://api.gestaoclick.com/produtos_grupos',
    'https://api.gestaoclick.com/grupo_produtos',
    'https://api.gestaoclick.com/categorias',
    'https://api.gestaoclick.com/categorias_produtos',
  ]) {
    try {
      const r = await fetch(url, { headers: H });
      const t = await r.text();
      out.push({ url, status: r.status, sample: t.slice(0, 300) });
    } catch (e) {
      out.push({ url, err: String(e) });
    }
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
