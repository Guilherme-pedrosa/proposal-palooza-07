const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  // Fetch from LIST endpoint (not detail) to see if fotos come back
  const url = `${GC_BASE_URL}/produtos?loja_id=446246&limite=2&pagina=1&nome=CL50`;

  const response = await fetch(url, { headers: gcHeaders });
  const body = await response.json();

  const products = body?.data || [];
  const firstProduct = products[0] || {};
  const keys = Object.keys(firstProduct);

  return new Response(JSON.stringify({
    keys,
    has_fotos: 'fotos' in firstProduct,
    fotos_value: firstProduct.fotos,
    first_product_name: firstProduct.nome,
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
