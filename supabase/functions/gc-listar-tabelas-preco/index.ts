const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
    const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

    if (!ACCESS_TOKEN || !SECRET_TOKEN) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Credenciais GC não configuradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gcHeaders = {
      'access-token': ACCESS_TOKEN,
      'secret-access-token': SECRET_TOKEN,
      'Content-Type': 'application/json',
    };

    // Fetch a sample product to discover price tables
    const url = `${GC_BASE_URL}/produtos?loja_id=${GC_LOJA_ID}&limite=5&pagina=1`;
    const response = await fetch(url, { headers: gcHeaders });
    
    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ sucesso: false, erro: `GC API error ${response.status}`, body: text }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await response.json();
    const produtos = body?.data || [];

    // Extract unique price tables from all products
    const tabelasMap = new Map<string, string>();
    for (const p of produtos) {
      if (Array.isArray(p.valores)) {
        for (const v of p.valores) {
          if (v.tipo_id && v.nome_tipo) {
            tabelasMap.set(String(v.tipo_id), v.nome_tipo);
          }
        }
      }
    }

    const tabelas = Array.from(tabelasMap.entries()).map(([id, nome]) => ({ gc_tipo_id: id, nome }));

    return new Response(
      JSON.stringify({
        sucesso: true,
        tabelas_preco: tabelas,
        sample_produtos: produtos.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          valor_venda: p.valor_venda,
          valores: p.valores,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
