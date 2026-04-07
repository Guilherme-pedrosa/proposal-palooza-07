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

  // Fetch a specific product to see all fields including photos
  const productId = '87576026'; // CL50 E ULTRA from user screenshot
  const url = `${GC_BASE_URL}/produtos/${productId}?loja_id=446246`;

  const response = await fetch(url, { headers: gcHeaders });
  const body = await response.json();

  // Return all keys and the full response
  const product = body?.data || body;
  const keys = product ? Object.keys(product) : [];

  return new Response(JSON.stringify({
    keys,
    has_foto: 'foto' in (product || {}),
    has_imagem: 'imagem' in (product || {}),
    has_url_foto: 'url_foto' in (product || {}),
    has_foto_url: 'foto_url' in (product || {}),
    has_fotos: 'fotos' in (product || {}),
    has_imagens: 'imagens' in (product || {}),
    has_anexos: 'anexos' in (product || {}),
    full_response: product,
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
