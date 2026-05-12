import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
Deno.serve(async () => {
  const r = await fetch('https://api.gestaoclick.com/produtos/92713360', {
    headers: {
      'access-token': Deno.env.get('GC_ACCESS_TOKEN')!,
      'secret-access-token': Deno.env.get('GC_SECRET_ACCESS_TOKEN')!,
    },
  });
  const j = await r.json();
  return new Response(JSON.stringify(j, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
