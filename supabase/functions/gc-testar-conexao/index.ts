import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({
      ok: false, mensagem: 'Credenciais não configuradas'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = `${GC_BASE_URL}/clientes?` + new URLSearchParams({
    loja_id: String(GC_LOJA_ID),
    limite: '1',
  });

  try {
    const response = await fetch(url, {
      headers: {
        'access-token': ACCESS_TOKEN,
        'secret-access-token': SECRET_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    if (response.status === 200) {
      return new Response(JSON.stringify({ ok: true, mensagem: 'Conexão com GestãoClick OK ✅' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 401) {
      return new Response(JSON.stringify({ ok: false, mensagem: 'Token inválido ou expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: false, mensagem: `Erro ${response.status}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, mensagem: 'Erro de conexão' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
