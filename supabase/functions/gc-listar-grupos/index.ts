const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN');
    const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN');
    if (!ACCESS_TOKEN || !SECRET_TOKEN) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Credenciais GC ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const headers = {
      'access-token': ACCESS_TOKEN,
      'secret-access-token': SECRET_TOKEN,
      'Content-Type': 'application/json',
    };

    // Pagina todos os grupos
    const grupos: Array<{ id: string; nome: string }> = [];
    let pagina = 1;
    while (pagina < 50) {
      const resp = await fetch(`${GC_BASE_URL}/produtos/grupos?pagina=${pagina}`, { headers });
      if (!resp.ok) break;
      const data = await resp.json();
      const lista = Array.isArray(data?.data) ? data.data : [];
      lista.forEach((g: any) => grupos.push({ id: String(g.id), nome: String(g.nome ?? '') }));
      const totalPag = Number(data?.meta?.total_pages ?? data?.total_de_paginas ?? 1);
      if (pagina >= totalPag || lista.length === 0) break;
      pagina++;
    }

    // dedup + ordena
    const map = new Map<string, { id: string; nome: string }>();
    grupos.forEach((g) => map.set(g.id, g));
    const result = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return new Response(JSON.stringify({ sucesso: true, grupos: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ sucesso: false, erro: e instanceof Error ? e.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
