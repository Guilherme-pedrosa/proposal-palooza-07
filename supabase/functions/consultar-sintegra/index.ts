import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { cnpj, uf } = await req.json();
    const cnpjClean = String(cnpj || '').replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('SINTEGRAPI_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'SINTEGRAPI_TOKEN não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(`https://api.sintegrapi.com.br/consultas/v2/sintegra/${cnpjClean}`);
    if (uf) url.searchParams.set('uf', String(uf).toUpperCase());

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'x-api-key': token, 'cache': '25' },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.message || `Erro SintegraPI (${resp.status})`, raw: data }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inscricoes: any[] = Array.isArray(data?.inscricoes_estaduais) ? data.inscricoes_estaduais : [];
    const ufAlvo = (uf || data?.uf || '').toString().toUpperCase();

    // Prefere IE ativa da UF alvo; depois qualquer ativa; depois a primeira
    const escolhida =
      inscricoes.find((i) => i.uf?.toUpperCase() === ufAlvo && i.ativa) ||
      inscricoes.find((i) => i.ativa) ||
      inscricoes[0] ||
      null;

    return new Response(JSON.stringify({
      cnpj: data?.cnpj,
      razao_social: data?.razao_social,
      uf: data?.uf,
      inscricao_estadual: escolhida?.inscricao_estadual ?? null,
      ie_uf: escolhida?.uf ?? null,
      ie_ativa: escolhida?.ativa ?? null,
      tipo_ie: escolhida?.tipo_ie ?? null,
      situacao_pj: escolhida?.situacao_pj ?? null,
      inscricoes_estaduais: inscricoes,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Erro inesperado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
