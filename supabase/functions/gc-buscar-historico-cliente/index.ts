import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const GC_RATE_LIMIT_DELAY_MS = 350;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { gc_cliente_id } = await req.json();

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  const params = new URLSearchParams({
    loja_id: String(GC_LOJA_ID),
    cliente_id: String(gc_cliente_id),
    limite: '20',
  });

  const fetchSafe = async (endpoint: string, delayMs = 0) => {
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    try {
      const res = await fetch(`${GC_BASE_URL}/${endpoint}?${params}`, { headers: gcHeaders });
      if (!res.ok) return [];
      const body = await res.json();
      return body?.data || [];
    } catch {
      return [];
    }
  };

  const [orcamentos, vendas, recebimentos, ordens_servicos] = await Promise.all([
    fetchSafe('orcamentos'),
    fetchSafe('vendas', GC_RATE_LIMIT_DELAY_MS),
    fetchSafe('movimentacoes_financeiras', GC_RATE_LIMIT_DELAY_MS * 2),
    fetchSafe('ordens_servicos', GC_RATE_LIMIT_DELAY_MS * 3),
  ]);

  return new Response(JSON.stringify({
    orcamentos, vendas, recebimentos, ordens_servicos,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
